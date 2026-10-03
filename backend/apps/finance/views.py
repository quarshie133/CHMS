from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from datetime import date, timedelta
from apps.accounts.permissions import IsStaffOrAbove
from .models import Contribution, Fund, Pledge
from .serializers import ContributionSerializer, FundSerializer, PledgeSerializer


class FundViewSet(ModelViewSet):
    serializer_class = FundSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = Fund.objects.all()


class ContributionViewSet(ModelViewSet):
    serializer_class = ContributionSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = Contribution.objects.select_related("member", "fund").all()
    filterset_fields = ["contribution_type", "payment_method", "fund", "member"]
    search_fields = ["member__first_name", "member__last_name", "reference_number"]
    ordering_fields = ["date", "amount", "created_at"]

    @action(detail=False, methods=["get"])
    def summary(self, request):
        today = date.today()
        this_month = Q(date__year=today.year, date__month=today.month)
        this_year = Q(date__year=today.year)
        return Response({
            "this_month": str(Contribution.objects.filter(this_month).aggregate(total=Sum("amount"))["total"] or 0),
            "this_year": str(Contribution.objects.filter(this_year).aggregate(total=Sum("amount"))["total"] or 0),
            "all_time": str(Contribution.objects.aggregate(total=Sum("amount"))["total"] or 0),
            "by_type": list(Contribution.objects.values("contribution_type").annotate(total=Sum("amount"), count=Count("id"))),
            "by_method": list(Contribution.objects.filter(this_month).values("payment_method").annotate(total=Sum("amount"))),
        })

    @action(detail=False, methods=["get"])
    def monthly_trend(self, request):
        """Last 12 months of giving."""
        cutoff = date.today() - timedelta(days=365)
        data = (
            Contribution.objects.filter(date__gte=cutoff)
            .extra(select={"month": "DATE_TRUNC('month', date)"})
            .values("month")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("month")
        )
        return Response(list(data))


class PledgeViewSet(ModelViewSet):
    serializer_class = PledgeSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = Pledge.objects.select_related("member", "fund").all()
    filterset_fields = ["status", "fund", "member"]
