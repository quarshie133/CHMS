"""AgooSMS client tests. The HTTP layer is always mocked — no real requests."""

from unittest import mock

import requests
from django.test import SimpleTestCase

from apps.communications.sms.agoosms import (
    ACCEPTED,
    AMBIGUOUS,
    REJECTED,
    RETRYABLE,
    AgooSMSClient,
    DryRunSmsClient,
)
from apps.communications.sms.config import SmsNotConfigured

KEY = "test-api-key-should-never-leak"
A, B, C = "+233241234567", "+233201112222", "+233551113333"


def fake_response(status=200, body=None, text=None, headers=None):
    resp = mock.Mock()
    resp.status_code = status
    resp.headers = headers or {}
    if body is None:
        resp.json.side_effect = ValueError("no json")
        resp.text = text or ""
    else:
        resp.json.return_value = body
        resp.text = str(body)
    return resp


def client_with(response=None, exc=None):
    session = mock.Mock()
    if exc is not None:
        session.post.side_effect = exc
        session.get.side_effect = exc
    else:
        session.post.return_value = response
        session.get.return_value = response
    return AgooSMSClient(api_key=KEY, base_url="https://api.example.invalid", timeout=7, session=session), session


class RequestFormatTests(SimpleTestCase):
    def test_single_send_request_shape(self):
        client, session = client_with(fake_response(200, {"success": True, "data": {"id": "msg_1"}}))
        result = client.send(A, "Hello", "TLPCI")
        session.post.assert_called_once_with(
            "https://api.example.invalid/v1/sms/send",
            headers={"X-API-Key": KEY, "Content-Type": "application/json", "Accept": "application/json"},
            json={"to": A, "message": "Hello", "senderId": "TLPCI"},
            timeout=7,
        )
        self.assertEqual(result.outcome, ACCEPTED)
        self.assertEqual(result.recipients[A].message_id, "msg_1")

    def test_bulk_send_request_shape(self):
        client, session = client_with(fake_response(200, {"success": True}))
        result = client.send_bulk([A, B], "Announcement", "TLPCI")
        args, kwargs = session.post.call_args
        self.assertEqual(args[0], "https://api.example.invalid/v1/sms/send-bulk")
        self.assertEqual(kwargs["json"], {"recipients": [A, B], "message": "Announcement", "senderId": "TLPCI"})
        self.assertTrue(result.ok)
        # Not itemised by the provider: every recipient covered by the accepted request.
        self.assertTrue(all(result.recipients[p].accepted for p in (A, B)))

    def test_bulk_itemised_results_with_partial_failure(self):
        body = {"data": {"batchId": "b_9", "messages": [
            {"to": "233241234567", "id": "m1", "status": "queued"},
            {"to": B, "status": "failed", "message": "Invalid destination"},
        ]}}
        client, _ = client_with(fake_response(200, body))
        result = client.send_bulk([A, B, C], "Hi", "TLPCI")
        self.assertEqual(result.batch_id, "b_9")
        self.assertEqual(result.recipients[A].message_id, "m1")
        self.assertFalse(result.recipients[B].accepted)
        self.assertEqual(result.recipients[B].error, "Invalid destination")
        self.assertTrue(result.recipients[C].accepted)


class ErrorClassificationTests(SimpleTestCase):
    def assertOutcome(self, result, outcome, code):
        self.assertEqual((result.outcome, result.error_code), (outcome, code))

    def test_auth_error(self):
        client, _ = client_with(fake_response(401, {"message": f"Invalid key {KEY}"}))
        r = client.send(A, "x", "TLPCI")
        self.assertOutcome(r, REJECTED, "auth")
        self.assertNotIn(KEY, r.error_message)
        self.assertNotIn(KEY, r.response_summary)

    def test_insufficient_balance(self):
        client, _ = client_with(fake_response(402, {"message": "Low balance"}))
        self.assertOutcome(client.send(A, "x", "T"), REJECTED, "insufficient_balance")

    def test_validation_error_uses_provider_message(self):
        client, _ = client_with(fake_response(422, {"errors": [{"message": "senderId not approved"}]}))
        r = client.send(A, "x", "T")
        self.assertOutcome(r, REJECTED, "validation")
        self.assertEqual(r.error_message, "senderId not approved")

    def test_rate_limit_is_retryable_with_retry_after(self):
        client, _ = client_with(fake_response(429, {"message": "slow down"}, headers={"Retry-After": "12"}))
        r = client.send_bulk([A], "x", "T")
        self.assertOutcome(r, RETRYABLE, "rate_limited")
        self.assertEqual(r.retry_after, 12)

    def test_server_error_is_ambiguous(self):
        client, _ = client_with(fake_response(500, {"error": "boom"}))
        self.assertOutcome(client.send(A, "x", "T"), AMBIGUOUS, "provider_error")

    def test_read_timeout_is_ambiguous(self):
        client, _ = client_with(exc=requests.exceptions.ReadTimeout())
        self.assertOutcome(client.send(A, "x", "T"), AMBIGUOUS, "timeout")

    def test_connect_timeout_is_retryable(self):
        client, _ = client_with(exc=requests.exceptions.ConnectTimeout())
        self.assertOutcome(client.send(A, "x", "T"), RETRYABLE, "network")

    def test_dns_failure_is_retryable(self):
        exc = requests.exceptions.ConnectionError("HTTPSConnectionPool: Max retries exceeded (Caused by NameResolutionError(...))")
        client, _ = client_with(exc=exc)
        self.assertOutcome(client.send(A, "x", "T"), RETRYABLE, "network")

    def test_dropped_connection_is_ambiguous(self):
        exc = requests.exceptions.ConnectionError("('Connection aborted.', RemoteDisconnected('Remote end closed connection'))")
        client, _ = client_with(exc=exc)
        self.assertOutcome(client.send(A, "x", "T"), AMBIGUOUS, "network")

    def test_invalid_json_on_success_is_ambiguous(self):
        client, _ = client_with(fake_response(200, body=None, text="<html>oops</html>"))
        self.assertOutcome(client.send(A, "x", "T"), AMBIGUOUS, "invalid_response")

    def test_success_false_body_is_rejected(self):
        client, _ = client_with(fake_response(200, {"success": False, "message": "Insufficient units"}))
        r = client.send_bulk([A], "x", "T")
        self.assertOutcome(r, REJECTED, "provider_rejected")
        self.assertEqual(r.error_message, "Insufficient units")


class SecretHandlingTests(SimpleTestCase):
    def test_missing_key_raises_config_error(self):
        with self.assertRaises(SmsNotConfigured):
            AgooSMSClient(api_key="")

    def test_key_never_in_repr_logs_or_stored_summary(self):
        client, _ = client_with(fake_response(200, {"data": {"id": "m1", "apiKey": KEY, "token": "abc"}}))
        self.assertNotIn(KEY, repr(client))
        with self.assertLogs("apps.communications.sms.agoosms", level="INFO") as logs:
            r = client.send(A, "x", "T")
        self.assertNotIn(KEY, "\n".join(logs.output))
        self.assertNotIn(KEY, r.response_summary)
        self.assertIn("[redacted]", r.response_summary)


class DryRunClientTests(SimpleTestCase):
    def test_dry_run_never_calls_http(self):
        with mock.patch("requests.post") as post:
            r = DryRunSmsClient().send_bulk([A, B], "x", "T")
        post.assert_not_called()
        self.assertTrue(r.ok and r.simulated)
        self.assertEqual(set(r.recipients), {A, B})
