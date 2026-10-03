from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.accounts.permissions import IsStaffOrAbove, IsPastorOrAbove
from .filters import MemberFilter
from .models import Family, Member, MemberNote
from .serializers import (
    FamilySerializer,
    MemberDetailSerializer,
    MemberListSerializer,
    MemberNoteSerializer,
)


class FamilyViewSet(ModelViewSet):
    serializer_class = FamilySerializer
    permission_classes = [IsStaffOrAbove]
    queryset = Family.objects.all()
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "city"]
    ordering_fields = ["name", "created_at"]


class MemberViewSet(ModelViewSet):
    permission_classes = [IsStaffOrAbove]
    queryset = Member.objects.select_related("family").all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = MemberFilter
    search_fields = ["first_name", "last_name", "email", "phone_mobile"]
    ordering_fields = ["last_name", "first_name", "membership_date", "created_at"]
    ordering = ["last_name"]

    def get_serializer_class(self):
        if self.action == "list":
            return MemberListSerializer
        return MemberDetailSerializer

    @action(detail=True, methods=["get", "post"], permission_classes=[IsPastorOrAbove])
    def notes(self, request, pk=None):
        member = self.get_object()
        if request.method == "GET":
            notes = MemberNote.objects.filter(member=member)
            return Response(MemberNoteSerializer(notes, many=True).data)
        serializer = MemberNoteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(member=member)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        from django.db.models import Count
        qs = Member.objects.all()
        return Response({
            "total": qs.count(),
            "active": qs.filter(status="active").count(),
            "visitors": qs.filter(status="visitor").count(),
            "inactive": qs.filter(status="inactive").count(),
            "by_life_stage": list(
                qs.values("life_stage").annotate(count=Count("id"))
            ),
            "by_gender": list(
                qs.values("gender").annotate(count=Count("id"))
            ),
        })
