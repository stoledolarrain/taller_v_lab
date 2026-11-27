from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import User, ReputationLevel
from apps.groups.models import GroupJoinRequest, GroupMembership, JoinRequestStatus, Periodicity
from apps.groups.services import group_create, turn_raffle_auto, group_start


class GroupQRJoinTests(APITestCase):
    """Pruebas de ingreso directo a grupos de pasanaku mediante código QR."""

    def setUp(self):
        self.admin_high = User.objects.create_user(
            username='qr_admin', email='qr_admin@pasanaku.bo', password='Password123!',
            reputation=ReputationLevel.ALTA, ci='6200001 LP', phone_number='76200001'
        )
        self.user_low = User.objects.create_user(
            username='qr_low', email='qr_low@pasanaku.bo', password='Password123!',
            reputation=ReputationLevel.BAJA, ci='6200002 SC', phone_number='76200002'
        )
        self.user_extra = User.objects.create_user(
            username='qr_extra', email='qr_extra@pasanaku.bo', password='Password123!',
            reputation=ReputationLevel.BAJA, ci='6200003 CB', phone_number='76200003'
        )
        self.group = group_create(
            creator=self.admin_high,
            name='Pasanaku QR VIP',
            quota_amount=Decimal('250.00'),
            periodicity=Periodicity.MENSUAL,
            start_date=timezone.localdate() + timedelta(days=5),
            total_members=2,
            is_public=True,
        )

    def _auth(self, user: User):
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_qr_join_bypasses_reputation_and_resolves_pending_request(self):
        """Escanear el QR permite a un usuario BAJA entrar a un grupo ALTA sin aprobación."""
        self._auth(self.user_low)

        # Primero intenta por código normal -> queda en solicitud PENDIENTE (202)
        res_code = self.client.post(
            '/api/v1/groups/join/', {'invite_code': self.group.invite_code}, format='json'
        )
        self.assertEqual(res_code.status_code, status.HTTP_202_ACCEPTED)
        self.assertFalse(GroupMembership.objects.filter(group=self.group, user=self.user_low).exists())

        # Luego escanea el QR -> entra directo (200) y resuelve la solicitud pendiente
        res_qr = self.client.post(
            '/api/v1/groups/join-qr/', {'qr_token': self.group.qr_token}, format='json'
        )
        self.assertEqual(res_qr.status_code, status.HTTP_200_OK)
        self.assertTrue(GroupMembership.objects.filter(group=self.group, user=self.user_low).exists())
        req = GroupJoinRequest.objects.get(group=self.group, user=self.user_low)
        self.assertEqual(req.status, JoinRequestStatus.APROBADA)

    def test_qr_join_enforces_invariants_and_hides_token_in_public_list(self):
        """Token QR inválido, grupo lleno o iniciado son rechazados; qr_token no se expone en /public/."""
        self._auth(self.user_low)

        # qr_token no debe filtrarse en el listado público
        res_pub = self.client.get('/api/v1/groups/public/')
        self.assertNotIn('qr_token', res_pub.data['results'][0])

        # Token inválido -> 400
        res_bad = self.client.post('/api/v1/groups/join-qr/', {'qr_token': 'INVALID'}, format='json')
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

        # Llenar grupo e iniciarlo
        self.assertEqual(
            self.client.post('/api/v1/groups/join-qr/', {'qr_token': self.group.qr_token}, format='json').status_code,
            status.HTTP_200_OK,
        )

        # Duplicado -> 400
        self.assertEqual(
            self.client.post('/api/v1/groups/join-qr/', {'qr_token': self.group.qr_token}, format='json').status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        # Grupo lleno -> 400
        self._auth(self.user_extra)
        self.assertEqual(
            self.client.post('/api/v1/groups/join-qr/', {'qr_token': self.group.qr_token}, format='json').status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        # Grupo iniciado -> 400
        turn_raffle_auto(group=self.group, admin_user=self.admin_high)
        group_start(group=self.group, admin_user=self.admin_high)
        self.assertEqual(
            self.client.post('/api/v1/groups/join-qr/', {'qr_token': self.group.qr_token}, format='json').status_code,
            status.HTTP_400_BAD_REQUEST,
        )
