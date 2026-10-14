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
