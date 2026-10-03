from rest_framework import serializers
from .models import Family, Member, MemberNote


class FamilySerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Family
        fields = [
            "id", "name", "address", "city", "state", "country",
            "postal_code", "notes", "member_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_member_count(self, obj):
        return obj.members.count()


class MemberListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    age = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()
    family_name = serializers.CharField(source="family.name", read_only=True, default=None)

    class Meta:
        model = Member
        fields = [
            "id", "full_name", "first_name", "last_name", "email",
            "phone_mobile", "status", "life_stage", "photo",
            "age", "family_name", "membership_date", "created_at",
        ]


class MemberDetailSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()
    family = FamilySerializer(read_only=True)
    family_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Member
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class MemberNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberNote
        fields = ["id", "member", "note", "created_by_user_id", "created_at"]
        read_only_fields = ["id", "created_by_user_id", "created_at"]

    def create(self, validated_data):
        validated_data["created_by_user_id"] = self.context["request"].user.id
        return super().create(validated_data)
