"""Communications models: Email campaigns, SMS blasts, Templates."""

import uuid
from django.db import models


class MessageTemplate(models.Model):
    class ChannelType(models.TextChoices):
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    channel = models.CharField(max_length=10, choices=ChannelType.choices)
    subject = models.CharField(max_length=300, blank=True)  # email only
    body = models.TextField()
    variables = models.JSONField(default=list, blank=True, help_text="List of variable names in template")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.channel.upper()}] {self.name}"


class Campaign(models.Model):
    class CampaignStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        SCHEDULED = "scheduled", "Scheduled"
        SENDING = "sending", "Sending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=300)
    template = models.ForeignKey(MessageTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    channel = models.CharField(max_length=10, choices=MessageTemplate.ChannelType.choices)
    subject = models.CharField(max_length=300, blank=True)
    body = models.TextField()
    recipients_filter = models.JSONField(default=dict, blank=True, help_text="Stored query filters")
    recipient_count = models.PositiveIntegerField(default=0)
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=CampaignStatus.choices, default=CampaignStatus.DRAFT)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_by_user_id = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.status})"


class CampaignRecipient(models.Model):
    """Individual delivery record per recipient."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name="recipient_records")
    member_id = models.UUIDField(null=True, blank=True)
    address = models.CharField(max_length=300)  # email or phone
    status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("sent", "Sent"), ("failed", "Failed"), ("bounced", "Bounced")],
        default="pending",
    )
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-sent_at"]
