from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsStaffOrAbove
from .models import Series, Sermon
from .serializers import SeriesSerializer, SermonSerializer


class SeriesViewSet(ModelViewSet):
    serializer_class = SeriesSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = Series.objects.all()
    filterset_fields = ["is_active"]
    search_fields = ["title", "description"]


class SermonViewSet(ModelViewSet):
    serializer_class = SermonSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = Sermon.objects.select_related("series").all()
    filterset_fields = ["series", "is_published", "speaker"]
    search_fields = ["title", "speaker", "scripture_reference", "tags"]
    ordering_fields = ["date", "views_count", "created_at"]

    @action(detail=True, methods=["post"])
    def increment_view(self, request, pk=None):
        sermon = self.get_object()
        sermon.views_count += 1
        sermon.save(update_fields=["views_count"])
        return Response({"views_count": sermon.views_count})
