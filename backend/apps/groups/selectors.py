from typing import Optional
from django.db.models import QuerySet
from rest_framework.exceptions import PermissionDenied, NotFound

from apps.authentication.models import User
from .models import (
    PasanakuGroup,
    GroupMembership,
    PasanakuTurn,
    Round,
    Contribution,
    RoundStatus,
)


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
    Regla del PDF: Un usuario ajeno al grupo no podrá consultar su información (403 Forbidden).
    """
    group = PasanakuGroup.objects.filter(id=group_id).prefetch_related('memberships__user').first()
    if not group:
        raise NotFound('El grupo de pasanaku solicitado no existe.')

    is_member = group.memberships.filter(user=user).exists()
    if not is_member and not user.is_staff:
        raise PermissionDenied('No tienes autorización para consultar la información de este grupo privado.')

    return group


def group_get_by_invite_code(*, invite_code: str) -> PasanakuGroup:
    """Obtiene un grupo a partir de su código de invitación (para previsualización)."""
    clean_code = invite_code.strip().upper()
    group = PasanakuGroup.objects.filter(invite_code=clean_code).first()
    if not group:
        raise NotFound('El código de invitación no corresponde a ningún grupo de pasanaku.')
    return group


def group_get_membership(*, group: PasanakuGroup, user: User) -> Optional[GroupMembership]:
    """Obtiene la membresía del usuario en el grupo."""
    return GroupMembership.objects.filter(group=group, user=user).first()


def turn_list_for_group(*, group: PasanakuGroup, user: User) -> QuerySet[PasanakuTurn]:
    """
    Lista los turnos del grupo ordenados secuencialmente (1..N).
    Asegura aislamiento: el usuario debe ser miembro del grupo.
    """
    is_member = group.memberships.filter(user=user).exists()
    if not is_member and not user.is_staff:
        raise PermissionDenied('No tienes autorización para consultar los turnos de este grupo.')

    return group.turns.select_related('user').order_by('turn_number')


def round_list_for_group(*, group: PasanakuGroup, user: User) -> QuerySet[Round]:
    """Lista las rondas históricas y activas del grupo ordenadas cronológicamente."""
    is_member = group.memberships.filter(user=user).exists()
    if not is_member and not user.is_staff:
        raise PermissionDenied('No tienes autorización para consultar las rondas de este grupo.')

    return group.rounds.select_related('beneficiary').prefetch_related('contributions__user').order_by('round_number')


def round_get_current(*, group: PasanakuGroup, user: User) -> Optional[Round]:
    """Obtiene la ronda actualmente activa del grupo."""
    is_member = group.memberships.filter(user=user).exists()
    if not is_member and not user.is_staff:
        raise PermissionDenied('No tienes autorización para consultar la ronda activa de este grupo.')

    return group.rounds.filter(status=RoundStatus.ACTIVA).select_related('beneficiary').first()


def round_get_by_id(*, round_id: int, user: User) -> Round:
    """Obtiene una ronda por ID validando que el usuario pertenezca al grupo."""
    round_obj = Round.objects.filter(id=round_id).select_related('group', 'beneficiary').first()
    if not round_obj:
        raise NotFound('La ronda solicitada no existe.')

    is_member = round_obj.group.memberships.filter(user=user).exists()
    if not is_member and not user.is_staff:
        raise PermissionDenied('No tienes autorización para consultar esta ronda.')

    return round_obj


def contribution_get_by_id(*, contribution_id: int, user: User) -> Contribution:
    """Obtiene una cuota por ID validando pertenencia del usuario al grupo."""
    contribution = Contribution.objects.filter(
        id=contribution_id
    ).select_related('round__group', 'user', 'validated_by').first()

    if not contribution:
        raise NotFound('El aporte solicitado no existe.')

    is_member = contribution.round.group.memberships.filter(user=user).exists()
    if not is_member and not user.is_staff:
        raise PermissionDenied('No tienes autorización para acceder a este aporte.')

    return contribution


def contribution_list_for_round(*, round_obj: Round, user: User) -> QuerySet[Contribution]:
    """Lista las cuotas de una ronda."""
    is_member = round_obj.group.memberships.filter(user=user).exists()
    if not is_member and not user.is_staff:
        raise PermissionDenied('No tienes autorización para consultar los aportes de esta ronda.')

    return round_obj.contributions.select_related('user', 'validated_by').order_by('user__first_name')


def contribution_list_for_user(*, user: User, group_id: Optional[int] = None) -> QuerySet[Contribution]:
    """
    Lista los aportes pertenecientes al usuario (sus cuotas pendientes y realizadas).
    Permite filtrar opcionalmente por grupo.
    """
    qs = Contribution.objects.filter(user=user).select_related('round__group', 'validated_by')
    if group_id:
        qs = qs.filter(round__group_id=group_id)
    return qs.order_by('-round__start_date')
