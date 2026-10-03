from rest_framework.routers import DefaultRouter
from .views import EventCategoryViewSet, EventViewSet, RSVPViewSet

router = DefaultRouter()
router.register("categories", EventCategoryViewSet, basename="event-category")
router.register("rsvps", RSVPViewSet, basename="rsvp")
router.register("", EventViewSet, basename="event")

urlpatterns = router.urls
