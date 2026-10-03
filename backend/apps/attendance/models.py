"""Attendance tracking models."""

import uuid
from django.db import models
from apps.members.models import Member


class ServiceType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)  # e.g. "Sunday Morning", "Midweek", "Youth"
    description = models.TextField(blank=True)
    default_day = models.CharField(
        max_length=10,
        choices=[
            ("sunday", "Sunday"), ("monday", "Monday"), ("tuesday", "Tuesday"),
            ("wednesday", "Wednesday"), ("thursday", "Thursday"),
            ("friday", "Friday"), ("saturday", "Saturday"),
        ],
        blank=True,
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Service(models.Model):
    """A specific service occurrence."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_type = models.ForeignKey(ServiceType, on_delete=models.PROTECT, related_name="services")
    date = models.DateField()
    title = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    expected_count = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ["service_type", "date"]

    def __str__(self):
        return f"{self.service_type.name} — {self.date}"

    @property
    def actual_count(self):
        return self.records.count()


class AttendanceRecord(models.Model):
    """Individual attendance record per member per service."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="records")
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="attendance_records", null=True, blank=True)

    # Guest / first-time visitor (no member record yet)
    guest_name = models.CharField(max_length=200, blank=True)
    guest_email = models.CharField(max_length=200, blank=True)
    guest_phone = models.CharField(max_length=30, blank=True)

    is_first_time = models.BooleanField(default=False)
    check_in_time = models.TimeField(null=True, blank=True)
    notes = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["service", "member"]
        ordering = ["-created_at"]

    def __str__(self):
        name = self.member.full_name if self.member else self.guest_name
        return f"{name} @ {self.service}"
