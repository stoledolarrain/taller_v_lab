from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import User, ReputationLevel
from apps.groups.models import GroupJoinRequest, GroupMembership, JoinRequestStatus, Periodicity
from apps.groups.services import group_create, group_join_or_request


class PublicGroupsReputationAndRequestsTests(APITestCase):
    """Pruebas de pasanakus públicos, filtro de reputación y aprobación de solicitudes."""

    def setUp(self):
        self.admin_high = User.objects.create_user(
            username='admin_alta', email='alta@pasanaku.bo', password='Password123!',
            reputation=ReputationLevel.ALTA, ci='6100001 LP', phone_number='76100001'
        )
        self.user_high = User.objects.create_user(
            username='socio_alta', email='salta@pasanaku.bo', password='Password123!',
            reputation=ReputationLevel.ALTA, ci='6100002 LP', phone_number='76100002'
        )
        self.user_low = User.objects.create_user(
            username='socio_baja', email='sbaja@pasanaku.bo', password='Password123!',
            reputation=ReputationLevel.BAJA, ci='6100003 SC', phone_number='76100003'
        )
        self.user_med = User.objects.create_user(
            username='socio_media', email='smedia@pasanaku.bo', password='Password123!',
            reputation=ReputationLevel.MEDIA, ci='6100004 CB', phone_number='76100004'
        )

    def _auth(self, user: User):
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def _create_public_high_group(self, total_members=3):
        return group_create(
            creator=self.admin_high,
            name='Pasanaku VIP Público',
            quota_amount=Decimal('200.00'),
            periodicity=Periodicity.MENSUAL,
            start_date=timezone.localdate() + timedelta(days=5),
            total_members=total_members,
            is_public=True,
        )

    def test_creator_high_reputation_inherits_min_reputation_alta(self):
        """Un creador con reputación ALTA crea por defecto un grupo que exige reputación ALTA."""
        group = self._create_public_high_group()
        self.assertTrue(group.is_public)
        self.assertEqual(group.min_reputation, ReputationLevel.ALTA)

        group_med = group_create(
            creator=self.user_med,
            name='Pasanaku Abierto',
            quota_amount=Decimal('100.00'),
            periodicity=Periodicity.SEMANAL,
            start_date=timezone.localdate() + timedelta(days=5),
            total_members=3,
            is_public=True,
        )
        self.assertEqual(group_med.min_reputation, ReputationLevel.BAJA)

    def test_public_groups_list_paginated_and_filtered(self):
        """GET /groups/public/ lista solo grupos públicos en BORRADOR y soporta ?min_reputation=."""
        self._create_public_high_group()
        group_create(
            creator=self.user_med,
            name='Grupo Privado',
            quota_amount=Decimal('100.00'),
            periodicity=Periodicity.MENSUAL,
            start_date=timezone.localdate() + timedelta(days=5),
            total_members=3,
            is_public=False,
        )
        self._auth(self.user_low)

        res = self.client.get('/api/v1/groups/public/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['name'], 'Pasanaku VIP Público')

        res_baja = self.client.get('/api/v1/groups/public/?min_reputation=BAJA')
        self.assertEqual(res_baja.data['count'], 0)

    def test_reputation_filter_direct_join_vs_pending_request_and_approval(self):
        """Reputación ALTA entra directo (200); reputación BAJA crea solicitud (202) y admin aprueba/rechaza."""
        group = self._create_public_high_group(total_members=3)

        # 1. Usuario con reputación ALTA entra directo al grupo público
        self._auth(self.user_high)
        res_direct = self.client.post(f'/api/v1/groups/{group.id}/join-public/', {}, format='json')
        self.assertEqual(res_direct.status_code, status.HTTP_200_OK)
        self.assertTrue(GroupMembership.objects.filter(group=group, user=self.user_high).exists())

        # 2. Usuario con reputación BAJA no entra directo -> crea solicitud PENDIENTE (202)
        self._auth(self.user_low)
        res_req = self.client.post(
            f'/api/v1/groups/{group.id}/join-public/',
            {'message': 'Prometo pagar puntual'},
            format='json',
        )
        self.assertEqual(res_req.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(res_req.data['status'], 'PENDING_APPROVAL')
        req_id = res_req.data['join_request']['id']
        self.assertFalse(GroupMembership.objects.filter(group=group, user=self.user_low).exists())

        # Duplicar solicitud pendiente falla (400)
        res_dup = self.client.post(f'/api/v1/groups/{group.id}/join-public/', {}, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Participante regular no puede listar ni aprobar solicitudes (403)
        self._auth(self.user_high)
        self.assertEqual(
            self.client.get(f'/api/v1/groups/{group.id}/join-requests/').status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(f'/api/v1/groups/join-requests/{req_id}/approve/', {}, format='json').status_code,
            status.HTTP_403_FORBIDDEN,
        )

        # 4. Admin lista y rechaza primero, luego usuario reenvía y admin aprueba
        self._auth(self.admin_high)
        res_list = self.client.get(f'/api/v1/groups/{group.id}/join-requests/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 1)

        res_rej = self.client.post(f'/api/v1/groups/join-requests/{req_id}/reject/', {}, format='json')
        self.assertEqual(res_rej.status_code, status.HTTP_200_OK)
        self.assertEqual(GroupJoinRequest.objects.get(id=req_id).status, JoinRequestStatus.RECHAZADA)

        # Usuario vuelve a solicitar por invite_code y el admin aprueba
        self._auth(self.user_low)
        res_retry = self.client.post(
            '/api/v1/groups/join/',
            {'invite_code': group.invite_code, 'message': 'Segundo intento'},
            format='json',
        )
        self.assertEqual(res_retry.status_code, status.HTTP_202_ACCEPTED)

        self._auth(self.admin_high)
        res_app = self.client.post(f'/api/v1/groups/join-requests/{req_id}/approve/', {}, format='json')
        self.assertEqual(res_app.status_code, status.HTTP_200_OK)
        self.assertTrue(GroupMembership.objects.filter(group=group, user=self.user_low).exists())
        self.assertEqual(GroupJoinRequest.objects.get(id=req_id).status, JoinRequestStatus.APROBADA)

    def test_bypass_reputation_allows_direct_join_for_qr_flow(self):
        """bypass_reputation=True permite entrar directo sin importar la reputación (base del QR)."""
        group = self._create_public_high_group(total_members=3)
        membership, join_req = group_join_or_request(
            user=self.user_low, group=group, bypass_reputation=True
        )
        self.assertIsNotNone(membership)
        self.assertIsNone(join_req)
