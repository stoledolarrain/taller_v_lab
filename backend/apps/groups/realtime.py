"""
Emisores de eventos en tiempo real (WebSockets) para Pasanaku Digital.

Todos los envíos se programan mediante transaction.on_commit() para garantizar
consistencia ACID: si una transacción @transaction.atomic hace rollback,
nunca se notifica a los clientes conectados.
"""
import logging
from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

logger = logging.getLogger(__name__)


def group_channel_name(group_id: int) -> str:
    return f'pasanaku_group_{group_id}'


def user_channel_name(user_id: int) -> str:
    return f'pasanaku_user_{user_id}'


def _dispatch_channel_event(channel_name: str, message_type: str, payload: dict[str, Any]) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    try:
        async_to_sync(channel_layer.group_send)(
            channel_name,
            {
                'type': message_type,
                'payload': payload,
            },
        )
    except Exception as exc:  # pragma: no cover - protección ante caídas puntuales de Redis
        logger.warning('No se pudo emitir evento WebSocket en %s: %s', channel_name, exc)


def emit_group_event(*, group_id: int, event: str, data: dict[str, Any]) -> None:
    """Programa la emisión de un evento a todos los miembros conectados al grupo."""
    payload = {
        'event': event,
        'group_id': group_id,
        'data': data,
    }
    transaction.on_commit(
        lambda: _dispatch_channel_event(group_channel_name(group_id), 'group_event', payload)
    )


def emit_user_event(*, user_id: int, event: str, data: dict[str, Any]) -> None:
    """Programa la emisión de una notificación personal al canal del usuario."""
    payload = {
        'event': event,
        'user_id': user_id,
        'data': data,
    }
    transaction.on_commit(
        lambda: _dispatch_channel_event(user_channel_name(user_id), 'user_event', payload)
    )
