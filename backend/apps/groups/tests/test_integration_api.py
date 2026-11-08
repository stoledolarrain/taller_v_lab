from decimal import Decimal
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

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


class PasanakuIntegrationAPITests(APITestCase):
    """
    Pruebas de integración de la API REST de Pasanaku Digital (PDF Sección 12).
    Evalúan la interacción API <-> base de datos, reglas de negocio y permisos.
    """

    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin_test', email='admin@test.com', password='Password123!',
            first_name='Admin', last_name='User', ci='1111111 LP', phone_number='71111111'
        )
        self.user_2 = User.objects.create_user(
            username='user2_test', email='user2@test.com', password='Password123!',
            first_name='User', last_name='Two', ci='2222222 SC', phone_number='72222222'
        )
        self.user_3 = User.objects.create_user(
            username='user3_test', email='user3@test.com', password='Password123!',
            first_name='User', last_name='Three', ci='3333333 CB', phone_number='73333333'
        )
        self.outsider = User.objects.create_user(
            username='outsider_test', email='outsider@test.com', password='Password123!',
            first_name='Outsider', last_name='User', ci='9999999 LP', phone_number='79999999'
        )

    # ------------------------------------------------------------------ helpers
    def _auth(self, user: User):
        """Autentica las peticiones del cliente usando SimpleJWT."""
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def _clear_auth(self):
        self.client.credentials()

    def _create_group_via_api(self, total_members=3):
        self._auth(self.admin_user)
        response = self.client.post('/api/v1/groups/', {
            'name': 'Pasanaku Integración',
            'description': 'Grupo de pruebas',
            'quota_amount': '100.00',
            'periodicity': Periodicity.MENSUAL,
            'start_date': (timezone.now().date() + timedelta(days=7)).isoformat(),
            'total_members': total_members,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return PasanakuGroup.objects.get(id=response.data['group']['id'])

    def _create_full_group(self):
        """Crea un grupo de 3 integrantes con cupos llenos (en BORRADOR)."""
        group = self._create_group_via_api(total_members=3)
        for user in (self.user_2, self.user_3):
            self._auth(user)
            response = self.client.post(
                '/api/v1/groups/join/', {'invite_code': group.invite_code}, format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return group

    def _create_started_group(self):
        """Crea un grupo lleno, sortea turnos e inicia el pasanaku."""
        group = self._create_full_group()
        self._auth(self.admin_user)
        response = self.client.post(f'/api/v1/groups/{group.id}/turns/raffle/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        response = self.client.post(f'/api/v1/groups/{group.id}/start/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        group.refresh_from_db()
        return group

    # -------------------------------------------------------------------- tests
    def test_01_user_creation_and_persistence(self):
        payload = {
            'username': 'nuevo_user',
            'email': 'nuevo@test.com',
            'password': 'Password123!',
            'first_name': 'Nuevo',
            'last_name': 'Usuario',
            'ci': '4444444 OR',
            'phone_number': '74444444',
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = User.objects.get(username='nuevo_user')
        self.assertEqual(user.email, 'nuevo@test.com')
        self.assertEqual(user.ci, '4444444 OR')
        self.assertEqual(user.phone_number, '74444444')
        self.assertNotEqual(user.password, 'Password123!')
        self.assertTrue(user.check_password('Password123!'))

    def test_02_group_creation_and_configuration_retrieval(self):
        group = self._create_group_via_api(total_members=3)

        self.assertEqual(group.status, GroupStatus.BORRADOR)
        self.assertTrue(group.invite_code)
        membership = GroupMembership.objects.get(group=group, user=self.admin_user)
        self.assertEqual(membership.role, MembershipRole.ADMIN)

        response = self.client.get(f'/api/v1/groups/{group.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], GroupStatus.BORRADOR)
        self.assertEqual(response.data['invite_code'], group.invite_code)
        self.assertEqual(Decimal(str(response.data['quota_amount'])), Decimal('100.00'))
        self.assertEqual(response.data['total_members'], 3)

    def test_03_join_participants_via_invite_code(self):
        group = self._create_group_via_api(total_members=3)
        self.assertEqual(group.remaining_slots, 2)

        self._auth(self.user_2)
        response = self.client.post(
            '/api/v1/groups/join/', {'invite_code': group.invite_code}, format='json'
        )
        # La API responde 200 OK al unirse (la membresía se crea en BD).
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['group']['remaining_slots'], 1)
        membership = GroupMembership.objects.get(group=group, user=self.user_2)
        self.assertEqual(membership.role, MembershipRole.PARTICIPANTE)

        self._auth(self.user_3)
        response = self.client.post(
            '/api/v1/groups/join/', {'invite_code': group.invite_code}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['group']['remaining_slots'], 0)
        self.assertTrue(response.data['group']['is_full'])
        self.assertEqual(group.memberships.count(), 3)

    def test_04_turn_generation_and_persistence(self):
        group = self._create_full_group()
        self._auth(self.admin_user)

        response = self.client.post(f'/api/v1/groups/{group.id}/turns/raffle/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        turns = PasanakuTurn.objects.filter(group=group)
        self.assertEqual(turns.count(), 3)
        self.assertEqual(sorted(t.turn_number for t in turns), [1, 2, 3])
        self.assertEqual(len({t.user_id for t in turns}), 3)
        member_ids = set(group.memberships.values_list('user_id', flat=True))
        self.assertEqual({t.user_id for t in turns}, member_ids)

    def test_05_automatic_contribution_generation_on_round_creation(self):
        group = self._create_full_group()
        self._auth(self.admin_user)
        self.client.post(f'/api/v1/groups/{group.id}/turns/raffle/', {}, format='json')

        response = self.client.post(f'/api/v1/groups/{group.id}/start/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        group.refresh_from_db()
        self.assertEqual(group.status, GroupStatus.INICIADO)
        round_1 = Round.objects.get(group=group, round_number=1)
        self.assertEqual(round_1.status, RoundStatus.ACTIVA)
        contributions = Contribution.objects.filter(round=round_1)
        self.assertEqual(contributions.count(), 3)
        self.assertTrue(all(c.status == ContributionStatus.PENDIENTE for c in contributions))
        self.assertEqual(round_1.expected_amount, Decimal('300.00'))

    def test_06_report_and_validate_contribution(self):
        group = self._create_started_group()
        contribution = Contribution.objects.get(
            round__group=group, round__round_number=1, user=self.user_2
        )

        self._auth(self.user_2)
        response = self.client.post(
            f'/api/v1/contributions/{contribution.id}/pay/', {'notes': 'Pago vía QR'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        contribution.refresh_from_db()
        self.assertIsNotNone(contribution.payment_date)

        self._auth(self.admin_user)
        response = self.client.post(
            f'/api/v1/contributions/{contribution.id}/validate/', {}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        contribution.refresh_from_db()
        self.assertEqual(contribution.status, ContributionStatus.PAGADA)
        self.assertEqual(contribution.validated_by, self.admin_user)
        self.assertIsNotNone(contribution.validation_date)

    def test_07_query_pending_debtors_and_financial_balance(self):
        group = self._create_started_group()
        paid = Contribution.objects.get(round__group=group, round__round_number=1, user=self.user_2)
        self._auth(self.admin_user)
        self.client.post(f'/api/v1/contributions/{paid.id}/validate/', {}, format='json')

        response = self.client.get(f'/api/v1/groups/{group.id}/summary/')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        current = response.data['current_round']
        self.assertEqual(Decimal(str(current['expected_amount'])), Decimal('300.00'))
        self.assertEqual(Decimal(str(current['total_collected'])), Decimal('100.00'))
        self.assertEqual(Decimal(str(current['total_pending'])), Decimal('200.00'))
        self.assertTrue(current['has_pending_contributions'])
        debtor_ids = {d['user_id'] for d in current['debtors']}
        self.assertEqual(debtor_ids, {self.admin_user.id, self.user_3.id})
        self.assertNotIn(self.user_2.id, debtor_ids)

    def test_08_reject_closing_incomplete_round_debt_lock(self):
        group = self._create_started_group()
        round_1 = Round.objects.get(group=group, round_number=1)
        paid = Contribution.objects.get(round=round_1, user=self.user_2)
        self._auth(self.admin_user)
        self.client.post(f'/api/v1/contributions/{paid.id}/validate/', {}, format='json')

        response = self.client.post(f'/api/v1/rounds/{round_1.id}/close/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('bloqueo por deuda', str(response.data).lower())
        round_1.refresh_from_db()
        self.assertEqual(round_1.status, RoundStatus.ACTIVA)
        self.assertFalse(Round.objects.filter(group=group, round_number=2).exists())

    def test_09_close_completed_round_and_activate_next_round(self):
        group = self._create_started_group()
        round_1 = Round.objects.get(group=group, round_number=1)
        self._auth(self.admin_user)
        for contribution in round_1.contributions.all():
            response = self.client.post(
                f'/api/v1/contributions/{contribution.id}/validate/', {}, format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        response = self.client.post(f'/api/v1/rounds/{round_1.id}/close/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        round_1.refresh_from_db()
        self.assertEqual(round_1.status, RoundStatus.CERRADA)
        self.assertTrue(round_1.delivered_to_beneficiary)
        round_2 = Round.objects.get(group=group, round_number=2)
        self.assertEqual(round_2.status, RoundStatus.ACTIVA)
        turn_2 = PasanakuTurn.objects.get(group=group, turn_number=2)
        self.assertEqual(round_2.beneficiary, turn_2.user)
        self.assertEqual(round_2.contributions.count(), 3)
        self.assertTrue(
            all(c.status == ContributionStatus.PENDIENTE for c in round_2.contributions.all())
        )

    def test_10_permission_denied_participant_cannot_perform_admin_actions(self):
        group = self._create_full_group()
        self._auth(self.user_2)

        # Grupo en BORRADOR: acciones de admin sobre turnos e inicio
        response = self.client.post(f'/api/v1/groups/{group.id}/start/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self.client.post(f'/api/v1/groups/{group.id}/turns/raffle/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Grupo iniciado: validar aportes y cerrar rondas
        self._auth(self.admin_user)
        self.client.post(f'/api/v1/groups/{group.id}/turns/raffle/', {}, format='json')
        self.client.post(f'/api/v1/groups/{group.id}/start/', {}, format='json')
        round_1 = Round.objects.get(group=group, round_number=1)
        contribution = round_1.contributions.get(user=self.user_3)

        self._auth(self.user_2)
        response = self.client.post(
            f'/api/v1/contributions/{contribution.id}/validate/', {}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self.client.post(f'/api/v1/rounds/{round_1.id}/close/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        contribution.refresh_from_db()
        round_1.refresh_from_db()
        self.assertEqual(contribution.status, ContributionStatus.PENDIENTE)
        self.assertEqual(round_1.status, RoundStatus.ACTIVA)

    def test_11_isolation_check_non_member_cannot_view_group_data(self):
        group = self._create_started_group()
        self._auth(self.outsider)

        for url in (
            f'/api/v1/groups/{group.id}/',
            f'/api/v1/groups/{group.id}/rounds/current/',
            f'/api/v1/groups/{group.id}/summary/',
        ):
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, url)

        self._clear_auth()
        response = self.client.get(f'/api/v1/groups/{group.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
