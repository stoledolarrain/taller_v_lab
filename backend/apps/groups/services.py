from decimal import Decimal
from datetime import date
from typing import Optional, Tuple
import random
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.authentication.models import User
from .models import (
    PasanakuGroup,
    GroupMembership,
    PasanakuTurn,
    Round,
    Contribution,
    GroupStatus,
    MembershipRole,
    RoundStatus,
    ContributionStatus,
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

    if start_date < timezone.localdate():
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
    membership = GroupMembership.objects.filter(group=group, user=user).first()
    if not membership or membership.role != MembershipRole.ADMIN:
        raise PermissionDenied('Solo el administrador del grupo puede modificar su configuración.')

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
        if start_date < timezone.localdate():
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

    if group.status != GroupStatus.BORRADOR:
        raise ValidationError('No puedes unirte a un grupo que ya ha sido iniciado o finalizado.')

    if GroupMembership.objects.filter(group=group, user=user).exists():
        raise ValidationError({'user': 'Ya eres parte de este grupo de pasanaku.'})

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

    if membership.role == MembershipRole.ADMIN:
        admin_count = group.memberships.filter(role=MembershipRole.ADMIN).count()
        if admin_count <= 1 and group.memberships.count() > 1:
            raise ValidationError(
                'Eres el único administrador. Debes asignar otro administrador antes de salir.'
            )

    # Si tenía un turno asignado en borrador, se elimina
    PasanakuTurn.objects.filter(group=group, user=user).delete()
    membership.delete()


@transaction.atomic
def group_remove_member(
    *,
    group: PasanakuGroup,
    admin_user: User,
    target_user_id: int
) -> None:
    """
    Permite al administrador remover a un participante mientras el grupo se encuentre en estado BORRADOR.
    """
    membership = GroupMembership.objects.filter(group=group, user=admin_user).first()
    if not membership or membership.role != MembershipRole.ADMIN:
        raise PermissionDenied('Solo el administrador del grupo puede remover integrantes.')

    if group.status != GroupStatus.BORRADOR:
        raise ValidationError('No se pueden remover integrantes de un grupo que ya fue iniciado.')

    target_membership = GroupMembership.objects.filter(group=group, user_id=target_user_id).first()
    if not target_membership:
        raise ValidationError('El usuario especificado no es miembro de este grupo.')

    if target_membership.user == group.creator:
        raise ValidationError('No se puede remover al creador del grupo.')

    PasanakuTurn.objects.filter(group=group, user=target_membership.user).delete()
    target_membership.delete()


@transaction.atomic
def turn_assign_manual(
    *,
    group: PasanakuGroup,
    admin_user: User,
    assignments: list[dict]
) -> list[PasanakuTurn]:
    """
    Asigna turnos manualmente a los participantes del pasanaku.
    Reglas del PDF:
    - Solo en estado BORRADOR y por el Administrador.
    - El grupo debe tener todos sus cupos completados antes de definir turnos.
    - Cada integrante debe aparecer exactamente una vez como beneficiario (1:1).
    - Los números de turno deben ser exactamente del 1 al N sin huecos ni repeticiones.
    """
    membership = GroupMembership.objects.filter(group=group, user=admin_user).first()
    if not membership or membership.role != MembershipRole.ADMIN:
        raise PermissionDenied('Solo el administrador del grupo puede organizar los turnos.')

    if group.status != GroupStatus.BORRADOR:
        raise ValidationError('No se pueden modificar los turnos de un grupo que ya ha sido iniciado.')

    if not group.is_full:
        faltantes = group.total_members - group.current_members_count
        raise ValidationError(
            f'Deben completarse los {group.total_members} cupos antes de organizar turnos. '
            f'Faltan {faltantes} participante(s).'
        )

    if len(assignments) != group.total_members:
        raise ValidationError(
            f'Debes asignar exactamente {group.total_members} turnos (se recibieron {len(assignments)}).'
        )

    expected_turn_numbers = set(range(1, group.total_members + 1))
    provided_turn_numbers = set()
    assigned_user_ids = set()

    valid_member_ids = set(group.memberships.values_list('user_id', flat=True))

    for item in assignments:
        u_id = item.get('user_id')
        t_num = item.get('turn_number')

        if u_id not in valid_member_ids:
            raise ValidationError(f'El usuario con ID {u_id} no es miembro de este grupo.')

        if u_id in assigned_user_ids:
            raise ValidationError(f'El usuario con ID {u_id} no puede tener asignado más de un turno.')

        if t_num in provided_turn_numbers:
            raise ValidationError(f'El número de turno {t_num} está duplicado.')

        assigned_user_ids.add(u_id)
        provided_turn_numbers.add(t_num)

    if provided_turn_numbers != expected_turn_numbers:
        raise ValidationError(
            f'Los números de turno deben cubrir exactamente del 1 al {group.total_members} sin huecos.'
        )

    if assigned_user_ids != valid_member_ids:
        raise ValidationError('Todos los miembros del grupo deben tener un turno asignado.')

    group.turns.all().delete()

    created_turns = [
        PasanakuTurn.objects.create(
            group=group,
            user_id=item['user_id'],
            turn_number=item['turn_number']
        )
        for item in sorted(assignments, key=lambda x: x['turn_number'])
    ]

    return created_turns


@transaction.atomic
def turn_raffle_auto(
    *,
    group: PasanakuGroup,
    admin_user: User
) -> list[PasanakuTurn]:
    """
    Sortea aleatoriamente los turnos entre todos los integrantes del pasanaku.
    Reglas del PDF:
    - Solo en estado BORRADOR y por el Administrador.
    - El grupo debe tener el cupo completo cubierto.
    - Distribuye los turnos del 1 al N de forma 1:1 equitativa y aleatoria.
    """
    membership = GroupMembership.objects.filter(group=group, user=admin_user).first()
    if not membership or membership.role != MembershipRole.ADMIN:
        raise PermissionDenied('Solo el administrador del grupo puede realizar el sorteo de turnos.')

    if group.status != GroupStatus.BORRADOR:
        raise ValidationError('No se pueden sortear los turnos de un grupo que ya inició.')

    if not group.is_full:
        faltantes = group.total_members - group.current_members_count
        raise ValidationError(
            f'El sorteo requiere que el grupo esté completo ({group.total_members} participantes). '
            f'Faltan {faltantes} participante(s).'
        )

    member_user_ids = list(group.memberships.values_list('user_id', flat=True))
    shuffled_user_ids = random.sample(member_user_ids, len(member_user_ids))

    group.turns.all().delete()

    created_turns = [
        PasanakuTurn.objects.create(
            group=group,
            user_id=user_id,
            turn_number=turn_number
        )
        for turn_number, user_id in enumerate(shuffled_user_ids, start=1)
    ]

    return created_turns


@transaction.atomic
def round_create(
    *,
    group: PasanakuGroup,
    round_number: int,
    beneficiary: User,
    start_date: date = None
) -> Round:
    """
    Crea una nueva ronda y genera automáticamente las cuotas individuales
    en estado PENDIENTE para todos los integrantes del grupo.
    """
    if start_date is None:
        start_date = timezone.localdate()

    round_obj = Round.objects.create(
        group=group,
        round_number=round_number,
        beneficiary=beneficiary,
        status=RoundStatus.ACTIVA,
        expected_amount=group.total_expected_per_round,
        start_date=start_date,
    )

    # Generar cuota para cada miembro del grupo
    memberships = group.memberships.select_related('user').all()
    for m in memberships:
        Contribution.objects.create(
            round=round_obj,
            user=m.user,
            amount=group.quota_amount,
            status=ContributionStatus.PENDIENTE
        )

    return round_obj


@transaction.atomic
def group_start(
    *,
    group: PasanakuGroup,
    admin_user: User
) -> PasanakuGroup:
    """
    Inicia oficialmente el pasanaku, congelando su configuración y sus turnos,
    y generando automáticamente la primera ronda y sus cuotas.
    """
    membership = GroupMembership.objects.filter(group=group, user=admin_user).first()
    if not membership or membership.role != MembershipRole.ADMIN:
        raise PermissionDenied('Solo el administrador del grupo puede iniciar el pasanaku.')

    if group.status != GroupStatus.BORRADOR:
        raise ValidationError(f'El grupo ya se encuentra en estado {group.status}.')

    if not group.is_full:
        faltantes = group.total_members - group.current_members_count
        raise ValidationError(
            f'El grupo no puede iniciar mientras existan posiciones necesarias sin participante. '
            f'Faltan {faltantes} participante(s) para completar los {group.total_members} cupos.'
        )

    if not group.has_all_turns_assigned:
        raise ValidationError(
            f'No se puede iniciar el pasanaku: todos los {group.total_members} turnos deben ser '
            f'asignados previamente (mediante asignación manual o sorteo).'
        )

    group.status = GroupStatus.INICIADO
    group.save(update_fields=['status', 'updated_at'])

    # Generar automáticamente la Ronda 1 con el beneficiario del Turno 1
    turn_1 = group.turns.select_related('user').get(turn_number=1)
    round_create(
        group=group,
        round_number=1,
        beneficiary=turn_1.user,
        start_date=group.start_date
    )

    return group


@transaction.atomic
def contribution_report_payment(
    *,
    contribution: Contribution,
    user: User,
    notes: str = ''
) -> Contribution:
    """
    Registra/reporta el pago de una cuota por parte del participante.
    """
    # Verificar que el usuario sea el titular del aporte o admin del grupo
    is_owner = contribution.user == user
    is_admin = GroupMembership.objects.filter(
        group=contribution.round.group,
        user=user,
        role=MembershipRole.ADMIN
    ).exists()

    if not (is_owner or is_admin or user.is_staff):
        raise PermissionDenied('No tienes autorización para reportar el pago de este aporte.')

    if not contribution.round.is_active:
        raise ValidationError('No se pueden registrar pagos en una ronda que ya fue cerrada.')

    if contribution.status == ContributionStatus.PAGADA:
        raise ValidationError('Esta cuota ya se encuentra registrada como PAGADA.')

    contribution.payment_date = timezone.now()
    if notes:
        contribution.notes = notes.strip()

    contribution.save(update_fields=['payment_date', 'notes', 'updated_at'])
    return contribution


@transaction.atomic
def contribution_validate_payment(
    *,
    contribution: Contribution,
    admin_user: User
) -> Contribution:
    """
    Valida un aporte cambiando su estado a PAGADA (solo Administrador).
    Registra fecha de validación y usuario que validó.
    """
    is_admin = GroupMembership.objects.filter(
        group=contribution.round.group,
        user=admin_user,
        role=MembershipRole.ADMIN
    ).exists()

    if not (is_admin or admin_user.is_staff):
        raise PermissionDenied('Solo el administrador del grupo puede validar aportes.')

    if not contribution.round.is_active:
        raise ValidationError('No se pueden validar aportes de una ronda que ya ha sido cerrada.')

    if contribution.status == ContributionStatus.PAGADA:
        raise ValidationError('Este aporte ya se encuentra validado y marcado como PAGADO.')

    now = timezone.now()
    contribution.status = ContributionStatus.PAGADA
    contribution.validation_date = now
    contribution.validated_by = admin_user
    if not contribution.payment_date:
        contribution.payment_date = now

    contribution.save(update_fields=['status', 'validation_date', 'validated_by', 'payment_date', 'updated_at'])
    return contribution


@transaction.atomic
def round_close_and_advance(
    *,
    round_obj: Round,
    admin_user: User
) -> Tuple[Round, Optional[Round]]:
    """
    Cierra la ronda actual y avanza a la siguiente ronda de forma atómica.
    Reglas críticas del negocio (PDF):
    1. Solo el administrador puede cerrar la ronda.
    2. La ronda debe estar ACTIVA.
    3. BLOQUEO POR DEUDA: Prohibido cerrar la ronda o avanzar mientras existan cuotas en PENDIENTE.
    4. Confirmar entrega del fondo acumulado al beneficiario.
    5. Cierra la ronda actual (bloqueando modificaciones futuras).
    6. Habilita/crea la siguiente ronda (Turno k+1).
    7. Si todos los turnos fueron cubiertos, marca el grupo como FINALIZADO.
    """
    group = round_obj.group

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=admin_user,
        role=MembershipRole.ADMIN
    ).exists()

    if not (is_admin or admin_user.is_staff):
        raise PermissionDenied('Solo el administrador del grupo puede cerrar rondas y avanzar turnos.')

    if not round_obj.is_active:
        raise ValidationError('Esta ronda ya se encuentra cerrada.')

    # Regla crítica: BLOQUEO POR DEUDA
    if round_obj.has_pending_contributions:
        pending_count = round_obj.contributions.filter(status=ContributionStatus.PENDIENTE).count()
        raise ValidationError(
            f'Bloqueo por deuda: No es posible cerrar la ronda ni avanzar al siguiente turno '
            f'porque existen {pending_count} cuota(s) en estado PENDIENTE.'
        )

    # Confirmar entrega al beneficiario y cerrar ronda
    now = timezone.now()
    round_obj.delivered_to_beneficiary = True
    round_obj.delivered_at = now
    round_obj.status = RoundStatus.CERRADA
    round_obj.closed_at = now
    round_obj.save(update_fields=[
        'delivered_to_beneficiary',
        'delivered_at',
        'status',
        'closed_at',
        'updated_at'
    ])

    next_round: Optional[Round] = None

    # Verificar si quedan turnos pendientes
    if round_obj.round_number < group.total_members:
        next_round_number = round_obj.round_number + 1
        next_turn = group.turns.select_related('user').get(turn_number=next_round_number)

        next_round = round_create(
            group=group,
            round_number=next_round_number,
            beneficiary=next_turn.user,
            start_date=timezone.localdate()
        )
    else:
        # Todos los turnos han sido completados y cerrados
        group.status = GroupStatus.FINALIZADO
        group.save(update_fields=['status', 'updated_at'])

    return round_obj, next_round
