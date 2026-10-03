from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from apps.accounts.permissions import IsStaffOrAbove
from .models import Event, EventCategory, RSVP
from .serializers import EventCategorySerializer, EventSerializer, RSVPSerializer


class EventCategoryViewSet(ModelViewSet):
    serializer_class = EventCategorySerializer
    permission_classes = [IsStaffOrAbove]
    queryset = EventCategory.objects.all()


class EventViewSet(ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = Event.objects.select_related("category").all()
    filterset_fields = ["category", "is_public", "requires_rsvp"]
    search_fields = ["title", "location"]
    ordering_fields = ["start_datetime", "created_at"]

    @action(detail=True, methods=["get", "post"])
    def rsvps(self, request, pk=None):
        event = self.get_object()
        if request.method == "GET":
            return Response(RSVPSerializer(event.rsvps.all(), many=True).data)
        serializer = RSVPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(event=event)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RSVPViewSet(ModelViewSet):
    serializer_class = RSVPSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = RSVP.objects.select_related("member", "event").all()
    filterset_fields = ["event", "status", "member"]
