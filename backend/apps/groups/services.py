from decimal import Decimal
from datetime import date
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.authentication.models import User
from .models import (
    PasanakuGroup,
    GroupMembership,
    GroupStatus,
    MembershipRole,
    generate_invite_code,
)


@transaction.atomic
def group_create(
    *,
    creator: User,
    name: str,
    quota_amount: Decimal,
    periodicity: str,
    start_date: date,
    total_members: int,
    description: str = ''
) -> PasanakuGroup:
    """
    Crea un nuevo grupo de pasanaku en estado BORRADOR.
    Asigna automáticamente al creador como Administrador del grupo.
    """
    if quota_amount <= Decimal('0.00'):
        raise ValidationError({'quota_amount': 'El monto de la cuota debe ser mayor a 0.'})

    if total_members < 2:
        raise ValidationError({'total_members': 'El pasanaku requiere un mínimo de 2 participantes.'})

    if start_date < timezone.now().date():
        raise ValidationError({'start_date': 'La fecha de inicio no puede estar en el pasado.'})

    group = PasanakuGroup.objects.create(
        creator=creator,
        name=name.strip(),
        description=description.strip(),
        quota_amount=quota_amount,
        periodicity=periodicity,
        start_date=start_date,
        total_members=total_members,
        status=GroupStatus.BORRADOR,
        invite_code=generate_invite_code(),
    )

    # El creador se registra como el primer integrante y Administrador del grupo
    GroupMembership.objects.create(
        group=group,
        user=creator,
        role=MembershipRole.ADMIN
    )

    return group


@transaction.atomic
def group_update(
    *,
    group: PasanakuGroup,
    user: User,
    name: str = None,
    description: str = None,
    quota_amount: Decimal = None,
    periodicity: str = None,
    start_date: date = None,
    total_members: int = None
) -> PasanakuGroup:
    """
    Actualiza la configuración de un grupo.
    Regla crítica: solo modificable mientras esté en estado BORRADOR y por el Administrador.
    """
    # Verificar si el usuario es administrador
    membership = GroupMembership.objects.filter(group=group, user=user).first()
    if not membership or membership.role != MembershipRole.ADMIN:
        raise PermissionDenied('Solo el administrador del grupo puede modificar su configuración.')

    # Regla del PDF: Mientras el grupo se encuentre en estado BORRADOR se podrá modificar su configuración.
    # Una vez iniciado, no deberá permitirse cambiar arbitrariamente el monto, periodicidad o turnos.
    if group.status != GroupStatus.BORRADOR:
        raise ValidationError(
            f'No es posible modificar la configuración: el grupo se encuentra en estado {group.status}.'
        )

    if name is not None:
        group.name = name.strip()

    if description is not None:
        group.description = description.strip()

    if quota_amount is not None:
        if quota_amount <= Decimal('0.00'):
            raise ValidationError({'quota_amount': 'El monto de la cuota debe ser mayor a 0.'})
        group.quota_amount = quota_amount

    if periodicity is not None:
        group.periodicity = periodicity

    if start_date is not None:
        if start_date < timezone.now().date():
            raise ValidationError({'start_date': 'La fecha de inicio no puede ser una fecha pasada.'})
        group.start_date = start_date

    if total_members is not None:
        if total_members < 2:
            raise ValidationError({'total_members': 'El cupo mínimo es de 2 integrantes.'})
        if total_members < group.current_members_count:
            raise ValidationError({
                'total_members': (
                    f'No puedes reducir los cupos a {total_members} porque ya existen '
                    f'{group.current_members_count} participantes unidos.'
                )
            })
        group.total_members = total_members

    group.save()
    return group


@transaction.atomic
def group_join_by_code(
    *,
    user: User,
    invite_code: str
) -> GroupMembership:
    """
    Une a un usuario a un grupo de pasanaku mediante su código de invitación.
    Valida unicidad, estado borrador y disponibilidad de cupos.
    """
    clean_code = invite_code.strip().upper()
    group = PasanakuGroup.objects.filter(invite_code=clean_code).first()

    if not group:
        raise ValidationError({'invite_code': 'El código de invitación no es válido o no existe.'})

    # Regla: No unirse si el grupo ya arrancó
    if group.status != GroupStatus.BORRADOR:
        raise ValidationError('No puedes unirte a un grupo que ya ha sido iniciado o finalizado.')

    # Regla del PDF: Un usuario no podrá pertenecer dos veces al mismo grupo.
    if GroupMembership.objects.filter(group=group, user=user).exists():
        raise ValidationError({'user': 'Ya eres parte de este grupo de pasanaku.'})

    # Regla: Verificar cupos disponibles
    if group.is_full:
        raise ValidationError({
            'group': f'El grupo ya completó el cupo acordado de {group.total_members} participantes.'
        })

    membership = GroupMembership.objects.create(
        group=group,
        user=user,
        role=MembershipRole.PARTICIPANTE
    )

    return membership


@transaction.atomic
def group_regenerate_invite_code(
    *,
    group: PasanakuGroup,
    user: User
) -> str:
    """Genera un nuevo código de invitación para el grupo (solo Admin y solo en BORRADOR)."""
    membership = GroupMembership.objects.filter(group=group, user=user).first()
    if not membership or membership.role != MembershipRole.ADMIN:
        raise PermissionDenied('Solo el administrador del grupo puede regenerar el código de invitación.')

    if group.status != GroupStatus.BORRADOR:
        raise ValidationError('No se puede cambiar el código de un grupo que ya inició.')

    new_code = generate_invite_code()
    group.invite_code = new_code
    group.save(update_fields=['invite_code', 'updated_at'])
    return new_code


@transaction.atomic
def group_leave(
    *,
    group: PasanakuGroup,
    user: User
) -> None:
    """
    Permite a un participante retirarse del grupo en estado BORRADOR.
    Regla del PDF: Una vez iniciado el pasanaku, un participante no podrá retirarse libremente.
    """
    membership = GroupMembership.objects.filter(group=group, user=user).first()
    if not membership:
        raise ValidationError('No eres miembro de este grupo.')

    if group.status != GroupStatus.BORRADOR:
        raise ValidationError('Una vez iniciado el pasanaku, ningún participante puede retirarse libremente.')

    # Si es el administrador creador
    if membership.role == MembershipRole.ADMIN:
        admin_count = group.memberships.filter(role=MembershipRole.ADMIN).count()
        if admin_count <= 1 and group.memberships.count() > 1:
            raise ValidationError(
                'Eres el único administrador. Debes asignar otro administrador antes de salir.'
            )

    membership.delete()
