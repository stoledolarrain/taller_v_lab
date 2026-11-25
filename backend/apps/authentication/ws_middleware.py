"""
Middleware ASGI para autenticar conexiones WebSocket mediante SimpleJWT.

El cliente puede enviar el token de acceso de dos formas:
  1. Query string (estándar en navegadores): ws://host/ws/groups/1/?token=<access_token>
  2. Header HTTP: Authorization: Bearer <access_token>
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from .models import User


@database_sync_to_async
def _get_user_from_token(raw_token: str):
    try:
        validated = AccessToken(raw_token)
        user_id = validated.get('user_id')
        if not user_id:
            return AnonymousUser()
        return User.objects.filter(id=user_id, is_active=True).first() or AnonymousUser()
    except (TokenError, ValueError, TypeError):
        return AnonymousUser()


def _extract_token(scope) -> str:
    query_string = scope.get('query_string', b'').decode('utf-8', errors='ignore')
    query_params = parse_qs(query_string)
    token_list = query_params.get('token')
    if token_list and token_list[0].strip():
        return token_list[0].strip()

    headers = dict(scope.get('headers', []))
    auth_header = headers.get(b'authorization', b'').decode('utf-8', errors='ignore')
    if auth_header.lower().startswith('bearer '):
        return auth_header[7:].strip()

    return ''


class JWTAuthMiddleware(BaseMiddleware):
    """Resuelve scope['user'] a partir del access token JWT."""

    async def __call__(self, scope, receive, send):
        token = _extract_token(scope)
        scope['user'] = await _get_user_from_token(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
