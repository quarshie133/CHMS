"""Events serializers."""

from rest_framework import serializers
from .models import Event, EventCategory, RSVP


class EventCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EventCategory
        fields = "__all__"


class RSVPSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True, default=None)

    class Meta:
        model = RSVP
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class EventSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    rsvp_count = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_rsvp_count(self, obj):
        return obj.rsvps.filter(status="attending").count()
