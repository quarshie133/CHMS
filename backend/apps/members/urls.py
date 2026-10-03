from rest_framework.routers import DefaultRouter
from .views import FamilyViewSet, MemberViewSet

router = DefaultRouter()
router.register("families", FamilyViewSet, basename="family")
router.register("", MemberViewSet, basename="member")

urlpatterns = router.urls
