from decimal import Decimal
from datetime import timedelta
from unittest.mock import MagicMock

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound

from apps.authentication.models import User
from apps.groups.models import (
    PasanakuGroup,
    GroupMembership,
    PasanakuTurn,
    Round,
    Contribution,
    InternalReminder,
    GroupStatus,
    MembershipRole,
    RoundStatus,
    ContributionStatus,
    Periodicity,
)
from apps.groups.permissions import IsGroupMember, IsGroupAdmin
from apps.groups import selectors
from apps.groups.services import (
    group_create,
    group_update,
    group_regenerate_invite_code,
    group_join_by_code,
    group_leave,
    group_remove_member,
    turn_assign_manual,
    turn_raffle_auto,
    group_start,
    contribution_report_payment,
    contribution_validate_payment,
    round_close_and_advance,
    reminder_create_for_pending,
    reminder_mark_as_read,
)


class ServicesAndSelectorsUnitTests(TestCase):
    """
    Pruebas unitarias complementarias para agotar ramas de validación,
    selectores y permisos de dominio en Pasanaku Digital.
    """

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_unit', email='admin@unit.com', password='Password123!',
            first_name='Admin', last_name='Unit', ci='1000001 LP', phone_number='70000001'
        )
        self.member1 = User.objects.create_user(
            username='member1_unit', email='member1@unit.com', password='Password123!',
            first_name='Member', last_name='One', ci='1000002 LP', phone_number='70000002'
        )
        self.member2 = User.objects.create_user(
            username='member2_unit', email='member2@unit.com', password='Password123!',
            first_name='Member', last_name='Two', ci='1000003 LP', phone_number='70000003'
        )
        self.outsider = User.objects.create_user(
            username='outsider_unit', email='outsider@unit.com', password='Password123!',
            first_name='Outsider', last_name='Unit', ci='1000009 LP', phone_number='70000009'
        )

    def _create_sample_group(self, total_members=3):
        return group_create(
            creator=self.admin,
            name='Grupo Unit Test',
            quota_amount=Decimal('100.00'),
            periodicity=Periodicity.MENSUAL,
            start_date=timezone.localdate() + timedelta(days=7),
            total_members=total_members,
        )

    # -------------------------------------------------------------------------
    # Permisos (IsGroupMember, IsGroupAdmin)
    # -------------------------------------------------------------------------
    def test_permissions_is_group_member_and_admin(self):
        group = self._create_sample_group(total_members=2)
        perm_member = IsGroupMember()
        perm_admin = IsGroupAdmin()

        # Usuario anónimo o no autenticado
        req_anon = MagicMock(user=MagicMock(is_authenticated=False))
        self.assertFalse(perm_member.has_object_permission(req_anon, None, group))
        self.assertFalse(perm_admin.has_object_permission(req_anon, None, group))

        # Admin autenticado
        req_admin = MagicMock(user=self.admin)
        self.assertTrue(perm_member.has_object_permission(req_admin, None, group))
        self.assertTrue(perm_admin.has_object_permission(req_admin, None, group))

        # Participante autenticado
        group_join_by_code(user=self.member1, invite_code=group.invite_code)
        req_m1 = MagicMock(user=self.member1)
        self.assertTrue(perm_member.has_object_permission(req_m1, None, group))
        self.assertFalse(perm_admin.has_object_permission(req_m1, None, group))

        # Outsider
        req_out = MagicMock(user=self.outsider)
        self.assertFalse(perm_member.has_object_permission(req_out, None, group))
        self.assertFalse(perm_admin.has_object_permission(req_out, None, group))

    # -------------------------------------------------------------------------
    # Selectores
    # -------------------------------------------------------------------------
    def test_selectors_queries_and_exceptions(self):
        group = self._create_sample_group(total_members=2)
        group_join_by_code(user=self.member1, invite_code=group.invite_code)

        # group_get_by_id
        self.assertEqual(selectors.group_get_by_id(group_id=group.id, user=self.admin).id, group.id)
        with self.assertRaises(NotFound):
            selectors.group_get_by_id(group_id=999999, user=self.admin)
        with self.assertRaises(PermissionDenied):
            selectors.group_get_by_id(group_id=group.id, user=self.outsider)

        # group_get_by_invite_code
        found = selectors.group_get_by_invite_code(invite_code=group.invite_code)
        self.assertEqual(found.id, group.id)
        with self.assertRaises(NotFound):
            selectors.group_get_by_invite_code(invite_code='INVALID_CODE')

        # group_get_membership
        self.assertIsNotNone(selectors.group_get_membership(group=group, user=self.admin))
        self.assertIsNone(selectors.group_get_membership(group=group, user=self.outsider))

        # group_list_for_user
        groups_admin = selectors.group_list_for_user(user=self.admin)
        self.assertEqual(len(groups_admin), 1)

        # turn_list_for_group con permisos y outsider
        with self.assertRaises(PermissionDenied):
            selectors.turn_list_for_group(group=group, user=self.outsider)
        self.assertEqual(list(selectors.turn_list_for_group(group=group, user=self.admin)), [])

        # Iniciar grupo para tener rondas y aportes
        turn_raffle_auto(group=group, admin_user=self.admin)
        group_start(group=group, admin_user=self.admin)

        # round_list_for_group y round_get_current
        with self.assertRaises(PermissionDenied):
            selectors.round_list_for_group(group=group, user=self.outsider)
        self.assertEqual(len(selectors.round_list_for_group(group=group, user=self.admin)), 1)

        with self.assertRaises(PermissionDenied):
            selectors.round_get_current(group=group, user=self.outsider)
        r_curr = selectors.round_get_current(group=group, user=self.admin)
        self.assertIsNotNone(r_curr)

        # round_get_by_id y contribution_get_by_id
        self.assertEqual(selectors.round_get_by_id(round_id=r_curr.id, user=self.admin).id, r_curr.id)
        with self.assertRaises(NotFound):
            selectors.round_get_by_id(round_id=999999, user=self.admin)
        with self.assertRaises(PermissionDenied):
            selectors.round_get_by_id(round_id=r_curr.id, user=self.outsider)

        contrib = r_curr.contributions.first()
        self.assertEqual(selectors.contribution_get_by_id(contribution_id=contrib.id, user=self.admin).id, contrib.id)
        with self.assertRaises(NotFound):
            selectors.contribution_get_by_id(contribution_id=999999, user=self.admin)
        with self.assertRaises(PermissionDenied):
            selectors.contribution_get_by_id(contribution_id=contrib.id, user=self.outsider)

        # contribution_list_for_round
        with self.assertRaises(PermissionDenied):
            selectors.contribution_list_for_round(round_obj=r_curr, user=self.outsider)
        self.assertEqual(len(selectors.contribution_list_for_round(round_obj=r_curr, user=self.admin)), 2)

        # contribution_list_for_user
        c_list = selectors.contribution_list_for_user(user=self.admin, group_id=group.id)
        self.assertEqual(len(c_list), 1)

        # group_get_financial_summary
        with self.assertRaises(PermissionDenied):
            selectors.group_get_financial_summary(group=group, user=self.outsider)
        metrics = selectors.group_get_financial_summary(group=group, user=self.admin)
        self.assertEqual(metrics['total_members'], 2)

        # reminder_list_for_user
        rem_list = selectors.reminder_list_for_user(user=self.admin)
        self.assertEqual(len(rem_list), 0)

    # -------------------------------------------------------------------------
    # Servicios: Validaciones y Ramas Negativas
    # -------------------------------------------------------------------------
    def test_services_group_create_and_update_validations(self):
        # group_create total_members < 2
        with self.assertRaises(ValidationError):
            group_create(
                creator=self.admin, name='G', quota_amount=Decimal('10.00'),
                periodicity=Periodicity.SEMANAL, start_date=timezone.localdate(), total_members=1
            )

        # group_create start_date en pasado
        with self.assertRaises(ValidationError):
            group_create(
                creator=self.admin, name='G', quota_amount=Decimal('10.00'),
                periodicity=Periodicity.SEMANAL,
                start_date=timezone.localdate() - timedelta(days=2),
                total_members=3
            )

        group = self._create_sample_group(total_members=3)

        # group_update por no admin
        with self.assertRaises(PermissionDenied):
            group_update(group=group, user=self.outsider, name='Nuevo Nombre')

        # group_update con description, periodicity, start_date válido y total_members válido
        next_week = timezone.localdate() + timedelta(days=14)
        updated = group_update(
            group=group, user=self.admin,
            description='  Nueva Desc  ',
            periodicity=Periodicity.QUINCENAL,
            start_date=next_week,
            total_members=4
        )
        self.assertEqual(updated.description, 'Nueva Desc')
        self.assertEqual(updated.periodicity, Periodicity.QUINCENAL)
        self.assertEqual(updated.total_members, 4)

        # group_update start_date en pasado
        with self.assertRaises(ValidationError):
            group_update(group=group, user=self.admin, start_date=timezone.localdate() - timedelta(days=1))

        # group_update total_members < 2
        with self.assertRaises(ValidationError):
            group_update(group=group, user=self.admin, total_members=1)

        # group_update total_members menor que participantes actuales
        group_join_by_code(user=self.member1, invite_code=group.invite_code)
        group_join_by_code(user=self.member2, invite_code=group.invite_code)
        # Ya hay 3 miembros
        with self.assertRaises(ValidationError):
            group_update(group=group, user=self.admin, total_members=2)

    def test_services_invite_code_regenerate(self):
        group = self._create_sample_group(total_members=3)
        old_code = group.invite_code

        # Regenerar por no admin
        with self.assertRaises(PermissionDenied):
            group_regenerate_invite_code(group=group, user=self.outsider)

        # Regenerar exitosamente
        new_code = group_regenerate_invite_code(group=group, user=self.admin)
        self.assertNotEqual(old_code, new_code)

        # Regenerar tras inicio
        group_join_by_code(user=self.member1, invite_code=new_code)
        group_join_by_code(user=self.member2, invite_code=new_code)
        turn_raffle_auto(group=group, admin_user=self.admin)
        group_start(group=group, admin_user=self.admin)

        with self.assertRaises(ValidationError):
            group_regenerate_invite_code(group=group, user=self.admin)

    def test_services_group_leave_and_remove_member_edge_cases(self):
        group = self._create_sample_group(total_members=3)

        # group_leave usuario no miembro
        with self.assertRaises(ValidationError):
            group_leave(group=group, user=self.outsider)

        # group_leave admin creador único cuando hay otros miembros
        group_join_by_code(user=self.member1, invite_code=group.invite_code)
        with self.assertRaises(ValidationError):
            group_leave(group=group, user=self.admin)

        # group_leave miembro regular sale exitosamente
        group_leave(group=group, user=self.member1)
        self.assertFalse(group.memberships.filter(user=self.member1).exists())

        # group_remove_member por no admin
        with self.assertRaises(PermissionDenied):
            group_remove_member(group=group, admin_user=self.outsider, target_user_id=self.admin.id)

        # group_remove_member usuario no miembro
        with self.assertRaises(ValidationError):
            group_remove_member(group=group, admin_user=self.admin, target_user_id=self.outsider.id)

        # group_remove_member creador no puede ser removido
        with self.assertRaises(ValidationError):
            group_remove_member(group=group, admin_user=self.admin, target_user_id=self.admin.id)

        # group_remove_member exitoso
        group_join_by_code(user=self.member1, invite_code=group.invite_code)
        group_remove_member(group=group, admin_user=self.admin, target_user_id=self.member1.id)
        self.assertFalse(group.memberships.filter(user=self.member1).exists())

    def test_services_turns_and_start_edge_cases(self):
        group = self._create_sample_group(total_members=2)

        # turn_assign_manual y raffle por no admin
        with self.assertRaises(PermissionDenied):
            turn_assign_manual(group=group, admin_user=self.outsider, assignments=[])
        with self.assertRaises(PermissionDenied):
            turn_raffle_auto(group=group, admin_user=self.outsider)

        # Faltan integrantes
        with self.assertRaises(ValidationError):
            turn_raffle_auto(group=group, admin_user=self.admin)
        with self.assertRaises(ValidationError):
            turn_assign_manual(group=group, admin_user=self.admin, assignments=[])

        # Asignar turno con usuario no miembro
        group_join_by_code(user=self.member1, invite_code=group.invite_code)
        with self.assertRaises(ValidationError):
            turn_assign_manual(group=group, admin_user=self.admin, assignments=[
                {'user_id': self.admin.id, 'turn_number': 1},
                {'user_id': self.outsider.id, 'turn_number': 2},
            ])

        # Asignar turnos incompletos
        with self.assertRaises(ValidationError):
            turn_assign_manual(group=group, admin_user=self.admin, assignments=[
                {'user_id': self.admin.id, 'turn_number': 1},
            ])

        # group_start por no admin
        with self.assertRaises(PermissionDenied):
            group_start(group=group, admin_user=self.outsider)

        # group_start exitoso y luego intentar iniciar de nuevo
        turn_raffle_auto(group=group, admin_user=self.admin)
        group_start(group=group, admin_user=self.admin)

        with self.assertRaises(ValidationError):
            group_start(group=group, admin_user=self.admin)

    def test_services_payments_and_reminders_edge_cases(self):
        group = self._create_sample_group(total_members=2)
        group_join_by_code(user=self.member1, invite_code=group.invite_code)
        turn_raffle_auto(group=group, admin_user=self.admin)
        group_start(group=group, admin_user=self.admin)

        round_1 = group.rounds.get(round_number=1)
        contrib_admin = round_1.contributions.get(user=self.admin)
        contrib_m1 = round_1.contributions.get(user=self.member1)

        # contribution_report_payment por outsider
        with self.assertRaises(PermissionDenied):
            contribution_report_payment(contribution=contrib_m1, user=self.outsider)

        # contribution_validate_payment por no admin
        with self.assertRaises(PermissionDenied):
            contribution_validate_payment(contribution=contrib_admin, admin_user=self.outsider)

        # Validar pago exitosamente
        contribution_validate_payment(contribution=contrib_admin, admin_user=self.admin)

        # Pagar y validar aporte ya pagado
        with self.assertRaises(ValidationError):
            contribution_report_payment(contribution=contrib_admin, user=self.admin)
        with self.assertRaises(ValidationError):
            contribution_validate_payment(contribution=contrib_admin, admin_user=self.admin)

        # round_close_and_advance por no admin
        with self.assertRaises(PermissionDenied):
            round_close_and_advance(round_obj=round_1, admin_user=self.outsider)

        # Recordatorios: no admin
        with self.assertRaises(PermissionDenied):
            reminder_create_for_pending(group=group, admin_user=self.outsider, custom_message='Paga!')

        # Recordatorio exitoso
        reminders = reminder_create_for_pending(group=group, admin_user=self.admin, custom_message='Aviso de cuota')
        self.assertEqual(len(reminders), 1)
        self.assertEqual(reminders[0].recipient, self.member1)

        # Marcar recordatorio como leído
        rem = reminders[0]
        # Por usuario ajeno
        with self.assertRaises(NotFound):
            reminder_mark_as_read(reminder_id=rem.id, user=self.outsider)

        # Por su dueño
        read_rem = reminder_mark_as_read(reminder_id=rem.id, user=self.member1)
        self.assertTrue(read_rem.is_read)

        # Cerrar ronda y probar pagos/validaciones sobre ronda cerrada
        contribution_validate_payment(contribution=contrib_m1, admin_user=self.admin)
        round_close_and_advance(round_obj=round_1, admin_user=self.admin)

        # Intentar pagar y validar sobre ronda cerrada
        with self.assertRaises(ValidationError):
            contribution_report_payment(contribution=contrib_admin, user=self.admin)
        with self.assertRaises(ValidationError):
            contribution_validate_payment(contribution=contrib_admin, admin_user=self.admin)
