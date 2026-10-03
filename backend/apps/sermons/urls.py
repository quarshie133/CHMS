from rest_framework.routers import DefaultRouter
from .views import SeriesViewSet, SermonViewSet

router = DefaultRouter()
router.register("series", SeriesViewSet, basename="series")
router.register("", SermonViewSet, basename="sermon")

urlpatterns = router.urls
