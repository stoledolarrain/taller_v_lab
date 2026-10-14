from django.contrib.auth.models import AbstractUser
from django.db import models


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
    created_at = models.DateTimeField('fecha de registro', auto_now_add=True)
    updated_at = models.DateTimeField('última actualización', auto_now=True)

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-created_at']

    def __str__(self):
        full_name = self.get_full_name()
        return f"{full_name} (@{self.username})" if full_name else f"@{self.username}"
