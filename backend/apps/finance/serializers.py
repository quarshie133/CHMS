"""Finance serializers."""

from rest_framework import serializers
from .models import Contribution, Fund, Pledge


class FundSerializer(serializers.ModelSerializer):
    total_received = serializers.SerializerMethodField()
    fulfillment_pct = serializers.SerializerMethodField()

    class Meta:
        model = Fund
        fields = "__all__"
        read_only_fields = ["id", "created_at"]

    def get_total_received(self, obj):
        from django.db.models import Sum
        result = obj.contributions.aggregate(total=Sum("amount"))
        return str(result["total"] or 0)

    def get_fulfillment_pct(self, obj):
        if obj.goal_amount:
            from django.db.models import Sum
            total = obj.contributions.aggregate(total=Sum("amount"))["total"] or 0
            return round(float(total) / float(obj.goal_amount) * 100, 1)
        return None


class ContributionSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True, default=None)
    fund_name = serializers.CharField(source="fund.name", read_only=True)

    class Meta:
        model = Contribution
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class PledgeSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True)
    fund_name = serializers.CharField(source="fund.name", read_only=True)
    remaining_amount = serializers.ReadOnlyField()
    fulfillment_pct = serializers.ReadOnlyField()

    class Meta:
        model = Pledge
        fields = "__all__"
        read_only_fields = ["id", "created_at"]
