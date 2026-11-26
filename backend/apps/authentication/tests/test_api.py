from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.authentication.models import User


class AuthAPITests(APITestCase):
    """Pruebas de integración para los endpoints de autenticación."""

    def setUp(self):
        self.register_url = reverse('authentication:register')
        self.login_url = reverse('authentication:login')
        self.me_url = reverse('authentication:me')

        self.user = User.objects.create_user(
            username='luis_pasanaku',
            email='luis@pasanaku.bo',
            password='Password123!',
            first_name='Luis',
            last_name='Torres',
            phone_number='76543210',
            ci='5432100 CB'
        )

    def test_register_endpoint_success(self):
        payload = {
            'username': 'sofia_pasanaku',
            'email': 'sofia@pasanaku.bo',
            'password': 'SecurePassword123!',
            'first_name': 'Sofia',
            'last_name': 'Rios',
            'phone_number': '71122334',
            'ci': '6543210 LP'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertIn('tokens', response.data)
        self.assertEqual(response.data['user']['username'], 'sofia_pasanaku')
        self.assertEqual(response.data['user']['email'], 'sofia@pasanaku.bo')
        # Verificar persistencia en base de datos
        self.assertTrue(User.objects.filter(username='sofia_pasanaku').exists())

    def test_register_duplicate_username_fails(self):
        payload = {
            'username': 'luis_pasanaku',  # ya existe
            'email': 'otro_correo@pasanaku.bo',
            'password': 'Password123!'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_username_success(self):
        payload = {
            'username_or_email': 'luis_pasanaku',
            'password': 'Password123!'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertEqual(response.data['user']['username'], 'luis_pasanaku')

    def test_login_with_email_success(self):
        payload = {
            'username_or_email': 'luis@pasanaku.bo',
            'password': 'Password123!'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)

    def test_login_invalid_password_fails(self):
        payload = {
            'username_or_email': 'luis_pasanaku',
            'password': 'WrongPassword!'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_unauthenticated_fails(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_authenticated_success(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'luis_pasanaku')
        self.assertEqual(response.data['email'], 'luis@pasanaku.bo')

    def test_update_me_profile_success(self):
        self.client.force_authenticate(user=self.user)
        update_payload = {
            'first_name': 'Luis Alberto',
            'phone_number': '79998877'
        }
        response = self.client.patch(self.me_url, update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['first_name'], 'Luis Alberto')
        self.assertEqual(response.data['user']['phone_number'], '79998877')

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Luis Alberto')
        self.assertEqual(self.user.phone_number, '79998877')

    def test_register_duplicate_ci_fails(self):
        # self.user ya tiene ci='5432100 CB'
        payload = {
            'username': 'nuevo_ci_duplicado',
            'email': 'nuevo_ci@pasanaku.bo',
            'password': 'Password123!',
            'ci': '5432100 CB',
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ci', response.data)

    def test_register_duplicate_phone_number_fails(self):
        # self.user ya tiene phone_number='76543210'
        payload = {
            'username': 'nuevo_tel_duplicado',
            'email': 'nuevo_tel@pasanaku.bo',
            'password': 'Password123!',
            'phone_number': '76543210',
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone_number', response.data)

    def test_update_me_duplicate_ci_fails(self):
        User.objects.create_user(
            username='otro_usuario',
            email='otro@pasanaku.bo',
            password='Password123!',
            ci='11223344 LP'
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(self.me_url, {'ci': '11223344 LP'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ci', response.data)

    def test_update_me_duplicate_phone_fails(self):
        User.objects.create_user(
            username='otro_usuario_tel',
            email='otro_tel@pasanaku.bo',
            password='Password123!',
            phone_number='78889900'
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(self.me_url, {'phone_number': '78889900'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone_number', response.data)

    def test_reputation_exposed_and_read_only_in_me(self):
        self.client.force_authenticate(user=self.user)
        res_get = self.client.get(self.me_url)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.data['reputation'], 'MEDIA')

        res_patch = self.client.patch(self.me_url, {'reputation': 'ALTA'}, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.reputation, 'MEDIA')
