from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CampaignViewSet, MessageTemplateViewSet, SmsConfigView, SmsConnectionCheckView

router = DefaultRouter()
router.register("templates", MessageTemplateViewSet, basename="message-template")
router.register("campaigns", CampaignViewSet, basename="campaign")

urlpatterns = [
    path("sms/config/", SmsConfigView.as_view(), name="sms-config"),
    path("sms/check-connection/", SmsConnectionCheckView.as_view(), name="sms-check-connection"),
] + router.urls
