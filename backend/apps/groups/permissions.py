from rest_framework import permissions
from .models import GroupMembership, MembershipRole


class IsGroupMember(permissions.BasePermission):
    """Permiso que comprueba si el usuario autenticado pertenece al grupo."""

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return GroupMembership.objects.filter(group=obj, user=request.user).exists()


class IsGroupAdmin(permissions.BasePermission):
    """Permiso que comprueba si el usuario es Administrador del grupo."""

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        membership = GroupMembership.objects.filter(group=obj, user=request.user).first()
        return membership is not None and membership.role == MembershipRole.ADMIN
