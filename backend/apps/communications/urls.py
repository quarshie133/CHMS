from rest_framework.routers import DefaultRouter
from .views import CampaignViewSet, MessageTemplateViewSet

router = DefaultRouter()
router.register("templates", MessageTemplateViewSet, basename="message-template")
router.register("campaigns", CampaignViewSet, basename="campaign")

urlpatterns = router.urls
