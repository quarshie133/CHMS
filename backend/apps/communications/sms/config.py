"""
SMS configuration, resolved from Django settings.

The API key can come from (first match wins):
  1. AGOOSMS_API_KEY (environment variable / .env)
  2. AWS SSM Parameter Store: AGOOSMS_API_KEY_SSM_PARAMETER (SecureString)
  3. AWS Secrets Manager: AGOOSMS_API_KEY_SECRET_ID (plain string or JSON {"api_key": "..."})
The key is never logged and never returned by any API endpoint.
"""

import json
import logging
from dataclasses import dataclass, field
from functools import lru_cache

from django.conf import settings

logger = logging.getLogger(__name__)


class SmsNotConfigured(Exception):
    """Raised when real sending is requested but the provider isn't configured."""


@dataclass(frozen=True)
class SmsSettings:
    base_url: str
    timeout: float
    max_bulk: int
    sender_ids: tuple[str, ...]
    dry_run: bool
    large_broadcast_threshold: int
    max_recipients: int
    max_message_length: int
    api_key_available: bool = field(default=False)

    @property
    def default_sender_id(self) -> str:
        return self.sender_ids[0] if self.sender_ids else ""

    @property
    def can_send_real(self) -> bool:
        return self.api_key_available and bool(self.sender_ids)


def _setting(name, default=None):
    return getattr(settings, name, default)


@lru_cache(maxsize=1)
def _api_key_from_aws() -> str:
    """Fetch the key from SSM or Secrets Manager. Cached per process."""
    param = _setting("AGOOSMS_API_KEY_SSM_PARAMETER", "")
    secret_id = _setting("AGOOSMS_API_KEY_SECRET_ID", "")
    if not param and not secret_id:
        return ""
    try:
        import boto3

        region = _setting("AWS_REGION", "") or None
        if param:
            resp = boto3.client("ssm", region_name=region).get_parameter(Name=param, WithDecryption=True)
            return resp["Parameter"]["Value"].strip()
        resp = boto3.client("secretsmanager", region_name=region).get_secret_value(SecretId=secret_id)
        raw = resp.get("SecretString", "") or ""
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                return str(data.get("api_key") or data.get("AGOOSMS_API_KEY") or "").strip()
        except ValueError:
            pass
        return raw.strip()
    except Exception as exc:  # noqa: BLE001 — never let secret lookup crash the app
        logger.warning("Could not load AgooSMS API key from AWS (%s).", type(exc).__name__)
        return ""


def get_api_key() -> str:
    key = (_setting("AGOOSMS_API_KEY", "") or "").strip()
    return key or _api_key_from_aws()


def get_sms_settings() -> SmsSettings:
    sender_raw = _setting("AGOOSMS_SENDER_ID", "") or ""
    sender_ids = tuple(s.strip() for s in sender_raw.split(",") if s.strip())
    return SmsSettings(
        base_url=(_setting("AGOOSMS_BASE_URL", "") or "https://api.agoosms.com").rstrip("/"),
        timeout=float(_setting("AGOOSMS_TIMEOUT", 30)),
        max_bulk=max(1, int(_setting("AGOOSMS_MAX_BULK", 100))),
        sender_ids=sender_ids,
        dry_run=bool(_setting("SMS_DRY_RUN", True)),
        large_broadcast_threshold=int(_setting("SMS_LARGE_BROADCAST_THRESHOLD", 25)),
        max_recipients=int(_setting("SMS_MAX_RECIPIENTS", 5000)),
        max_message_length=int(_setting("SMS_MAX_MESSAGE_LENGTH", 918)),  # 6 GSM-7 segments
        api_key_available=bool(get_api_key()),
    )
