from typing import Dict, Any, Tuple, Optional
from django.db import transaction
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import ValidationError, AuthenticationFailed

from .models import User


def get_tokens_for_user(user: User) -> Dict[str, str]:
    """Genera tokens JWT (access y refresh) para el usuario indicado."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@transaction.atomic
def user_register(
    *,
    username: str,
    email: str,
    password: str,
    first_name: str = '',
    last_name: str = '',
    phone_number: str = '',
    ci: str = ''
) -> Tuple[User, Dict[str, str]]:
    """
    Servicio de registro de un nuevo usuario en la plataforma.
    Valida unicidad y aplica hash a la contraseña de forma atómica.
    """
    if User.objects.filter(username=username).exists():
        raise ValidationError({'username': 'El nombre de usuario ya está en uso.'})

    if User.objects.filter(email__iexact=email).exists():
        raise ValidationError({'email': 'El correo electrónico ya está registrado.'})

    user = User(
        username=username.strip(),
        email=email.strip().lower(),
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        phone_number=phone_number.strip(),
        ci=ci.strip(),
    )
    user.set_password(password)
    user.save()

    tokens = get_tokens_for_user(user)
    return user, tokens


def user_authenticate(
    *,
    username_or_email: str,
    password: str
) -> Tuple[User, Dict[str, str]]:
    """
    Autentica un usuario permitiendo el ingreso tanto por nombre de usuario como por email.
    Retorna la instancia del usuario y sus tokens JWT.
    """
    clean_identifier = username_or_email.strip()
    target_username = clean_identifier

    # Si es un correo, buscamos el username correspondiente
    if '@' in clean_identifier:
        user_obj = User.objects.filter(email__iexact=clean_identifier).first()
        if user_obj:
            target_username = user_obj.username

    user = authenticate(username=target_username, password=password)

    if not user:
        raise AuthenticationFailed('Credenciales inválidas. Verifica tu usuario/correo y contraseña.')

    if not user.is_active:
        raise AuthenticationFailed('Esta cuenta ha sido desactivada.')

    tokens = get_tokens_for_user(user)
    return user, tokens
