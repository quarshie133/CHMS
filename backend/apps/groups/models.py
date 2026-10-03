"""Groups & Ministries models."""

import uuid
from django.db import models
from apps.members.models import Member


class GroupCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)  # e.g. Life Groups, Ministries, Choirs
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "group categories"

    def __str__(self):
        return self.name


class Group(models.Model):
    class MeetingFrequency(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        BIWEEKLY = "biweekly", "Bi-Weekly"
        MONTHLY = "monthly", "Monthly"
        IRREGULAR = "irregular", "Irregular"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    category = models.ForeignKey(GroupCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="groups")
    description = models.TextField(blank=True)
    leader = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, related_name="led_groups")
    co_leader = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, related_name="co_led_groups")
    meeting_day = models.CharField(max_length=15, blank=True)
    meeting_time = models.TimeField(null=True, blank=True)
    meeting_frequency = models.CharField(max_length=20, choices=MeetingFrequency.choices, default=MeetingFrequency.WEEKLY)
    meeting_location = models.CharField(max_length=300, blank=True)
    max_members = models.PositiveIntegerField(null=True, blank=True)
    is_open = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    cover_image = models.ImageField(upload_to="group_covers/", null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def member_count(self):
        return self.memberships.filter(is_active=True).count()


class GroupMembership(models.Model):
    class Role(models.TextChoices):
        LEADER = "leader", "Leader"
        CO_LEADER = "co_leader", "Co-Leader"
        MEMBER = "member", "Member"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="memberships")
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="group_memberships")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    joined_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ["group", "member"]
