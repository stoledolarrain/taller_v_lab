from decimal import Decimal
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.authentication.models import User
from apps.groups.models import (
    PasanakuGroup,
    PasanakuTurn,
    Round,
    Contribution,
    GroupStatus,
    RoundStatus,
    ContributionStatus,
    Periodicity,
    InternalReminder,
)

PASSWORD = 'Password123!'


class PasanakuE2EFlowsTests(APITestCase):
    """
    Pruebas End-to-End (PDF Sección 13): ciclo de vida completo del pasanaku
    consumiendo exclusivamente la API REST con múltiples actores.
    """

    def setUp(self):
        self.clients = {}

    # ------------------------------------------------------------------ helpers
    def _register_and_login(self, key: str):
        """Registra un usuario vía API, inicia sesión y devuelve (user, client autenticado)."""
        n = len(self.clients) + 1
        payload = {
            'username': key,
            'email': f'{key}@test.com',
            'password': PASSWORD,
            'first_name': key.capitalize(),
            'last_name': 'E2E',
            'ci': f'{1000000 + n} LP',
            'phone_number': f'7{1000000 + n}',
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        response = self.client.post(
            '/api/v1/auth/login/', {'username_or_email': key, 'password': PASSWORD}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['tokens']['access']}")
        self.clients[key] = api
        return User.objects.get(username=key), api

    def _create_group(self, api, total_members=3, name='Pasanaku E2E'):
        response = api.post('/api/v1/groups/', {
            'name': name,
            'description': 'Flujo E2E',
            'quota_amount': '100.00',
            'periodicity': Periodicity.MENSUAL,
            'start_date': (timezone.now().date() + timedelta(days=7)).isoformat(),
            'total_members': total_members,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data['group']

    def _join(self, api, invite_code):
        response = api.post('/api/v1/groups/join/', {'invite_code': invite_code}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data['group']

    def _setup_full_group(self):
        """Admin + 2 participantes con cupos llenos (BORRADOR)."""
        self.admin, self.admin_api = self._register_and_login('admin_e2e')
        self.u2, self.u2_api = self._register_and_login('user2_e2e')
        self.u3, self.u3_api = self._register_and_login('user3_e2e')
        group_data = self._create_group(self.admin_api)
        self.group_id = group_data['id']
        self.invite_code = group_data['invite_code']
        self._join(self.u2_api, self.invite_code)
        self._join(self.u3_api, self.invite_code)
        return self.group_id

    def _setup_started_group(self):
        group_id = self._setup_full_group()
        response = self.admin_api.post(f'/api/v1/groups/{group_id}/turns/raffle/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        response = self.admin_api.post(f'/api/v1/groups/{group_id}/start/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return group_id

    def _current_round(self, group_id):
        response = self.admin_api.get(f'/api/v1/groups/{group_id}/rounds/current/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data

    def _pay_and_validate_all(self, round_id):
        """Cada participante reporta su pago y el admin lo valida."""
        for contribution in Contribution.objects.filter(round_id=round_id).select_related('user'):
            api = self.clients[contribution.user.username]
            response = api.post(
                f'/api/v1/contributions/{contribution.id}/pay/', {'notes': 'Pago vía QR'}, format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
            response = self.admin_api.post(
                f'/api/v1/contributions/{contribution.id}/validate/', {}, format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    # -------------------------------------------------------------------- tests
    def test_e2e_01_create_pasanaku_and_fill_all_slots(self):
        self.admin, self.admin_api = self._register_and_login('admin_e2e')
        group_data = self._create_group(self.admin_api, total_members=3)
        self.assertEqual(group_data['status'], GroupStatus.BORRADOR)
        self.assertTrue(group_data['invite_code'])
        self.assertEqual(group_data['remaining_slots'], 2)
        self.assertFalse(group_data['is_full'])

        _, u2_api = self._register_and_login('user2_e2e')
        _, u3_api = self._register_and_login('user3_e2e')
        joined = self._join(u2_api, group_data['invite_code'])
        self.assertEqual(joined['remaining_slots'], 1)
        joined = self._join(u3_api, group_data['invite_code'])
        self.assertEqual(joined['remaining_slots'], 0)
        self.assertTrue(joined['is_full'])

        response = self.admin_api.get(f"/api/v1/groups/{group_data['id']}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_full'])
        self.assertEqual(response.data['remaining_slots'], 0)

    def test_e2e_02_assign_turns_and_start_pasanaku(self):
        group_id = self._setup_full_group()

        response = self.admin_api.post(f'/api/v1/groups/{group_id}/turns/raffle/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        turns = PasanakuTurn.objects.filter(group_id=group_id)
        self.assertEqual(sorted(t.turn_number for t in turns), [1, 2, 3])
        self.assertEqual({t.user_id for t in turns}, {self.admin.id, self.u2.id, self.u3.id})

        response = self.admin_api.post(f'/api/v1/groups/{group_id}/start/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(PasanakuGroup.objects.get(id=group_id).status, GroupStatus.INICIADO)
        round_1 = Round.objects.get(group_id=group_id, round_number=1)
        self.assertEqual(round_1.status, RoundStatus.ACTIVA)
        self.assertEqual(round_1.beneficiary, PasanakuTurn.objects.get(group_id=group_id, turn_number=1).user)

        # Ya no se permiten uniones ni modificaciones
        _, late_api = self._register_and_login('late_e2e')
        response = late_api.post('/api/v1/groups/join/', {'invite_code': self.invite_code}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.admin_api.patch(
            f'/api/v1/groups/{group_id}/', {'quota_amount': '500.00'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.admin_api.post(f'/api/v1/groups/{group_id}/turns/raffle/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.admin_api.post(
            f'/api/v1/groups/{group_id}/remove-member/', {'user_id': self.u2.id}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(PasanakuGroup.objects.get(id=group_id).quota_amount, Decimal('100.00'))

    def test_e2e_03_report_and_validate_all_contributions(self):
        group_id = self._setup_started_group()

        for api in (self.admin_api, self.u2_api, self.u3_api):
            data = self._current_round(group_id)
            self.assertEqual(data['status'], RoundStatus.ACTIVA)
            self.assertEqual(len(data['contributions']), 3)

        round_id = self._current_round(group_id)['id']
        self._pay_and_validate_all(round_id)

        contributions = Contribution.objects.filter(round_id=round_id)
        self.assertEqual(contributions.count(), 3)
        for c in contributions:
            self.assertEqual(c.status, ContributionStatus.PAGADA)
            self.assertIsNotNone(c.payment_date)
            self.assertEqual(c.validated_by, self.admin)

    def test_e2e_04_debt_lock_enforcement_on_round_close(self):
        group_id = self._setup_started_group()
        round_id = self._current_round(group_id)['id']

        # u2 y admin pagan; u3 queda debiendo
        for user in (self.u2, self.admin):
            c = Contribution.objects.get(round_id=round_id, user=user)
            self.clients[user.username].post(
                f'/api/v1/contributions/{c.id}/pay/', {'notes': 'ok'}, format='json'
            )
            response = self.admin_api.post(f'/api/v1/contributions/{c.id}/validate/', {}, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.admin_api.post(f'/api/v1/rounds/{round_id}/close/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('bloqueo por deuda', str(response.data).lower())
        self.assertEqual(Round.objects.get(id=round_id).status, RoundStatus.ACTIVA)

        response = self.admin_api.get(f'/api/v1/groups/{group_id}/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debtors = response.data['current_round']['debtors']
        self.assertEqual([d['user_id'] for d in debtors], [self.u3.id])

        response = self.admin_api.post(
            f'/api/v1/groups/{group_id}/reminders/', {'message': 'Por favor paga tu cuota'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        reminders = InternalReminder.objects.filter(group_id=group_id)
        self.assertEqual(reminders.count(), 1)
        self.assertEqual(reminders.first().recipient, self.u3)

        response = self.u3_api.get('/api/v1/users/me/reminders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_e2e_05_close_round_deliver_pot_and_advance_turn(self):
        group_id = self._setup_started_group()
        round_1 = Round.objects.get(group_id=group_id, round_number=1)
        self._pay_and_validate_all(round_1.id)

        response = self.admin_api.post(f'/api/v1/rounds/{round_1.id}/close/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertFalse(response.data['is_finished'])

        round_1.refresh_from_db()
        self.assertEqual(round_1.status, RoundStatus.CERRADA)
        self.assertTrue(round_1.delivered_to_beneficiary)
        self.assertIsNotNone(round_1.delivered_at)
        self.assertEqual(round_1.total_collected, Decimal('300.00'))
        turn_1 = PasanakuTurn.objects.get(group_id=group_id, turn_number=1)
        self.assertEqual(round_1.beneficiary, turn_1.user)

        data = self._current_round(group_id)
        self.assertEqual(data['round_number'], 2)
        self.assertEqual(data['status'], RoundStatus.ACTIVA)
        turn_2 = PasanakuTurn.objects.get(group_id=group_id, turn_number=2)
        round_2 = Round.objects.get(id=data['id'])
        self.assertEqual(round_2.beneficiary, turn_2.user)
        self.assertEqual(round_2.contributions.count(), 3)
        self.assertTrue(
            all(c.status == ContributionStatus.PENDIENTE for c in round_2.contributions.all())
        )

    def test_e2e_06_query_history_rounds_and_beneficiaries_audit(self):
        group_id = self._setup_started_group()

        last_response = None
        for number in (1, 2, 3):
            round_obj = Round.objects.get(group_id=group_id, round_number=number)
            self._pay_and_validate_all(round_obj.id)
            last_response = self.admin_api.post(
                f'/api/v1/rounds/{round_obj.id}/close/', {}, format='json'
            )
            self.assertEqual(last_response.status_code, status.HTTP_200_OK, last_response.data)

        self.assertTrue(last_response.data['is_finished'])
        self.assertEqual(last_response.data['group_status'], 'FINALIZADO')
        self.assertEqual(PasanakuGroup.objects.get(id=group_id).status, GroupStatus.FINALIZADO)
        self.assertFalse(Round.objects.filter(group_id=group_id, status=RoundStatus.ACTIVA).exists())

        response = self.u2_api.get(f'/api/v1/groups/{group_id}/rounds/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        beneficiaries = []
        for index, item in enumerate(response.data, start=1):
            self.assertEqual(item['round_number'], index)
            self.assertEqual(item['status'], RoundStatus.CERRADA)
            self.assertTrue(item['delivered_to_beneficiary'])
            self.assertEqual(Decimal(str(item['expected_amount'])), Decimal('300.00'))
            self.assertEqual(Decimal(str(item['total_collected'])), Decimal('300.00'))
            self.assertIsNotNone(item['start_date'])
            self.assertIsNotNone(item['closed_at'])
            turn = PasanakuTurn.objects.get(group_id=group_id, turn_number=index)
            self.assertEqual(item['beneficiary']['id'], turn.user_id)
            beneficiaries.append(item['beneficiary']['id'])
        self.assertEqual(len(set(beneficiaries)), 3)

    def test_e2e_07_access_control_and_user_isolation(self):
        group_a_id = self._setup_started_group()

        owner_b, owner_b_api = self._register_and_login('owner_b_e2e')
        member_b, member_b_api = self._register_and_login('member_b_e2e')
        group_b = self._create_group(owner_b_api, total_members=2, name='Grupo B')
        self._join(member_b_api, group_b['invite_code'])
        owner_b_api.post(f"/api/v1/groups/{group_b['id']}/turns/raffle/", {}, format='json')
        response = owner_b_api.post(f"/api/v1/groups/{group_b['id']}/start/", {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        round_b = Round.objects.get(group_id=group_b['id'], round_number=1)
        contribution_b = round_b.contributions.first()
        gid = group_b['id']

        # Admin del grupo A intenta consultar recursos del grupo B
        for url in (
            f'/api/v1/groups/{gid}/',
            f'/api/v1/groups/{gid}/rounds/',
            f'/api/v1/groups/{gid}/rounds/current/',
            f'/api/v1/groups/{gid}/summary/',
            f'/api/v1/groups/{gid}/turns/',
            f'/api/v1/rounds/{round_b.id}/',
        ):
            response = self.admin_api.get(url)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, url)

        # ...y alterar recursos del grupo B
        for url in (
            f'/api/v1/groups/{gid}/start/',
            f'/api/v1/groups/{gid}/turns/raffle/',
            f'/api/v1/groups/{gid}/reminders/',
            f'/api/v1/rounds/{round_b.id}/close/',
            f'/api/v1/contributions/{contribution_b.id}/pay/',
            f'/api/v1/contributions/{contribution_b.id}/validate/',
        ):
            response = self.admin_api.post(url, {}, format='json')
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, url)
        response = self.admin_api.patch(f'/api/v1/groups/{gid}/', {'name': 'Hack'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Aislamiento inverso: el dueño de B no accede al grupo A
        response = owner_b_api.get(f'/api/v1/groups/{group_a_id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Nada fue alterado en el grupo B
        self.assertEqual(PasanakuGroup.objects.get(id=gid).name, 'Grupo B')
        contribution_b.refresh_from_db()
        self.assertEqual(contribution_b.status, ContributionStatus.PENDIENTE)
        self.assertEqual(Round.objects.get(id=round_b.id).status, RoundStatus.ACTIVA)
