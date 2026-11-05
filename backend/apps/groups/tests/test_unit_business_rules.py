from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.db import IntegrityError
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.authentication.models import User
from apps.groups.models import (
    PasanakuGroup,
    GroupMembership,
    PasanakuTurn,
    Round,
    Contribution,
    GroupStatus,
    MembershipRole,
    RoundStatus,
    ContributionStatus,
    Periodicity,
)
from apps.groups.services import (
    group_create,
    group_update,
    group_join_by_code,
    group_leave,
    group_remove_member,
    turn_assign_manual,
    turn_raffle_auto,
    group_start,
    round_create,
    contribution_validate_payment,
    round_close_and_advance,
)


class PasanakuUnitBusinessRulesTests(TestCase):
    """
    Pruebas unitarias de reglas de negocio para Pasanaku Digital.
    Cubre exhaustiva y rigurosamente los 10 puntos exigidos en la Sección 11 del PDF:
      1. Cálculo del monto total esperado por ronda (cuota * miembros).
      2. Generación de turnos según cantidad de participantes.
      3. Evitar participantes duplicados en el mismo grupo.
      4. Asignación correcta de turnos: cada participante recibe exactamente un turno (1:1).
      5. Validar que no se permitan aportes con montos inválidos (<= 0).
      6. Determinar si una ronda tiene aportes pendientes de pago.
      7. Evitar el cierre de una ronda si existen aportes pendientes (bloqueo por deuda).
      8. Evitar el avance de turno si la ronda actual no ha sido cerrada.
      9. Determinar cuándo un pasanaku puede cambiar a estado FINALIZADO.
      10. Validar reglas de modificación cuando el grupo ya está INICIADO (inmutabilidad).
    """

    def setUp(self):
        """Prepara usuarios de prueba recurrentes."""
        self.creator = User.objects.create_user(
            username='admin_creator',
            email='admin@pasanaku.bo',
            password='password123',
            first_name='Carlos',
            last_name='Administrador'
        )
        self.user2 = User.objects.create_user(
            username='user_maria',
            email='maria@pasanaku.bo',
            password='password123',
            first_name='Maria',
            last_name='Perez'
        )
        self.user3 = User.objects.create_user(
            username='user_juan',
            email='juan@pasanaku.bo',
            password='password123',
            first_name='Juan',
            last_name='Flores'
        )
        self.user4 = User.objects.create_user(
            username='user_lucia',
            email='lucia@pasanaku.bo',
            password='password123',
            first_name='Lucia',
            last_name='Torres'
        )

    def _create_standard_group(self, total_members=4, quota_amount=Decimal('500.00')) -> PasanakuGroup:
        """Helper para instanciar un grupo estándar en estado BORRADOR con su creador."""
        return group_create(
            creator=self.creator,
            name='Ahorro Amigos 2026',
            quota_amount=quota_amount,
            periodicity=Periodicity.MENSUAL,
            start_date=timezone.localdate() + timedelta(days=5),
            total_members=total_members,
            description='Grupo de ahorro solidario mensual'
        )

    # -------------------------------------------------------------------------
    # 1. Cálculo del monto total esperado por ronda (cuota * miembros)
    # -------------------------------------------------------------------------
    def test_01_total_expected_amount_calculation(self):
        """Verifica que el monto esperado por ronda sea exactamente cuota * número de participantes."""
        group = self._create_standard_group(total_members=4, quota_amount=Decimal('500.00'))
        
        # Invariante a nivel de modelo PasanakuGroup
        self.assertEqual(group.total_expected_per_round, Decimal('2000.00'))

        # Invariante a nivel de Round generada
        round_obj = round_create(
            group=group,
            round_number=1,
            beneficiary=self.creator
        )
        self.assertEqual(round_obj.expected_amount, Decimal('2000.00'))
        
        # Con cuotas decimales arbitrarias (ej. 333.33 * 3 = 999.99)
        group_decimals = self._create_standard_group(total_members=3, quota_amount=Decimal('333.33'))
        self.assertEqual(group_decimals.total_expected_per_round, Decimal('999.99'))

    # -------------------------------------------------------------------------
    # 2. Generación de turnos según cantidad de participantes
    # -------------------------------------------------------------------------
    def test_02_turn_generation_count_matches_members_manual_and_raffle(self):
        """Verifica que la cantidad de turnos generados coincida exactamente con el cupo de participantes."""
        group = self._create_standard_group(total_members=3)
        group_join_by_code(user=self.user2, invite_code=group.invite_code)
        group_join_by_code(user=self.user3, invite_code=group.invite_code)

        # Asignación manual
        assignments = [
            {'user_id': self.creator.id, 'turn_number': 1},
            {'user_id': self.user2.id, 'turn_number': 2},
            {'user_id': self.user3.id, 'turn_number': 3},
        ]
        manual_turns = turn_assign_manual(group=group, admin_user=self.creator, assignments=assignments)
        self.assertEqual(len(manual_turns), 3)
        self.assertEqual(group.turns.count(), 3)
        self.assertEqual(list(group.turns.values_list('turn_number', flat=True)), [1, 2, 3])

        # Sorteo aleatorio (reemplaza turnos garantizando la misma cantidad)
        raffle_turns = turn_raffle_auto(group=group, admin_user=self.creator)
        self.assertEqual(len(raffle_turns), 3)
        self.assertEqual(group.turns.count(), 3)
        self.assertEqual(set(group.turns.values_list('turn_number', flat=True)), {1, 2, 3})
        assigned_user_ids = set(group.turns.values_list('user_id', flat=True))
        self.assertEqual(assigned_user_ids, {self.creator.id, self.user2.id, self.user3.id})

    # -------------------------------------------------------------------------
    # 3. Evitar participantes duplicados en el mismo grupo
    # -------------------------------------------------------------------------
    def test_03_prevent_duplicate_participant_in_group(self):
        """Verifica que un participante no pueda ser registrado más de una vez en el mismo grupo."""
        group = self._create_standard_group(total_members=3)

        # El creador ya es miembro: intentar unirse de nuevo debe lanzar ValidationError
        with self.assertRaises(ValidationError) as ctx:
            group_join_by_code(user=self.creator, invite_code=group.invite_code)
        self.assertIn('Ya eres parte de este grupo', str(ctx.exception))

        # Unirse como participante una vez
        group_join_by_code(user=self.user2, invite_code=group.invite_code)

        # Intentar unirse por segunda vez
        with self.assertRaises(ValidationError) as ctx:
            group_join_by_code(user=self.user2, invite_code=group.invite_code)
        self.assertIn('Ya eres parte de este grupo', str(ctx.exception))

        # Restricción a nivel de base de datos (UniqueConstraint)
        with self.assertRaises(IntegrityError):
            GroupMembership.objects.create(group=group, user=self.user2, role=MembershipRole.PARTICIPANTE)

    # -------------------------------------------------------------------------
    # 4. Asignación correcta de turnos: cada participante recibe exactamente un turno (1:1)
    # -------------------------------------------------------------------------
    def test_04_turn_assignment_strict_one_to_one_rules(self):
        """Verifica que cada integrante aparezca exactamente una vez (1:1) del turno 1 a N sin huecos ni repeticiones."""
        group = self._create_standard_group(total_members=3)
        group_join_by_code(user=self.user2, invite_code=group.invite_code)
        group_join_by_code(user=self.user3, invite_code=group.invite_code)

        # Intento A: Usuario con más de un turno asignado
        bad_assignment_duplicate_user = [
            {'user_id': self.creator.id, 'turn_number': 1},
            {'user_id': self.creator.id, 'turn_number': 2},
            {'user_id': self.user3.id, 'turn_number': 3},
        ]
        with self.assertRaises(ValidationError) as ctx:
            turn_assign_manual(group=group, admin_user=self.creator, assignments=bad_assignment_duplicate_user)
        self.assertIn('no puede tener asignado más de un turno', str(ctx.exception))

        # Intento B: Números de turno duplicados
        bad_assignment_duplicate_turn = [
            {'user_id': self.creator.id, 'turn_number': 1},
            {'user_id': self.user2.id, 'turn_number': 1},
            {'user_id': self.user3.id, 'turn_number': 3},
        ]
        with self.assertRaises(ValidationError) as ctx:
            turn_assign_manual(group=group, admin_user=self.creator, assignments=bad_assignment_duplicate_turn)
        self.assertIn('está duplicado', str(ctx.exception))

        # Intento C: Turnos con saltos o huecos (ej: [1, 2, 4] para 3 integrantes)
        bad_assignment_gaps = [
            {'user_id': self.creator.id, 'turn_number': 1},
            {'user_id': self.user2.id, 'turn_number': 2},
            {'user_id': self.user3.id, 'turn_number': 4},
        ]
        with self.assertRaises(ValidationError) as ctx:
            turn_assign_manual(group=group, admin_user=self.creator, assignments=bad_assignment_gaps)
        self.assertIn('deben cubrir exactamente del 1 al 3', str(ctx.exception))

        # Intento D: Integrante faltante (menos turnos que total_members)
        bad_assignment_missing = [
            {'user_id': self.creator.id, 'turn_number': 1},
            {'user_id': self.user2.id, 'turn_number': 2},
        ]
        with self.assertRaises(ValidationError) as ctx:
            turn_assign_manual(group=group, admin_user=self.creator, assignments=bad_assignment_missing)
        self.assertIn('Debes asignar exactamente 3 turnos', str(ctx.exception))

        # Asignación correcta 1:1
        valid_assignments = [
            {'user_id': self.creator.id, 'turn_number': 2},
            {'user_id': self.user2.id, 'turn_number': 1},
            {'user_id': self.user3.id, 'turn_number': 3},
        ]
        turns = turn_assign_manual(group=group, admin_user=self.creator, assignments=valid_assignments)
        self.assertEqual(len(turns), 3)
        self.assertTrue(group.has_all_turns_assigned)

    # -------------------------------------------------------------------------
    # 5. Validar que no se permitan aportes con montos inválidos (<= 0)
    # -------------------------------------------------------------------------
    def test_05_prevent_invalid_quota_and_contribution_amounts(self):
        """Verifica que el sistema rechace montos de cuota o aportes menores o iguales a cero."""
        # Monto 0 en creación de grupo
        with self.assertRaises(ValidationError) as ctx:
            group_create(
                creator=self.creator,
                name='Invalido Zero',
                quota_amount=Decimal('0.00'),
                periodicity=Periodicity.MENSUAL,
                start_date=timezone.localdate() + timedelta(days=1),
                total_members=3
            )
        self.assertIn('El monto de la cuota debe ser mayor a 0', str(ctx.exception))

        # Monto negativo en creación de grupo
        with self.assertRaises(ValidationError) as ctx:
            group_create(
                creator=self.creator,
                name='Invalido Negativo',
                quota_amount=Decimal('-150.00'),
                periodicity=Periodicity.MENSUAL,
                start_date=timezone.localdate() + timedelta(days=1),
                total_members=3
            )
        self.assertIn('El monto de la cuota debe ser mayor a 0', str(ctx.exception))

        # Monto <= 0 en actualización de grupo
        group = self._create_standard_group(total_members=3, quota_amount=Decimal('100.00'))
        with self.assertRaises(ValidationError) as ctx:
            group_update(group=group, user=self.creator, quota_amount=Decimal('0.00'))
        self.assertIn('El monto de la cuota debe ser mayor a 0', str(ctx.exception))

        # Monto inválido a nivel de modelo Contribution
        round_obj = round_create(group=group, round_number=1, beneficiary=self.creator)
        invalid_contribution = Contribution(
            round=round_obj,
            user=self.creator,
            amount=Decimal('0.00'),
            status=ContributionStatus.PENDIENTE
        )
        with self.assertRaises(DjangoValidationError):
            invalid_contribution.full_clean()

    # -------------------------------------------------------------------------
    # 6. Determinar si una ronda tiene aportes pendientes de pago
    # -------------------------------------------------------------------------
    def test_06_round_pending_contributions_determination(self):
        """Verifica el cálculo de cuotas pendientes y acumuladas en una ronda."""
        group = self._create_standard_group(total_members=3, quota_amount=Decimal('200.00'))
        group_join_by_code(user=self.user2, invite_code=group.invite_code)
        group_join_by_code(user=self.user3, invite_code=group.invite_code)

        round_obj = round_create(group=group, round_number=1, beneficiary=self.creator)

        # Estado inicial: los 3 integrantes tienen aporte PENDIENTE
        self.assertTrue(round_obj.has_pending_contributions)
        self.assertEqual(round_obj.total_pending, Decimal('600.00'))
        self.assertEqual(round_obj.total_collected, Decimal('0.00'))

        # Pago del primer integrante
        c1 = round_obj.contributions.get(user=self.creator)
        contribution_validate_payment(contribution=c1, admin_user=self.creator)

        round_obj.refresh_from_db()
        self.assertTrue(round_obj.has_pending_contributions)
        self.assertEqual(round_obj.total_pending, Decimal('400.00'))
        self.assertEqual(round_obj.total_collected, Decimal('200.00'))

        # Pago de los restantes dos integrantes
        c2 = round_obj.contributions.get(user=self.user2)
        c3 = round_obj.contributions.get(user=self.user3)
        contribution_validate_payment(contribution=c2, admin_user=self.creator)
        contribution_validate_payment(contribution=c3, admin_user=self.creator)

        round_obj.refresh_from_db()
        # Ya no hay aportes pendientes
        self.assertFalse(round_obj.has_pending_contributions)
        self.assertEqual(round_obj.total_pending, Decimal('0.00'))
        self.assertEqual(round_obj.total_collected, Decimal('600.00'))

    # -------------------------------------------------------------------------
    # 7. Evitar el cierre de una ronda si existen aportes pendientes (bloqueo por deuda)
    # -------------------------------------------------------------------------
    def test_07_prevent_closing_round_with_pending_contributions(self):
        """Bloqueo por deuda: Prohibido cerrar la ronda o avanzar mientras existan cuotas en PENDIENTE."""
        group = self._create_standard_group(total_members=2, quota_amount=Decimal('300.00'))
        group_join_by_code(user=self.user2, invite_code=group.invite_code)

        # Sorteo e inicio del pasanaku
        turn_raffle_auto(group=group, admin_user=self.creator)
        group_start(group=group, admin_user=self.creator)

        round_1 = group.rounds.get(round_number=1)
        self.assertTrue(round_1.has_pending_contributions)

        # Intento de cierre con cuotas pendientes debe ser rechazado
        with self.assertRaises(ValidationError) as ctx:
            round_close_and_advance(round_obj=round_1, admin_user=self.creator)
        self.assertIn('Bloqueo por deuda', str(ctx.exception))

        # La ronda debe continuar ACTIVA
        round_1.refresh_from_db()
        self.assertEqual(round_1.status, RoundStatus.ACTIVA)
        self.assertFalse(round_1.delivered_to_beneficiary)

    # -------------------------------------------------------------------------
    # 8. Evitar el avance de turno si la ronda actual no ha sido cerrada
    # -------------------------------------------------------------------------
    def test_08_prevent_advancing_turn_before_round_closure(self):
        """Verifica que no sea posible generar la siguiente ronda ni avanzar turnos sin cerrar la ronda activa."""
        group = self._create_standard_group(total_members=2, quota_amount=Decimal('100.00'))
        group_join_by_code(user=self.user2, invite_code=group.invite_code)

        assignments = [
            {'user_id': self.creator.id, 'turn_number': 1},
            {'user_id': self.user2.id, 'turn_number': 2},
        ]
        turn_assign_manual(group=group, admin_user=self.creator, assignments=assignments)
        group_start(group=group, admin_user=self.creator)

        round_1 = group.rounds.get(round_number=1)
        # Ronda 2 no debe existir aún
        self.assertFalse(group.rounds.filter(round_number=2).exists())

        # No se puede intentar cerrar una ronda que ya fue cerrada
        for contrib in round_1.contributions.all():
            contribution_validate_payment(contribution=contrib, admin_user=self.creator)
        
        closed_r1, next_r2 = round_close_and_advance(round_obj=round_1, admin_user=self.creator)
        self.assertEqual(closed_r1.status, RoundStatus.CERRADA)
        self.assertIsNotNone(next_r2)
        self.assertEqual(next_r2.round_number, 2)

        # Intentar cerrar nuevamente la ronda 1 cerrada debe fallar
        with self.assertRaises(ValidationError) as ctx:
            round_close_and_advance(round_obj=closed_r1, admin_user=self.creator)
        self.assertIn('ya se encuentra cerrada', str(ctx.exception))

    # -------------------------------------------------------------------------
    # 9. Determinar cuándo un pasanaku puede cambiar a estado FINALIZADO
    # -------------------------------------------------------------------------
    def test_09_transition_to_finalizado_when_all_rounds_completed(self):
        """Verifica que el grupo pase a FINALIZADO únicamente tras completar el último turno/ronda."""
        group = self._create_standard_group(total_members=2, quota_amount=Decimal('400.00'))
        group_join_by_code(user=self.user2, invite_code=group.invite_code)

        assignments = [
            {'user_id': self.creator.id, 'turn_number': 1},
            {'user_id': self.user2.id, 'turn_number': 2},
        ]
        turn_assign_manual(group=group, admin_user=self.creator, assignments=assignments)
        group_start(group=group, admin_user=self.creator)
        self.assertEqual(group.status, GroupStatus.INICIADO)

        # Completar Ronda 1 de 2
        round_1 = group.rounds.get(round_number=1)
        for c in round_1.contributions.all():
            contribution_validate_payment(contribution=c, admin_user=self.creator)

        r1, r2 = round_close_and_advance(round_obj=round_1, admin_user=self.creator)
        group.refresh_from_db()
        # Aún faltan rondas: grupo sigue en INICIADO
        self.assertEqual(group.status, GroupStatus.INICIADO)
        self.assertIsNotNone(r2)
        self.assertEqual(r2.round_number, 2)

        # Completar Ronda 2 de 2 (última ronda)
        for c in r2.contributions.all():
            contribution_validate_payment(contribution=c, admin_user=self.creator)

        r2_closed, next_r = round_close_and_advance(round_obj=r2, admin_user=self.creator)
        group.refresh_from_db()

        # Al cubrir todos los turnos, pasa a FINALIZADO y no hay siguiente ronda
        self.assertEqual(r2_closed.status, RoundStatus.CERRADA)
        self.assertIsNone(next_r)
        self.assertEqual(group.status, GroupStatus.FINALIZADO)
        self.assertTrue(group.is_finished)

    # -------------------------------------------------------------------------
    # 10. Validar reglas de modificación cuando el grupo ya está INICIADO (inmutabilidad)
    # -------------------------------------------------------------------------
    def test_10_immutability_rules_when_group_is_iniciado(self):
        """
        Invariante de Negocio: En estado BORRADOR se puede modificar la configuración.
        Una vez en INICIADO, está estrictamente prohibido alterar la configuración,
        turnos, o membresías de participantes.
        """
        group = self._create_standard_group(total_members=2, quota_amount=Decimal('100.00'))
        group_join_by_code(user=self.user2, invite_code=group.invite_code)

        # En BORRADOR se permite actualizar
        group_update(group=group, user=self.creator, name='Nombre en Borrador', quota_amount=Decimal('150.00'))
        group.refresh_from_db()
        self.assertEqual(group.name, 'Nombre en Borrador')
        self.assertEqual(group.quota_amount, Decimal('150.00'))

        # Organizar turnos e iniciar pasanaku
        assignments = [
            {'user_id': self.creator.id, 'turn_number': 1},
            {'user_id': self.user2.id, 'turn_number': 2},
        ]
        turn_assign_manual(group=group, admin_user=self.creator, assignments=assignments)
        group_start(group=group, admin_user=self.creator)
        group.refresh_from_db()
        self.assertEqual(group.status, GroupStatus.INICIADO)

        # 1. Prohibido modificar configuración del grupo (cuota, nombre, cupos, periodicidad)
        with self.assertRaises(ValidationError) as ctx:
            group_update(group=group, user=self.creator, quota_amount=Decimal('300.00'))
        self.assertIn('el grupo se encuentra en estado INICIADO', str(ctx.exception))

        # 2. Prohibido alterar turnos manualmente una vez iniciado
        with self.assertRaises(ValidationError) as ctx:
            turn_assign_manual(group=group, admin_user=self.creator, assignments=assignments)
        self.assertIn('No se pueden modificar los turnos de un grupo que ya ha sido iniciado', str(ctx.exception))

        # 3. Prohibido sortear turnos una vez iniciado
        with self.assertRaises(ValidationError) as ctx:
            turn_raffle_auto(group=group, admin_user=self.creator)
        self.assertIn('No se pueden sortear los turnos de un grupo que ya inició', str(ctx.exception))

        # 4. Prohibido unirse a un grupo iniciado
        with self.assertRaises(ValidationError) as ctx:
            group_join_by_code(user=self.user3, invite_code=group.invite_code)
        self.assertIn('No puedes unirte a un grupo que ya ha sido iniciado', str(ctx.exception))

        # 5. Prohibido que un participante se retire libremente tras inicio
        with self.assertRaises(ValidationError) as ctx:
            group_leave(group=group, user=self.user2)
        self.assertIn('ningún participante puede retirarse libremente', str(ctx.exception))

        # 6. Prohibido que el administrador remueva participantes tras inicio
        with self.assertRaises(ValidationError) as ctx:
            group_remove_member(group=group, admin_user=self.creator, target_user_id=self.user2.id)
        self.assertIn('No se pueden remover integrantes de un grupo que ya fue iniciado', str(ctx.exception))
