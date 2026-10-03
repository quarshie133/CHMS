"""
Members app models — Member, Family, LifeStage.
All tenant-scoped (per-church schema).
"""

import uuid
from django.db import models


class LifeStage(models.TextChoices):
    INFANT = "infant", "Infant"
    CHILD = "child", "Child"
    TEEN = "teen", "Teen"
    YOUNG_ADULT = "young_adult", "Young Adult"
    ADULT = "adult", "Adult"
    SENIOR = "senior", "Senior"


class MaritalStatus(models.TextChoices):
    SINGLE = "single", "Single"
    MARRIED = "married", "Married"
    DIVORCED = "divorced", "Divorced"
    WIDOWED = "widowed", "Widowed"
    SEPARATED = "separated", "Separated"


class MemberStatus(models.TextChoices):
    ACTIVE = "active", "Active Member"
    INACTIVE = "inactive", "Inactive"
    VISITOR = "visitor", "Visitor"
    TRANSFERRED = "transferred", "Transferred Out"
    DECEASED = "deceased", "Deceased"


class Family(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "families"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Member(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    family = models.ForeignKey(Family, on_delete=models.SET_NULL, null=True, blank=True, related_name="members")

    # Personal info
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    preferred_name = models.CharField(max_length=100, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=[("male", "Male"), ("female", "Female"), ("other", "Other")],
        blank=True,
    )
    date_of_birth = models.DateField(null=True, blank=True)
    life_stage = models.CharField(max_length=20, choices=LifeStage.choices, blank=True)
    marital_status = models.CharField(max_length=20, choices=MaritalStatus.choices, blank=True)
    photo = models.ImageField(upload_to="member_photos/", null=True, blank=True)

    # Contact
    email = models.EmailField(blank=True)
    phone_mobile = models.CharField(max_length=30, blank=True)
    phone_home = models.CharField(max_length=30, blank=True)
    phone_work = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)

    # Church info
    status = models.CharField(max_length=20, choices=MemberStatus.choices, default=MemberStatus.VISITOR)
    membership_date = models.DateField(null=True, blank=True)
    baptism_date = models.DateField(null=True, blank=True)
    salvavtion_date = models.DateField(null=True, blank=True)
    join_reason = models.CharField(
        max_length=30,
        choices=[
            ("profession_of_faith", "Profession of Faith"),
            ("transfer", "Transfer"),
            ("baptism", "Baptism"),
            ("restoration", "Restoration"),
        ],
        blank=True,
    )
    how_did_you_hear = models.CharField(max_length=200, blank=True)

    # Occupation
    employer = models.CharField(max_length=200, blank=True)
    occupation = models.CharField(max_length=200, blank=True)

    # Spiritual
    spiritual_gifts = models.TextField(blank=True)
    interests = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    # Linked portal user
    user_id = models.BigIntegerField(null=True, blank=True, help_text="accounts.User.id")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        if self.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - self.date_of_birth.year - (
                (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
            )
        return None


class MemberNote(models.Model):
    """Private pastoral notes on a member."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="private_notes")
    note = models.TextField()
    created_by_user_id = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
