from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from apps.accounts.permissions import IsStaffOrAbove
from .models import Group, GroupCategory, GroupMembership
from .serializers import GroupCategorySerializer, GroupMembershipSerializer, GroupSerializer


class GroupCategoryViewSet(ModelViewSet):
    serializer_class = GroupCategorySerializer
    permission_classes = [IsStaffOrAbove]
    queryset = GroupCategory.objects.all()


class GroupViewSet(ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsStaffOrAbove]
    queryset = Group.objects.select_related("category", "leader").all()
    filterset_fields = ["category", "is_active", "is_open"]
    search_fields = ["name", "description"]

    @action(detail=True, methods=["get", "post"])
    def members(self, request, pk=None):
        group = self.get_object()
        if request.method == "GET":
            return Response(GroupMembershipSerializer(group.memberships.filter(is_active=True), many=True).data)
        serializer = GroupMembershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(group=group)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="members/(?P<membership_id>[^/.]+)")
    def remove_member(self, request, pk=None, membership_id=None):
        GroupMembership.objects.filter(id=membership_id, group_id=pk).update(is_active=False)
        return Response(status=status.HTTP_204_NO_CONTENT)
