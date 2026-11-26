from django.contrib.auth.models import AbstractUser
from django.db import models


class ReputationLevel(models.TextChoices):
    BAJA = 'BAJA', 'Baja'
    MEDIA = 'MEDIA', 'Media'
    ALTA = 'ALTA', 'Alta'


REPUTATION_RANK = {
    ReputationLevel.BAJA: 1,
    ReputationLevel.MEDIA: 2,
    ReputationLevel.ALTA: 3,
}


class User(AbstractUser):
    """
    Modelo de usuario personalizado para Pasanaku Digital.
    Utiliza email único y añade campos de identificación específicos para el contexto boliviano.
    """
    email = models.EmailField(
        'correo electrónico',
        unique=True,
        error_messages={
            'unique': 'Ya existe un usuario registrado con este correo electrónico.',
        }
    )
    phone_number = models.CharField(
        'número de teléfono o celular',
        max_length=20,
        blank=True,
        default='',
        help_text='Número de contacto para notificaciones y WhatsApp (opcional).'
    )
    ci = models.CharField(
        'cédula de identidad',
        max_length=20,
        blank=True,
        default='',
        help_text='Número de C.I. para identificación en los grupos de pasanaku.'
    )
    reputation = models.CharField(
        'reputación / trust factor',
        max_length=10,
        choices=ReputationLevel.choices,
        default=ReputationLevel.MEDIA,
        help_text='Nivel de confianza del usuario dentro de la plataforma (BAJA, MEDIA, ALTA).'
    )
    created_at = models.DateTimeField('fecha de registro', auto_now_add=True)
    updated_at = models.DateTimeField('última actualización', auto_now=True)

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-created_at']

    def __str__(self):
        full_name = self.get_full_name()
        return f"{full_name} (@{self.username})" if full_name else f"@{self.username}"
