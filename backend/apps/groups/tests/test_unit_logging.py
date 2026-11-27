from datetime import timedelta
from unittest.mock import MagicMock

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import User
from apps.groups.models import Periodicity
from config.exception_handler import custom_exception_handler


class BackendLoggingTests(APITestCase):
    """Pruebas del logging centralizado de errores API (4xx/5xx) y eventos de negocio."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='log_user', email='log@pasanaku.bo', password='Password123!',
            ci='6400001 LP', phone_number='76400001'
        )
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_failed_group_creation_logs_warning_with_reason(self):
        """Si un usuario no puede crear un grupo (400), el handler global logea WARNING con el detalle."""
        with self.assertLogs('apps.api', level='WARNING') as cm:
            res = self.client.post('/api/v1/groups/', {
                'name': 'Grupo Inválido',
                'quota_amount': '0.00',
                'periodicity': Periodicity.MENSUAL,
                'start_date': (timezone.localdate() + timedelta(days=5)).isoformat(),
                'total_members': 3,
            }, format='json')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        log_output = '\n'.join(cm.output)
        self.assertIn('API 400 POST /api/v1/groups/', log_output)
        self.assertIn('user=log_user', log_output)

    def test_successful_group_creation_logs_info(self):
        """Crear un grupo exitosamente registra un evento INFO en apps.groups.services."""
        with self.assertLogs('apps.groups.services', level='INFO') as cm:
            res = self.client.post('/api/v1/groups/', {
                'name': 'Grupo Auditado',
                'quota_amount': '100.00',
                'periodicity': Periodicity.MENSUAL,
                'start_date': (timezone.localdate() + timedelta(days=5)).isoformat(),
                'total_members': 3,
            }, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(any('Grupo creado:' in line for line in cm.output))

    def test_unhandled_exception_logs_500_exception(self):
        """Errores inesperados (500) son logeados en nivel ERROR con traceback."""
        fake_req = MagicMock(method='POST', path='/api/v1/groups/', user=self.user)
        with self.assertLogs('apps.api', level='ERROR') as cm:
            result = custom_exception_handler(RuntimeError('boom'), {'request': fake_req})

        self.assertIsNone(result)
        self.assertTrue(any('API 500 POST /api/v1/groups/' in line for line in cm.output))
