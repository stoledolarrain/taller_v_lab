"""
Manejador global de excepciones de DRF con logging estructurado.
Captura todos los errores 4xx/5xx de la API (validación, permisos, crashes)
sin exponer request.data (contraseñas o tokens).
"""
import logging
from rest_framework.views import exception_handler

logger = logging.getLogger('apps.api')


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    request = context.get('request')
    user = getattr(request, 'user', None)
    username = user.username if user and getattr(user, 'is_authenticated', False) else 'anon'
    method = getattr(request, 'method', '-')
    path = getattr(request, 'path', '-')

    if response is None:
        logger.exception('API 500 %s %s user=%s', method, path, username)
        return None

    if response.status_code >= 500:
        logger.error(
            'API %s %s %s user=%s detail=%s',
            response.status_code, method, path, username, response.data,
        )
    elif response.status_code in (400, 401, 403, 404):
        logger.warning(
            'API %s %s %s user=%s detail=%s',
            response.status_code, method, path, username, response.data,
        )

    return response
