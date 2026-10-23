from unittest import mock

from django.test import SimpleTestCase, override_settings

from apps.communications.sms import config as sms_config
from apps.communications.sms.phone import InvalidPhoneNumber, mask_phone, normalize_ghana_phone
from apps.communications.sms.segments import sms_segments


class GhanaPhoneTests(SimpleTestCase):
    def test_accepts_common_formats(self):
        for raw in ["+233241234567", "233241234567", "00233241234567", "0241234567", "241234567", "024 123 4567", "+233 (24) 123-4567"]:
            with self.subTest(raw=raw):
                self.assertEqual(normalize_ghana_phone(raw), "+233241234567")

    def test_rejects_invalid_numbers(self):
        for raw in ["", None, "+1 555 234 8901", "(555) 234-8901", "02412345", "+23324123456789", "0191234567", "abc", "+233a41234567"]:
            with self.subTest(raw=raw), self.assertRaises(InvalidPhoneNumber):
                normalize_ghana_phone(raw)

    def test_mask(self):
        self.assertEqual(mask_phone("+233241234567"), "+233 24 *** 4567")


class SegmentTests(SimpleTestCase):
    def test_gsm_and_unicode(self):
        self.assertEqual(sms_segments("a" * 160)["segments"], 1)
        self.assertEqual(sms_segments("a" * 161)["segments"], 2)
        self.assertEqual(sms_segments("Hi 🙏")["encoding"], "unicode")
        self.assertEqual(sms_segments("")["segments"], 0)


class SmsConfigTests(SimpleTestCase):
    def setUp(self):
        sms_config._api_key_from_aws.cache_clear()

    @override_settings(AGOOSMS_API_KEY="", AGOOSMS_SENDER_ID="TLPCI, CHURCH", SMS_DRY_RUN=False)
    def test_missing_key_is_reported_not_crashing(self):
        cfg = sms_config.get_sms_settings()
        self.assertFalse(cfg.api_key_available)
        self.assertFalse(cfg.can_send_real)
        self.assertEqual(cfg.sender_ids, ("TLPCI", "CHURCH"))
        self.assertEqual(cfg.default_sender_id, "TLPCI")

    @override_settings(AGOOSMS_API_KEY="", AGOOSMS_API_KEY_SSM_PARAMETER="/churchms/agoosms", AGOOSMS_API_KEY_SECRET_ID="")
    def test_key_from_ssm(self):
        fake = mock.Mock()
        fake.get_parameter.return_value = {"Parameter": {"Value": "ssm-key"}}
        with mock.patch("boto3.client", return_value=fake) as client:
            self.assertEqual(sms_config.get_api_key(), "ssm-key")
        client.assert_called_once_with("ssm", region_name=None)
        fake.get_parameter.assert_called_once_with(Name="/churchms/agoosms", WithDecryption=True)

    @override_settings(AGOOSMS_API_KEY="", AGOOSMS_API_KEY_SSM_PARAMETER="", AGOOSMS_API_KEY_SECRET_ID="arn:secret")
    def test_key_from_secrets_manager_json(self):
        fake = mock.Mock()
        fake.get_secret_value.return_value = {"SecretString": '{"api_key": "sm-key"}'}
        with mock.patch("boto3.client", return_value=fake):
            self.assertEqual(sms_config.get_api_key(), "sm-key")

    @override_settings(AGOOSMS_API_KEY="", AGOOSMS_API_KEY_SSM_PARAMETER="/x", AGOOSMS_API_KEY_SECRET_ID="")
    def test_aws_failure_degrades_to_missing_key(self):
        with mock.patch("boto3.client", side_effect=RuntimeError("no creds")):
            self.assertEqual(sms_config.get_api_key(), "")
