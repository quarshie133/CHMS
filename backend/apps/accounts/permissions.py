"""RBAC permission classes for DRF views."""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrAbove(BasePermission):
    """Church admin or super admin."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin_or_above


class IsPastorOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_pastor_or_above


class IsStaffOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff_or_above


class IsStaffOrReadOnly(BasePermission):
    """Staff can write; all authenticated users can read."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_staff_or_above


class IsOwnerOrStaff(BasePermission):
    """Object-level: owner or staff+."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff_or_above:
            return True
        return getattr(obj, "user", None) == request.user
