from rest_framework import serializers
from .models import Church, Domain


class DomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Domain
        fields = ["id", "domain", "is_primary"]


class ChurchSerializer(serializers.ModelSerializer):
    domains = DomainSerializer(many=True, read_only=True)

    class Meta:
        model = Church
        fields = [
            "id", "name", "slug", "description", "address", "city", "state",
            "country", "postal_code", "phone", "email", "website", "logo",
            "denomination", "founded_year", "timezone", "currency",
            "is_active", "subscription_plan", "domains", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ChurchRegistrationSerializer(serializers.ModelSerializer):
    subdomain = serializers.SlugField(write_only=True)
    admin_email = serializers.EmailField(write_only=True)
    admin_password = serializers.CharField(write_only=True, min_length=8)
    admin_first_name = serializers.CharField(write_only=True)
    admin_last_name = serializers.CharField(write_only=True)

    class Meta:
        model = Church
        fields = [
            "name", "slug", "subdomain", "email", "phone",
            "city", "state", "country", "timezone", "currency",
            "admin_email", "admin_password", "admin_first_name", "admin_last_name",
        ]

    def validate_subdomain(self, value):
        if Domain.objects.filter(domain__startswith=value).exists():
            raise serializers.ValidationError("Subdomain already taken.")
        return value
