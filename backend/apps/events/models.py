"""Events & Calendar models."""

import uuid
from django.db import models
from apps.members.models import Member


class EventCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default="#6366f1")  # hex
    icon = models.CharField(max_length=50, blank=True)

    class Meta:
        verbose_name_plural = "event categories"

    def __str__(self):
        return self.name


class Event(models.Model):
    class RecurrenceType(models.TextChoices):
        NONE = "none", "No Recurrence"
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        BIWEEKLY = "biweekly", "Bi-Weekly"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    category = models.ForeignKey(EventCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="events")
    location = models.CharField(max_length=300, blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    is_all_day = models.BooleanField(default=False)
    recurrence = models.CharField(max_length=20, choices=RecurrenceType.choices, default=RecurrenceType.NONE)
    recurrence_end_date = models.DateField(null=True, blank=True)
    max_attendees = models.PositiveIntegerField(null=True, blank=True)
    requires_rsvp = models.BooleanField(default=False)
    is_public = models.BooleanField(default=True)
    cover_image = models.ImageField(upload_to="event_covers/", null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by_user_id = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_datetime"]

    def __str__(self):
        return self.title


class RSVP(models.Model):
    class RSVPStatus(models.TextChoices):
        ATTENDING = "attending", "Attending"
        NOT_ATTENDING = "not_attending", "Not Attending"
        MAYBE = "maybe", "Maybe"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="rsvps")
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="rsvps", null=True, blank=True)
    guest_name = models.CharField(max_length=200, blank=True)
    guest_email = models.EmailField(blank=True)
    status = models.CharField(max_length=20, choices=RSVPStatus.choices, default=RSVPStatus.ATTENDING)
    guest_count = models.PositiveSmallIntegerField(default=1)
    notes = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["event", "member"]

    def __str__(self):
        name = self.member.full_name if self.member else self.guest_name
        return f"{name} — {self.event.title} ({self.status})"
