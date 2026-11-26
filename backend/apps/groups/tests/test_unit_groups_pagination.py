from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import User
from apps.groups.models import Periodicity
from apps.groups.services import group_create


class GroupPaginationTests(APITestCase):
    """Pruebas de paginación para GET /api/v1/groups/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='pag_user', email='pag@pasanaku.bo', password='Password123!',
            ci='7000001 LP', phone_number='77000001'
        )
        self.other = User.objects.create_user(
            username='pag_other', email='other@pasanaku.bo', password='Password123!',
            ci='7000002 SC', phone_number='77000002'
        )
        for i in range(1, 9):
            group_create(
                creator=self.user,
                name=f'Pasanaku #{i}',
                quota_amount=Decimal('100.00'),
                periodicity=Periodicity.MENSUAL,
                start_date=timezone.localdate() + timedelta(days=5),
                total_members=3,
            )
        group_create(
            creator=self.other,
            name='Grupo Ajeno',
            quota_amount=Decimal('100.00'),
            periodicity=Periodicity.MENSUAL,
            start_date=timezone.localdate() + timedelta(days=5),
            total_members=3,
        )
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_groups_list_default_pagination(self):
        """Devuelve página 1 con 6 grupos por defecto y metadatos DRF."""
        res = self.client.get('/api/v1/groups/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 8)
        self.assertEqual(len(res.data['results']), 6)
        self.assertIsNotNone(res.data['next'])
        self.assertIsNone(res.data['previous'])

        res_p2 = self.client.get('/api/v1/groups/?page=2')
        self.assertEqual(res_p2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_p2.data['results']), 2)
        self.assertIsNone(res_p2.data['next'])
        self.assertIsNotNone(res_p2.data['previous'])

    def test_groups_list_custom_page_size_and_isolation(self):
        """Respeta ?page_size= y no expone grupos de otros usuarios."""
        res = self.client.get('/api/v1/groups/?page=1&page_size=3')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 8)
        self.assertEqual(len(res.data['results']), 3)
        names = [g['name'] for g in res.data['results']]
        self.assertNotIn('Grupo Ajeno', names)
