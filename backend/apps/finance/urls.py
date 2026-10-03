from rest_framework.routers import DefaultRouter
from .views import ContributionViewSet, FundViewSet, PledgeViewSet

router = DefaultRouter()
router.register("funds", FundViewSet, basename="fund")
router.register("contributions", ContributionViewSet, basename="contribution")
router.register("pledges", PledgeViewSet, basename="pledge")

urlpatterns = router.urls
