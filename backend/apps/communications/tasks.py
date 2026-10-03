"""
Celery tasks for sending bulk email and SMS campaigns.
"""

import logging
from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_campaign(self, campaign_id: str):
    """
    Dispatch a communication campaign (email or SMS) to all resolved recipients.
    Runs asynchronously via Celery worker.
    """
    from .models import Campaign, CampaignRecipient
    from apps.members.models import Member

    try:
        campaign = Campaign.objects.get(id=campaign_id)
    except Campaign.DoesNotExist:
        logger.error(f"Campaign {campaign_id} not found.")
        return

    campaign.status = "sending"
    campaign.save(update_fields=["status"])

    # Resolve recipients
    filters = campaign.recipients_filter or {}
    members = Member.objects.filter(**filters)

    if campaign.channel == "email":
        addresses = [(m.id, m.email) for m in members if m.email]
    else:
        addresses = [(m.id, m.phone_mobile) for m in members if m.phone_mobile]

    campaign.recipient_count = len(addresses)
    campaign.save(update_fields=["recipient_count"])

    sent = 0
    failed = 0

    for member_id, address in addresses:
        try:
            if campaign.channel == "email":
                _send_email(address, campaign.subject, campaign.body)
            else:
                _send_sms(address, campaign.body)

            CampaignRecipient.objects.update_or_create(
                campaign=campaign,
                address=address,
                defaults={"status": "sent", "sent_at": timezone.now(), "member_id": member_id},
            )
            sent += 1
        except Exception as e:
            logger.exception(f"Failed to send to {address}: {e}")
            CampaignRecipient.objects.update_or_create(
                campaign=campaign,
                address=address,
                defaults={"status": "failed", "error_message": str(e), "member_id": member_id},
            )
            failed += 1

    campaign.sent_count = sent
    campaign.failed_count = failed
    campaign.status = "sent" if failed == 0 else "failed"
    campaign.sent_at = timezone.now()
    campaign.save(update_fields=["sent_count", "failed_count", "status", "sent_at"])
    logger.info(f"Campaign {campaign_id}: {sent} sent, {failed} failed.")


def _send_email(to_email: str, subject: str, body: str):
    from django.core.mail import send_mail
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email])


def _send_sms(to_phone: str, body: str):
    if not settings.TWILIO_ACCOUNT_SID:
        logger.warning("Twilio not configured. Skipping SMS.")
        return
    from twilio.rest import Client
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    client.messages.create(body=body, from_=settings.TWILIO_PHONE_NUMBER, to=to_phone)


@shared_task
def generate_giving_statements(year: int):
    """Generate annual giving statements for all members (called by Celery Beat)."""
    from apps.members.models import Member
    from apps.finance.models import Contribution
    from django.db.models import Sum

    members = Member.objects.filter(status="active")
    for member in members:
        total = Contribution.objects.filter(
            member=member, date__year=year
        ).aggregate(total=Sum("amount"))["total"] or 0
        logger.info(f"Giving statement for {member}: ${total}")
    # TODO: Render PDF and email to member
