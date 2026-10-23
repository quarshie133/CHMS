"""
Regression tests for filtering a broadcast's recipient results.

Bug: the details drawer sent ?status=sent,delivered,simulated to
/campaigns/{id}/recipients/. CampaignViewSet's django-filter config
(filterset_fields = ["channel", "status"]) applied that query param to the
*campaign* lookup inside get_object(), so it was validated against campaign
statuses -> 400 "Select a valid choice. sent,delivered,simulated is not one of
the available choices." (and ?status=failed 404'd for non-failed campaigns).
"""

from django.core.exceptions import ValidationError

from apps.communications.models import Campaign, CampaignRecipient

from .base import CommsTenantTestCase

BASE = "/api/v1/communications"


class RecipientFilterTests(CommsTenantTestCase):
    def setUp(self):
        super().setUp()
        self.api = self.client_for(self.staff)
        self.campaign = Campaign.objects.create(name="c", channel="sms", body="hi", status="partially_sent")
        S = CampaignRecipient.Status
        for i, status in enumerate([S.SENT, S.DELIVERED, S.SIMULATED, S.FAILED, S.UNKNOWN, S.SKIPPED]):
            CampaignRecipient.objects.create(campaign=self.campaign, address=f"+23324123456{i}", status=status)
        self.url = f"{BASE}/campaigns/{self.campaign.id}/recipients/"

    def statuses(self, resp):
        return sorted(r["status"] for r in resp.data["results"])

    def test_accepted_filter_uses_individual_statuses(self):
        resp = self.api.get(self.url, {"recipient_status": ["sent", "delivered", "simulated"]})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(self.statuses(resp), ["delivered", "sent", "simulated"])

    def test_single_status_filter_on_campaign_with_different_status(self):
        # Previously 404: "failed" was applied to the campaign (which is partially_sent).
        resp = self.api.get(self.url, {"recipient_status": "failed"})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(self.statuses(resp), ["failed"])

    def test_unknown_and_skipped_filters(self):
        for status in ("unknown", "skipped"):
            with self.subTest(status=status):
                resp = self.api.get(self.url, {"recipient_status": status})
                self.assertEqual(resp.status_code, 200, resp.data)
                self.assertEqual(self.statuses(resp), [status])

    def test_no_filter_returns_everything(self):
        resp = self.api.get(self.url)
        self.assertEqual(len(resp.data["results"]), 6)

    def test_invalid_status_rejected_not_ignored(self):
        for bad in ("bogus", "sent,delivered,simulated"):
            with self.subTest(value=bad):
                resp = self.api.get(self.url, {"recipient_status": bad})
                self.assertEqual(resp.status_code, 400)
                self.assertIn("recipient_status", resp.data)

    def test_campaign_list_filters_still_validate_campaign_status(self):
        self.assertEqual(self.api.get(f"{BASE}/campaigns/", {"status": "partially_sent"}).status_code, 200)
        self.assertEqual(self.api.get(f"{BASE}/campaigns/", {"status": "sent,delivered"}).status_code, 400)

    def test_detail_actions_ignore_list_filter_params(self):
        # Query params meant for lists must not change which campaign a detail action finds.
        resp = self.api.get(f"{BASE}/campaigns/{self.campaign.id}/", {"status": "failed"})
        self.assertEqual(resp.status_code, 200)


class RecipientStatusModelTests(CommsTenantTestCase):
    def test_comma_separated_status_is_invalid_on_the_model(self):
        campaign = Campaign.objects.create(name="c", channel="sms", body="hi")
        rec = CampaignRecipient(campaign=campaign, address="+233241234567", status="sent,delivered,simulated")
        with self.assertRaises(ValidationError):
            rec.full_clean()
