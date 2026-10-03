"""Groups serializers."""

from rest_framework import serializers
from .models import Group, GroupCategory, GroupMembership


class GroupCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupCategory
        fields = "__all__"


class GroupMembershipSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True)

    class Meta:
        model = GroupMembership
        fields = "__all__"
        read_only_fields = ["id", "joined_date"]


class GroupSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    leader_name = serializers.CharField(source="leader.full_name", read_only=True, default=None)
    member_count = serializers.ReadOnlyField()

    class Meta:
        model = Group
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
