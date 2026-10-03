"""Sermons & Media Library models."""

import uuid
from django.db import models


class Series(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    artwork = models.ImageField(upload_to="series_artwork/", null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]
        verbose_name_plural = "series"

    def __str__(self):
        return self.title


class Sermon(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    series = models.ForeignKey(Series, on_delete=models.SET_NULL, null=True, blank=True, related_name="sermons")
    title = models.CharField(max_length=300)
    speaker = models.CharField(max_length=200)
    scripture_reference = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    date = models.DateField()

    # Media files (stored in S3)
    video_url = models.URLField(blank=True)
    audio_url = models.URLField(blank=True)
    video_file = models.FileField(upload_to="sermons/video/", null=True, blank=True)
    audio_file = models.FileField(upload_to="sermons/audio/", null=True, blank=True)
    thumbnail = models.ImageField(upload_to="sermons/thumbnails/", null=True, blank=True)
    notes_file = models.FileField(upload_to="sermons/notes/", null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)

    # SEO / discoverability
    tags = models.JSONField(default=list, blank=True)
    transcript = models.TextField(blank=True)

    is_published = models.BooleanField(default=False)
    views_count = models.PositiveIntegerField(default=0)
    downloads_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.title} — {self.speaker} ({self.date})"
