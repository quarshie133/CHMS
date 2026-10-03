from rest_framework.routers import DefaultRouter
from .views import GroupCategoryViewSet, GroupViewSet

router = DefaultRouter()
router.register("categories", GroupCategoryViewSet, basename="group-category")
router.register("", GroupViewSet, basename="group")

urlpatterns = router.urls
