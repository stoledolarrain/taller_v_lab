from django.test import TestCase
from django.db import IntegrityError
from apps.authentication.models import User


class UserModelTests(TestCase):
    """Pruebas unitarias para el modelo de usuario personalizado."""

    def test_create_user_success(self):
        user = User.objects.create_user(
            username='carlos123',
            email='carlos@pasanaku.bo',
            password='Password123!',
            first_name='Carlos',
            last_name='Mamani',
            phone_number='77123456',
            ci='8912345 LP'
        )
        self.assertEqual(user.username, 'carlos123')
        self.assertEqual(user.email, 'carlos@pasanaku.bo')
        self.assertEqual(str(user), 'Carlos Mamani (@carlos123)')
        self.assertTrue(user.check_password('Password123!'))

    def test_duplicate_email_fails(self):
        User.objects.create_user(
            username='user1',
            email='dup@pasanaku.bo',
            password='Password123!'
        )
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                username='user2',
                email='dup@pasanaku.bo',
                password='Password123!'
            )

    def test_duplicate_username_fails(self):
        User.objects.create_user(
            username='unique_user',
            email='u1@pasanaku.bo',
            password='Password123!'
        )
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                username='unique_user',
                email='u2@pasanaku.bo',
                password='Password123!'
            )
