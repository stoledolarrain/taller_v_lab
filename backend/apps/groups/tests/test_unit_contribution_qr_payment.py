from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import User
from apps.groups.models import ContributionStatus, PaymentMethod, Periodicity
from apps.groups.services import (
    group_create,
    group_join_by_code,
    turn_raffle_auto,
    group_start,
)


class ContributionQRPaymentTests(APITestCase):
    """Pruebas del selector Efectivo/QR y confirmación de pago QR en vivo desde celular."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='pay_admin', email='pay_admin@pasanaku.bo', password='Password123!',
            ci='6300001 LP', phone_number='76300001'
        )
        self.member = User.objects.create_user(
            username='pay_member', email='pay_member@pasanaku.bo', password='Password123!',
            ci='6300002 SC', phone_number='76300002'
        )
        self.group = group_create(
            creator=self.admin,
            name='Pasanaku Pagos QR',
            quota_amount=Decimal('150.00'),
            periodicity=Periodicity.MENSUAL,
            start_date=timezone.localdate() + timedelta(days=5),
            total_members=2,
        )
        group_join_by_code(user=self.member, invite_code=self.group.invite_code)
        turn_raffle_auto(group=self.group, admin_user=self.admin)
        group_start(group=self.group, admin_user=self.admin)

        self.round_1 = self.group.rounds.get(round_number=1)
        self.c_member = self.round_1.contributions.get(user=self.member)
        self.c_admin = self.round_1.contributions.get(user=self.admin)

    def _auth(self, user: User):
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_report_payment_method_efectivo(self):
        """Reportar pago en EFECTIVO guarda el método y queda pendiente de validación del admin."""
        self._auth(self.member)
        res = self.client.post(
            f'/api/v1/contributions/{self.c_member.id}/pay/',
            {'payment_method': PaymentMethod.EFECTIVO, 'notes': 'Entregado en mano'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.c_member.refresh_from_db()
        self.assertEqual(self.c_member.payment_method, PaymentMethod.EFECTIVO)
        self.assertEqual(self.c_member.status, ContributionStatus.PENDIENTE)

    def test_qr_payment_generate_mobile_view_and_confirm_without_jwt(self):
        """Flujo completo QR: socio genera QR, celular consulta y confirma sin JWT -> PAGADA."""
        # Otro socio no puede generar el QR de la cuota del admin (403)
        self._auth(self.member)
        res_forbidden = self.client.post(
            f'/api/v1/contributions/{self.c_admin.id}/qr/generate/', {}, format='json'
        )
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # Socio genera el QR de su propia cuota
        res_gen = self.client.post(
            f'/api/v1/contributions/{self.c_member.id}/qr/generate/', {}, format='json'
        )
        self.assertEqual(res_gen.status_code, status.HTTP_200_OK)
        qr_ref = res_gen.data['qr_reference']
        self.assertTrue(qr_ref.startswith('QR-'))
        self.assertEqual(res_gen.data['amount'], '150.00')

        # Celular en la misma red abre el enlace SIN sesión JWT (AllowAny)
        self.client.credentials()
        res_detail = self.client.get(f'/api/v1/payments/qr/{qr_ref}/')
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(res_detail.data['status'], ContributionStatus.PENDIENTE)
        self.assertEqual(res_detail.data['group_name'], 'Pasanaku Pagos QR')

        # Celular presiona el botón "Confirmar Pago" (AllowAny)
        res_confirm = self.client.post(f'/api/v1/payments/qr/{qr_ref}/confirm/', {}, format='json')
        self.assertEqual(res_confirm.status_code, status.HTTP_200_OK)
        self.assertEqual(res_confirm.data['status'], ContributionStatus.PAGADA)

        self.c_member.refresh_from_db()
        self.assertEqual(self.c_member.status, ContributionStatus.PAGADA)
        self.assertEqual(self.c_member.payment_method, PaymentMethod.QR)
        self.assertIsNotNone(self.c_member.payment_date)
        self.assertIsNotNone(self.c_member.validation_date)

        # Re-confirmar el mismo QR falla (400)
        res_dup = self.client.post(f'/api/v1/payments/qr/{qr_ref}/confirm/', {}, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)

        # Referencia inexistente -> 404
        self.assertEqual(
            self.client.get('/api/v1/payments/qr/QR-INEXISTENTE/').status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.post('/api/v1/payments/qr/QR-INEXISTENTE/confirm/', {}, format='json').status_code,
            status.HTTP_404_NOT_FOUND,
        )
