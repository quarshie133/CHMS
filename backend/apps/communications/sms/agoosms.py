"""
AgooSMS HTTP client.

Provider facts confirmed from the public API index (GET https://api.agoosms.com):
    POST /v1/sms/send          single message   {"to", "message", "senderId"}
    POST /v1/sms/send-bulk     bulk message     {"recipients": [...], "message", "senderId"}
    GET  /v1/sms/:id/status    delivery status
    GET  /v1/balance           account balance
Authentication: X-API-Key header.

Response bodies, bulk limits, error formats and idempotency support are NOT
publicly documented, so parsing here is deliberately tolerant and every
outcome is classified conservatively:

    accepted   provider confirmed it took the message(s)       -> safe to record as sent
    rejected   provider refused (validation, auth, balance)   -> definitely not sent
    retryable  we know the request never reached / was refused before processing
               (connect timeout, DNS failure, HTTP 429)       -> safe to retry later
    ambiguous  the provider may or may not have sent it (read timeout, 5xx,
               unreadable 2xx body)                            -> never auto-retried; flag for review
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

import requests

logger = logging.getLogger(__name__)

ACCEPTED = "accepted"
REJECTED = "rejected"
RETRYABLE = "retryable"
AMBIGUOUS = "ambiguous"

_SENSITIVE_KEY = re.compile(r"key|token|secret|auth|password", re.I)
_PHONE_KEYS = ("to", "recipient", "phone", "msisdn", "number", "destination", "mobile")
_ID_KEYS = ("id", "messageId", "message_id", "smsId", "sms_id", "reference", "ref", "uuid")
_BATCH_KEYS = ("batchId", "batch_id", "bulkId", "bulk_id", "campaignId", "campaign_id")
_FAILED_WORDS = {"failed", "rejected", "error", "invalid", "undelivered", "blocked"}


@dataclass
class RecipientOutcome:
    accepted: bool
    message_id: str = ""
    error: str = ""


@dataclass
class ProviderResult:
    outcome: str
    http_status: int | None = None
    error_code: str = ""
    error_message: str = ""
    retry_after: int | None = None
    batch_id: str = ""
    # Per-recipient detail when the provider returns it, keyed by E.164 number.
    recipients: dict[str, RecipientOutcome] = field(default_factory=dict)
    # Single message id (for /send or when bulk returns one id).
    message_id: str = ""
    # Sanitised, truncated response body safe to store.
    response_summary: str = ""
    simulated: bool = False

    @property
    def ok(self) -> bool:
        return self.outcome == ACCEPTED


def _sanitize(obj: Any, depth: int = 0) -> Any:
    if depth > 4:
        return "…"
    if isinstance(obj, dict):
        return {k: ("[redacted]" if _SENSITIVE_KEY.search(str(k)) else _sanitize(v, depth + 1)) for k, v in list(obj.items())[:50]}
    if isinstance(obj, list):
        return [_sanitize(v, depth + 1) for v in obj[:50]]
    if isinstance(obj, str):
        return obj[:300]
    return obj


def summarize(body: Any) -> str:
    try:
        return json.dumps(_sanitize(body), default=str)[:2000]
    except (TypeError, ValueError):
        return ""


def _first(d: dict, keys) -> str:
    for k in keys:
        v = d.get(k)
        if v not in (None, ""):
            return str(v)
    return ""


def _error_text(body: Any, fallback: str) -> str:
    if isinstance(body, dict):
        for key in ("message", "error", "detail", "errors"):
            v = body.get(key)
            if isinstance(v, str) and v.strip():
                return v.strip()[:300]
            if isinstance(v, dict):
                inner = _first(v, ("message", "detail", "description"))
                if inner:
                    return inner[:300]
            if isinstance(v, list) and v:
                first = v[0]
                if isinstance(first, str):
                    return first[:300]
                if isinstance(first, dict):
                    inner = _first(first, ("message", "detail", "msg"))
                    if inner:
                        return inner[:300]
    return fallback


def _body_signals_failure(body: Any) -> bool:
    if not isinstance(body, dict):
        return False
    if body.get("success") is False or body.get("ok") is False:
        return True
    status = str(body.get("status", "")).lower()
    return status in _FAILED_WORDS


def _connection_never_established(exc: requests.exceptions.ConnectionError) -> bool:
    """True when the request certainly never reached the provider (DNS, refused, connect timeout)."""
    if isinstance(exc, requests.exceptions.ConnectTimeout):
        return True
    text = repr(exc)
    markers = ("NewConnectionError", "NameResolutionError", "Failed to resolve", "getaddrinfo failed",
               "Connection refused", "ConnectionRefusedError", "No route to host")
    return any(m in text for m in markers)


def parse_recipient_outcomes(body: Any, recipients: list[str]) -> tuple[dict[str, RecipientOutcome], str, str]:
    """
    Extract per-recipient ids/statuses, a batch id and a single message id from
    a successful response, tolerating several common response shapes.
    """
    data = body.get("data", body) if isinstance(body, dict) else body
    outcomes: dict[str, RecipientOutcome] = {}
    batch_id = ""
    single_id = ""

    items = None
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        batch_id = _first(data, _BATCH_KEYS) or (_first(body, _BATCH_KEYS) if isinstance(body, dict) else "")
        single_id = _first(data, _ID_KEYS)
        for key in ("messages", "results", "recipients", "items", "data"):
            if isinstance(data.get(key), list):
                items = data[key]
                break

    if items:
        from .phone import try_normalize_ghana_phone

        for item in items:
            if not isinstance(item, dict):
                continue
            raw_phone = _first(item, _PHONE_KEYS)
            phone = try_normalize_ghana_phone(raw_phone) if raw_phone else None
            if not phone or phone not in recipients:
                continue
            status = str(item.get("status", "")).lower()
            failed = status in _FAILED_WORDS or item.get("success") is False
            outcomes[phone] = RecipientOutcome(
                accepted=not failed,
                message_id=_first(item, _ID_KEYS),
                error=_error_text(item, "Rejected by provider") if failed else "",
            )
    return outcomes, batch_id, single_id


class AgooSMSClient:
    def __init__(self, api_key: str, base_url: str = "https://api.agoosms.com", timeout: float = 30, session=None):
        if not api_key:
            from .config import SmsNotConfigured

            raise SmsNotConfigured("AgooSMS API key is not configured.")
        self._api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._http = session or requests

    def __repr__(self):  # never leak the key in tracebacks/logs
        return f"<AgooSMSClient base_url={self.base_url!r}>"

    # ── public API ──────────────────────────────────────────────────────
    def send(self, to: str, message: str, sender_id: str) -> ProviderResult:
        result = self._request("POST", "/v1/sms/send", {"to": to, "message": message, "senderId": sender_id})
        if result.ok:
            if to in result.recipients and not result.recipients[to].accepted:
                result.outcome = REJECTED
                result.error_code = "provider_rejected"
                result.error_message = result.recipients[to].error
            else:
                mid = result.message_id or (result.recipients.get(to).message_id if to in result.recipients else "")
                result.recipients[to] = RecipientOutcome(accepted=True, message_id=mid)
        return result

    def send_bulk(self, recipients: list[str], message: str, sender_id: str) -> ProviderResult:
        result = self._request(
            "POST", "/v1/sms/send-bulk", {"recipients": recipients, "message": message, "senderId": sender_id}, recipients
        )
        if result.ok:
            # Recipients the provider didn't itemise are covered by the accepted request as a whole.
            for phone in recipients:
                result.recipients.setdefault(phone, RecipientOutcome(accepted=True, message_id=""))
        return result

    def get_status(self, message_id: str) -> ProviderResult:
        return self._request("GET", f"/v1/sms/{message_id}/status")

    def get_balance(self) -> ProviderResult:
        return self._request("GET", "/v1/balance")

    # ── transport ───────────────────────────────────────────────────────
    def _request(self, method: str, path: str, payload: dict | None = None, recipients: list[str] | None = None) -> ProviderResult:
        url = f"{self.base_url}{path}"
        headers = {"X-API-Key": self._api_key, "Content-Type": "application/json", "Accept": "application/json"}
        try:
            if method == "GET":
                resp = self._http.get(url, headers=headers, timeout=self.timeout)
            else:
                resp = self._http.post(url, headers=headers, json=payload, timeout=self.timeout)
        except requests.exceptions.ConnectTimeout:
            logger.warning("AgooSMS %s %s: connect timeout", method, path)
            return ProviderResult(RETRYABLE, error_code="network", error_message="Could not connect to the SMS provider (timeout).")
        except requests.exceptions.Timeout:
            logger.warning("AgooSMS %s %s: read timeout — outcome unknown", method, path)
            return ProviderResult(AMBIGUOUS, error_code="timeout",
                                  error_message="The SMS provider did not respond in time. Messages may or may not have been sent.")
        except requests.exceptions.ConnectionError as exc:
            if _connection_never_established(exc):
                logger.warning("AgooSMS %s %s: connection not established", method, path)
                return ProviderResult(RETRYABLE, error_code="network", error_message="Could not reach the SMS provider.")
            logger.warning("AgooSMS %s %s: connection dropped — outcome unknown", method, path)
            return ProviderResult(AMBIGUOUS, error_code="network",
                                  error_message="The connection to the SMS provider was interrupted. Messages may or may not have been sent.")
        except requests.exceptions.RequestException as exc:
            logger.warning("AgooSMS %s %s: request error %s", method, path, type(exc).__name__)
            return ProviderResult(AMBIGUOUS, error_code="network", error_message="Unexpected error talking to the SMS provider.")

        status = resp.status_code
        try:
            body = resp.json()
            parsed = True
        except ValueError:
            body, parsed = None, False
        summary = summarize(body) if parsed else (resp.text or "")[:300]
        # Belt and braces: never store the key even if the provider echoes it back.
        summary = summary.replace(self._api_key, "[redacted]")
        if parsed:
            body = json.loads(json.dumps(body, default=str).replace(self._api_key, "[redacted]"))
        logger.info("AgooSMS %s %s -> HTTP %s", method, path, status)

        if 200 <= status < 300:
            if not parsed:
                return ProviderResult(AMBIGUOUS, status, "invalid_response",
                                      "The SMS provider returned an unreadable response. Messages may have been sent.",
                                      response_summary=summary)
            if _body_signals_failure(body):
                return ProviderResult(REJECTED, status, "provider_rejected", _error_text(body, "Rejected by the SMS provider."),
                                      response_summary=summary)
            outcomes, batch_id, single_id = parse_recipient_outcomes(body, recipients or ([payload["to"]] if payload and "to" in payload else []))
            return ProviderResult(ACCEPTED, status, recipients=outcomes, batch_id=batch_id, message_id=single_id, response_summary=summary)

        message = _error_text(body, f"SMS provider returned HTTP {status}.")
        if status in (401, 403):
            return ProviderResult(REJECTED, status, "auth", "The SMS provider rejected our credentials or sender ID permissions.",
                                  response_summary=summary)
        if status == 402:
            return ProviderResult(REJECTED, status, "insufficient_balance", "Insufficient SMS credit with the provider.",
                                  response_summary=summary)
        if status == 429:
            retry_after = None
            try:
                retry_after = int(resp.headers.get("Retry-After", ""))
            except (TypeError, ValueError):
                pass
            return ProviderResult(RETRYABLE, status, "rate_limited", "The SMS provider is rate limiting requests.",
                                  retry_after=retry_after, response_summary=summary)
        if 400 <= status < 500:
            return ProviderResult(REJECTED, status, "validation", message, response_summary=summary)
        return ProviderResult(AMBIGUOUS, status, "provider_error",
                              f"The SMS provider had an error (HTTP {status}). Messages may or may not have been sent.",
                              response_summary=summary)


class DryRunSmsClient:
    """Test-mode client: records what would be sent, never calls the provider."""

    def send(self, to: str, message: str, sender_id: str) -> ProviderResult:
        return self.send_bulk([to], message, sender_id)

    def send_bulk(self, recipients: list[str], message: str, sender_id: str) -> ProviderResult:
        logger.info("SMS dry run: %d recipient(s), %d chars, sender %s", len(recipients), len(message), sender_id or "-")
        return ProviderResult(
            ACCEPTED,
            recipients={p: RecipientOutcome(accepted=True, message_id="") for p in recipients},
            simulated=True,
        )

    def get_status(self, message_id: str) -> ProviderResult:
        return ProviderResult(REJECTED, error_code="dry_run", error_message="Status lookup is unavailable in test mode.")

    def get_balance(self) -> ProviderResult:
        return ProviderResult(REJECTED, error_code="dry_run", error_message="Balance check is unavailable in test mode.")


def get_sms_client():
    """Real client when configured and not in dry-run mode; otherwise the dry-run client."""
    from .config import SmsNotConfigured, get_api_key, get_sms_settings

    cfg = get_sms_settings()
    if cfg.dry_run:
        return DryRunSmsClient()
    key = get_api_key()
    if not key:
        raise SmsNotConfigured("AgooSMS API key is not configured.")
    if not cfg.sender_ids:
        raise SmsNotConfigured("No approved AgooSMS sender ID is configured.")
    return AgooSMSClient(api_key=key, base_url=cfg.base_url, timeout=cfg.timeout)
