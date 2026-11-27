"""
Consumers ASGI de WebSockets para actualizaciones en tiempo real de Pasanaku Digital.

Endpoints:
  - ws/groups/<group_id>/?token=<jwt> : Sala de eventos en vivo del grupo (solo miembros).
  - ws/users/me/?token=<jwt>          : Canal personal de notificaciones y recordatorios.
"""
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .models import GroupMembership
from .realtime import group_channel_name, user_channel_name

logger = logging.getLogger(__name__)


@database_sync_to_async
def _is_group_member(group_id: int, user) -> bool:
    if user.is_staff:
        return True
    return GroupMembership.objects.filter(group_id=group_id, user=user).exists()


class GroupConsumer(AsyncJsonWebsocketConsumer):
    """Transmite eventos en tiempo real de un grupo únicamente a sus integrantes."""

    async def connect(self):
        self.group_id = int(self.scope['url_route']['kwargs']['group_id'])
        self.room_group_name = group_channel_name(self.group_id)
        self.joined_room = False

        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            logger.warning('WS group=%s rechazado (4001): sin autenticación', self.group_id)
            await self.close(code=4001)
            return

        if not await _is_group_member(self.group_id, user):
            logger.warning('WS group=%s rechazado (4003): user_id=%s no es miembro', self.group_id, user.id)
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        self.joined_room = True
        await self.accept()
        logger.info('WS group=%s conectado: user_id=%s', self.group_id, user.id)
        await self.send_json({
            'event': 'connection_established',
            'group_id': self.group_id,
            'user_id': user.id,
        })

    async def disconnect(self, close_code):
        if getattr(self, 'joined_room', False):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get('type') == 'ping':
            await self.send_json({'event': 'pong'})

    async def group_event(self, event):
        await self.send_json(event['payload'])


class UserNotificationsConsumer(AsyncJsonWebsocketConsumer):
    """Canal personal autenticado para recordatorios internos y alertas del usuario."""

    async def connect(self):
        self.joined_room = False
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user_id = user.id
        self.room_group_name = user_channel_name(self.user_id)
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        self.joined_room = True
        await self.accept()
        await self.send_json({
            'event': 'connection_established',
            'user_id': self.user_id,
        })

    async def disconnect(self, close_code):
        if getattr(self, 'joined_room', False):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get('type') == 'ping':
            await self.send_json({'event': 'pong'})

    async def user_event(self, event):
        await self.send_json(event['payload'])
