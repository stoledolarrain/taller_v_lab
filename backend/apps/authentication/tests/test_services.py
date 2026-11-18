from django.test import TestCase
from rest_framework.exceptions import ValidationError, AuthenticationFailed
from apps.authentication.models import User
from apps.authentication.services import user_register, user_authenticate


class UserServicesTests(TestCase):
    """Pruebas unitarias para la capa de servicios de autenticación."""

    def test_user_register_service(self):
        user, tokens = user_register(
            username='ana_bol',
            email='ana@pasanaku.bo',
            password='SecurePassword123!',
            first_name='Ana',
            last_name='Gomez',
            phone_number='71234567',
            ci='1234567 SC'
        )
        self.assertIsInstance(user, User)
        self.assertEqual(user.username, 'ana_bol')
        self.assertIn('access', tokens)
        self.assertIn('refresh', tokens)

    def test_user_register_duplicate_username_raises_validation_error(self):
        user_register(
            username='repetido',
            email='correo1@pasanaku.bo',
            password='password123'
        )
        with self.assertRaises(ValidationError):
            user_register(
                username='repetido',
                email='correo2@pasanaku.bo',
                password='password123'
            )

    def test_user_authenticate_with_username(self):
        user_register(
            username='auth_user',
            email='auth@pasanaku.bo',
            password='password123'
        )
        user, tokens = user_authenticate(
            username_or_email='auth_user',
            password='password123'
        )
        self.assertEqual(user.username, 'auth_user')
        self.assertIn('access', tokens)

    def test_user_authenticate_with_email(self):
        user_register(
            username='auth_email_user',
            email='testemail@pasanaku.bo',
            password='password123'
        )
        user, tokens = user_authenticate(
            username_or_email='testemail@pasanaku.bo',
            password='password123'
        )
        self.assertEqual(user.username, 'auth_email_user')
        self.assertIn('access', tokens)

    def test_user_authenticate_invalid_password_raises(self):
        user_register(
            username='bad_pass_user',
            email='badpass@pasanaku.bo',
            password='correctPassword'
        )
        with self.assertRaises(AuthenticationFailed):
            user_authenticate(
                username_or_email='bad_pass_user',
                password='wrongPassword'
            )

    def test_user_register_duplicate_ci_raises_validation_error(self):
        user_register(
            username='user_ci_1',
            email='ci1@pasanaku.bo',
            password='password123',
            ci='8912345 LP'
        )
        with self.assertRaises(ValidationError) as ctx:
            user_register(
                username='user_ci_2',
                email='ci2@pasanaku.bo',
                password='password123',
                ci='8912345 LP'
            )
        self.assertIn('ci', ctx.exception.detail)

    def test_user_register_duplicate_phone_number_raises_validation_error(self):
        user_register(
            username='user_phone_1',
            email='phone1@pasanaku.bo',
            password='password123',
            phone_number='77123456'
        )
        with self.assertRaises(ValidationError) as ctx:
            user_register(
                username='user_phone_2',
                email='phone2@pasanaku.bo',
                password='password123',
                phone_number='77123456'
            )
        self.assertIn('phone_number', ctx.exception.detail)

    def test_user_register_empty_ci_and_phone_allowed_multiple_times(self):
        # Múltiples usuarios sin CI o sin teléfono no deben colisionar
        u1, _ = user_register(
            username='empty_contact_1',
            email='empty1@pasanaku.bo',
            password='password123',
            ci='',
            phone_number=''
        )
        u2, _ = user_register(
            username='empty_contact_2',
            email='empty2@pasanaku.bo',
            password='password123',
            ci='',
            phone_number=''
        )
        self.assertEqual(u1.ci, '')
        self.assertEqual(u2.ci, '')
