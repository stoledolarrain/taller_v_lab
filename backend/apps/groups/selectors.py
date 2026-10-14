from typing import Optional
from django.db.models import QuerySet
from rest_framework.exceptions import PermissionDenied, NotFound

from apps.authentication.models import User
from .models import PasanakuGroup, GroupMembership


def group_list_for_user(*, user: User) -> QuerySet[PasanakuGroup]:
    """
    Retorna todos los grupos de pasanaku a los que pertenece el usuario
    (como administrador o participante).
    """
    return PasanakuGroup.objects.filter(
        memberships__user=user
    ).distinct().prefetch_related('memberships__user')


def group_get_by_id(*, group_id: int, user: User) -> PasanakuGroup:
    """
    Obtiene un grupo por ID garantizando el aislamiento de datos.
    Regla del PDF: Un usuario ajeno al grupo no podrá consultar su información.
    """
    group = PasanakuGroup.objects.filter(id=group_id).prefetch_related('memberships__user').first()
    if not group:
        raise NotFound('El grupo de pasanaku solicitado no existe.')

    # Validación de pertenencia / aislamiento
    is_member = group.memberships.filter(user=user).exists()
    if not is_member and not user.is_staff:
        raise PermissionDenied('No tienes autorización para consultar la información de este grupo privado.')

    return group


def group_get_membership(*, group: PasanakuGroup, user: User) -> Optional[GroupMembership]:
    """Obtiene la membresía del usuario en el grupo."""
    return GroupMembership.objects.filter(group=group, user=user).first()
