import asyncio
import json
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from urllib.parse import unquote, urlparse

from asgiref.testing import ApplicationCommunicator
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken


class WebsocketCommunicator(ApplicationCommunicator):
    """Cliente ASGI ligero para probar WebSockets sin depender de daphne."""

    def __init__(self, asgi_app, path, headers=None):
        parsed = urlparse(path)
        scope = {
            'type': 'websocket',
            'asgi': {'version': '3.0'},
            'http_version': '1.1',
            'scheme': 'ws',
            'path': unquote(parsed.path),
            'raw_path': parsed.path.encode('ascii'),
            'query_string': parsed.query.encode('ascii'),
            'headers': headers or [],
            'subprotocols': [],
        }
        super().__init__(asgi_app, scope)

    async def connect(self, timeout=5):
        await self.send_input({'type': 'websocket.connect'})
        response = await self.receive_output(timeout)
        if response['type'] == 'websocket.accept':
            return True, response.get('subprotocol')
        return False, response.get('code', 1000)

    async def send_json_to(self, data):
        await self.send_input({'type': 'websocket.receive', 'text': json.dumps(data)})

    async def receive_json_from(self, timeout=5):
        response = await self.receive_output(timeout)
        assert response['type'] == 'websocket.send', f'Mensaje inesperado: {response}'
        return json.loads(response['text'])

    async def disconnect(self, code=1000, timeout=5):
        await self.send_input({'type': 'websocket.disconnect', 'code': code})
        await self.wait(timeout)

from apps.authentication.models import User
from apps.groups.models import Periodicity
from apps.groups.realtime import _dispatch_channel_event
from apps.groups.services import (
    group_create,
    group_join_by_code,
    turn_raffle_auto,
    group_start,
    contribution_report_payment,
    contribution_validate_payment,
    round_close_and_advance,
    reminder_create_for_pending,
)
from config.asgi import application


class WebSocketRealtimeTests(TransactionTestCase):
    """
    Pruebas de WebSockets (Django Channels + SimpleJWT):
    - Autenticación por query string (?token=) y header Authorization: Bearer.
    - Aislamiento estricto: usuarios anónimos (4001) y ajenos al grupo (4003) son rechazados.
    - Emisión de eventos en tiempo real tras commit de servicios de dominio.
    """

    def setUp(self):
        self.admin = User.objects.create_user(
            username='ws_admin', email='ws_admin@pasanaku.bo', password='Password123!',
            first_name='Admin', last_name='WS', ci='8000001 LP', phone_number='78000001'
        )
        self.member = User.objects.create_user(
            username='ws_member', email='ws_member@pasanaku.bo', password='Password123!',
            first_name='Socio', last_name='WS', ci='8000002 SC', phone_number='78000002'
        )
        self.outsider = User.objects.create_user(
            username='ws_outsider', email='ws_outsider@pasanaku.bo', password='Password123!',
            first_name='Ajeno', last_name='WS', ci='8000003 CB', phone_number='78000003'
        )
        self.staff = User.objects.create_user(
            username='ws_staff', email='ws_staff@pasanaku.bo', password='Password123!',
            is_staff=True, ci='8000004 OR', phone_number='78000004'
        )
        self.group = group_create(
            creator=self.admin,
            name='Pasanaku Realtime',
            quota_amount=Decimal('200.00'),
            periodicity=Periodicity.MENSUAL,
            start_date=timezone.localdate() + timedelta(days=5),
            total_members=2,
        )

    def _token(self, user: User) -> str:
        return str(RefreshToken.for_user(user).access_token)

    def test_group_ws_rejects_unauthenticated_and_invalid_token(self):
        """Rechaza conexiones sin token o con token inválido con código 4001."""
        async def scenario():
            comm_no_token = WebsocketCommunicator(application, f'/ws/groups/{self.group.id}/')
            connected, code = await comm_no_token.connect()
            self.assertFalse(connected)
            self.assertEqual(code, 4001)

            comm_bad_token = WebsocketCommunicator(
                application, f'/ws/groups/{self.group.id}/?token=token_invalido'
            )
            connected, code = await comm_bad_token.connect()
            self.assertFalse(connected)
            self.assertEqual(code, 4001)

        asyncio.run(scenario())

    def test_group_ws_rejects_non_member_and_allows_staff(self):
        """Aislamiento estricto: un usuario ajeno al grupo recibe cierre 4003; staff puede entrar."""
        outsider_token = self._token(self.outsider)
        staff_token = self._token(self.staff)

        async def scenario():
            comm_out = WebsocketCommunicator(
                application, f'/ws/groups/{self.group.id}/?token={outsider_token}'
            )
            connected, code = await comm_out.connect()
            self.assertFalse(connected)
            self.assertEqual(code, 4003)

            comm_staff = WebsocketCommunicator(
                application,
                f'/ws/groups/{self.group.id}/',
                headers=[(b'authorization', f'Bearer {staff_token}'.encode())],
            )
            connected, _ = await comm_staff.connect()
            self.assertTrue(connected)
            welcome = await comm_staff.receive_json_from()
            self.assertEqual(welcome['event'], 'connection_established')
            await comm_staff.disconnect()

        asyncio.run(scenario())

    def test_group_ws_receives_realtime_lifecycle_events_and_ping_pong(self):
        """Valida ping/pong y recepción en vivo de eventos emitidos por services.py tras commit."""
        admin_token = self._token(self.admin)

        async def scenario():
            comm = WebsocketCommunicator(
                application, f'/ws/groups/{self.group.id}/?token={admin_token}'
            )
            connected, _ = await comm.connect()
            self.assertTrue(connected)

            welcome = await comm.receive_json_from()
            self.assertEqual(welcome['event'], 'connection_established')
            self.assertEqual(welcome['group_id'], self.group.id)

            await comm.send_json_to({'type': 'ping'})
            pong = await comm.receive_json_from()
            self.assertEqual(pong, {'event': 'pong'})

            # 1. Socio se une -> member_joined
            await asyncio.to_thread(
                group_join_by_code, user=self.member, invite_code=self.group.invite_code
            )
            evt_join = await comm.receive_json_from()
            self.assertEqual(evt_join['event'], 'member_joined')
            self.assertTrue(evt_join['data']['is_full'])

            # 2. Sorteo de turnos -> turns_updated
            await asyncio.to_thread(turn_raffle_auto, group=self.group, admin_user=self.admin)
            evt_turns = await comm.receive_json_from()
            self.assertEqual(evt_turns['event'], 'turns_updated')

            # 3. Inicio del pasanaku -> group_started
            await asyncio.to_thread(group_start, group=self.group, admin_user=self.admin)
            evt_start = await comm.receive_json_from()
            self.assertEqual(evt_start['event'], 'group_started')
            self.assertEqual(evt_start['data']['round_number'], 1)

            # 4. Reporte y validación de aportes -> contribution_reported / contribution_validated
            round_1 = await asyncio.to_thread(lambda: self.group.rounds.get(round_number=1))
            c_member = await asyncio.to_thread(lambda: round_1.contributions.get(user=self.member))
            c_admin = await asyncio.to_thread(lambda: round_1.contributions.get(user=self.admin))

            await asyncio.to_thread(
                contribution_report_payment, contribution=c_member, user=self.member, notes='QR OK'
            )
            evt_rep = await comm.receive_json_from()
            self.assertEqual(evt_rep['event'], 'contribution_reported')

            await asyncio.to_thread(
                contribution_validate_payment, contribution=c_member, admin_user=self.admin
            )
            evt_val1 = await comm.receive_json_from()
            self.assertEqual(evt_val1['event'], 'contribution_validated')

            await asyncio.to_thread(
                contribution_validate_payment, contribution=c_admin, admin_user=self.admin
            )
            evt_val2 = await comm.receive_json_from()
            self.assertEqual(evt_val2['event'], 'contribution_validated')

            # 5. Cierre de ronda -> round_closed
            await asyncio.to_thread(
                round_close_and_advance, round_obj=round_1, admin_user=self.admin
            )
            evt_close = await comm.receive_json_from()
            self.assertEqual(evt_close['event'], 'round_closed')
            self.assertFalse(evt_close['data']['is_finished'])
            self.assertEqual(evt_close['data']['next_round_number'], 2)

            await comm.disconnect()

        asyncio.run(scenario())

    def test_user_notifications_ws_auth_and_reminder_event(self):
        """Valida autenticación en /ws/users/me/ y entrega en vivo de recordatorios internos."""
        group_join_by_code(user=self.member, invite_code=self.group.invite_code)
        turn_raffle_auto(group=self.group, admin_user=self.admin)
        group_start(group=self.group, admin_user=self.admin)

        member_token = self._token(self.member)

        async def scenario():
            comm_anon = WebsocketCommunicator(application, '/ws/users/me/')
            connected, code = await comm_anon.connect()
            self.assertFalse(connected)
            self.assertEqual(code, 4001)

            comm_user = WebsocketCommunicator(
                application, f'/ws/users/me/?token={member_token}'
            )
            connected, _ = await comm_user.connect()
            self.assertTrue(connected)

            welcome = await comm_user.receive_json_from()
            self.assertEqual(welcome['event'], 'connection_established')
            self.assertEqual(welcome['user_id'], self.member.id)

            await comm_user.send_json_to({'type': 'ping'})
            self.assertEqual(await comm_user.receive_json_from(), {'event': 'pong'})

            await asyncio.to_thread(
                reminder_create_for_pending,
                group=self.group,
                admin_user=self.admin,
                custom_message='Paga tu cuota hoy',
            )
            evt_rem = await comm_user.receive_json_from()
            self.assertEqual(evt_rem['event'], 'reminder_received')
            self.assertEqual(evt_rem['data']['message'], 'Paga tu cuota hoy')

            await comm_user.disconnect()

        asyncio.run(scenario())

    def test_dispatch_handles_missing_channel_layer(self):
        """No falla si get_channel_layer() retorna None."""
        with patch('apps.groups.realtime.get_channel_layer', return_value=None):
            _dispatch_channel_event('pasanaku_group_1', 'group_event', {'event': 'noop'})
