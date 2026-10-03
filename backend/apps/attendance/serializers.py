"""Attendance serializers and views."""

from rest_framework import serializers
from .models import AttendanceRecord, Service, ServiceType


class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = "__all__"


class AttendanceRecordSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True, default=None)

    class Meta:
        model = AttendanceRecord
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class ServiceSerializer(serializers.ModelSerializer):
    service_type_name = serializers.CharField(source="service_type.name", read_only=True)
    actual_count = serializers.ReadOnlyField()
    records = AttendanceRecordSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = [
            "id", "service_type", "service_type_name", "date", "title",
            "notes", "expected_count", "actual_count", "records", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ServiceListSerializer(serializers.ModelSerializer):
    service_type_name = serializers.CharField(source="service_type.name", read_only=True)
    actual_count = serializers.ReadOnlyField()

    class Meta:
        model = Service
        fields = ["id", "service_type", "service_type_name", "date", "title", "actual_count", "expected_count"]
