"""Sermons serializers."""

from rest_framework import serializers
from .models import Series, Sermon


class SeriesSerializer(serializers.ModelSerializer):
    sermon_count = serializers.SerializerMethodField()

    class Meta:
        model = Series
        fields = "__all__"
        read_only_fields = ["id", "created_at"]

    def get_sermon_count(self, obj):
        return obj.sermons.count()


class SermonSerializer(serializers.ModelSerializer):
    series_title = serializers.CharField(source="series.title", read_only=True, default=None)

    class Meta:
        model = Sermon
        fields = "__all__"
        read_only_fields = ["id", "views_count", "downloads_count", "created_at", "updated_at"]
