from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsStaffOrAbove
from .models import AttendanceRecord, Service, ServiceType
from .serializers import (
    AttendanceRecordSerializer, ServiceListSerializer, ServiceSerializer, ServiceTypeSerializer
)


class ServiceTypeViewSet(ModelViewSet):
    serializer_class = ServiceTypeSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = ServiceType.objects.all()


class ServiceViewSet(ModelViewSet):
    permission_classes = [IsStaffOrAbove]
    queryset = Service.objects.select_related("service_type").all()

    def get_serializer_class(self):
        if self.action == "list":
            return ServiceListSerializer
        return ServiceSerializer

    @action(detail=False, methods=["get"])
    def trends(self, request):
        """Attendance trend data for the last 12 weeks."""
        from django.db.models import Count
        from datetime import date, timedelta
        cutoff = date.today() - timedelta(weeks=12)
        data = (
            Service.objects.filter(date__gte=cutoff)
            .annotate(count=Count("records"))
            .values("date", "count", "service_type__name")
            .order_by("date")
        )
        return Response(list(data))


class AttendanceRecordViewSet(ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = AttendanceRecord.objects.select_related("member", "service").all()
    filterset_fields = ["service", "is_first_time"]
