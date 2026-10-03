from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status as http_status
from apps.accounts.permissions import IsStaffOrAbove
from .models import Campaign, MessageTemplate
from .serializers import CampaignSerializer, MessageTemplateSerializer
from .tasks import send_campaign


class MessageTemplateViewSet(ModelViewSet):
    serializer_class = MessageTemplateSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = MessageTemplate.objects.all()
    filterset_fields = ["channel"]


class CampaignViewSet(ModelViewSet):
    serializer_class = CampaignSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = Campaign.objects.all()
    filterset_fields = ["channel", "status"]

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        campaign = self.get_object()
        if campaign.status not in ("draft", "failed"):
            return Response(
                {"detail": "Only draft or failed campaigns can be sent."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        campaign.status = "scheduled"
        campaign.save(update_fields=["status"])
        send_campaign.delay(str(campaign.id))
        return Response({"detail": "Campaign queued for sending."})
