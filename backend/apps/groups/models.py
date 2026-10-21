import secrets
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


class GroupStatus(models.TextChoices):
    BORRADOR = 'BORRADOR', 'Borrador'
    INICIADO = 'INICIADO', 'Iniciado'
    FINALIZADO = 'FINALIZADO', 'Finalizado'


class Periodicity(models.TextChoices):
    SEMANAL = 'SEMANAL', 'Semanal'
    QUINCENAL = 'QUINCENAL', 'Quincenal'
    MENSUAL = 'MENSUAL', 'Mensual'


class MembershipRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Administrador del grupo'
    PARTICIPANTE = 'PARTICIPANTE', 'Participante'


def generate_invite_code() -> str:
    """Genera un código alfanumérico aleatorio y legible de 8 caracteres."""
    return secrets.token_hex(4).upper()


class PasanakuGroup(models.Model):
    """
    Modelo representativo de un grupo de Pasanaku (ahorro rotativo).
    Regulado por estados: BORRADOR, INICIADO y FINALIZADO.
    """
    name = models.CharField('nombre del grupo', max_length=150)
    description = models.TextField('descripción', blank=True, default='')

    quota_amount = models.DecimalField(
        'monto de la cuota',
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text='Monto fijo que cada integrante aportará por ronda (en bolivianos).'
    )
    currency = models.CharField('moneda', max_length=5, default='BOB')

    periodicity = models.CharField(
        'periodicidad',
        max_length=20,
        choices=Periodicity.choices,
        default=Periodicity.MENSUAL,
        help_text='Frecuencia de las rondas de ahorro (semanal, quincenal o mensual).'
    )

    start_date = models.DateField(
        'fecha de inicio',
        help_text='Fecha prevista para el inicio de la primera ronda.'
    )

    total_members = models.PositiveIntegerField(
        'cantidad de participantes',
        validators=[MinValueValidator(2)],
        help_text='Cupo total de participantes requeridos para iniciar el pasanaku.'
    )

    status = models.CharField(
        'estado del grupo',
        max_length=20,
        choices=GroupStatus.choices,
        default=GroupStatus.BORRADOR
    )

    invite_code = models.CharField(
        'código de invitación',
        max_length=12,
        unique=True,
        db_index=True,
        default=generate_invite_code,
        help_text='Código único para que otros participantes se unan al grupo.'
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_pasanakus',
        verbose_name='creador del grupo'
    )

    created_at = models.DateTimeField('fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('última modificación', auto_now=True)

    class Meta:
        verbose_name = 'Grupo de Pasanaku'
        verbose_name_plural = 'Grupos de Pasanaku'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.status}) - Bs {self.quota_amount} {self.periodicity}"

    @property
    def is_draft(self) -> bool:
        return self.status == GroupStatus.BORRADOR

    @property
    def is_started(self) -> bool:
        return self.status == GroupStatus.INICIADO

    @property
    def is_finished(self) -> bool:
        return self.status == GroupStatus.FINALIZADO

    @property
    def current_members_count(self) -> int:
        return self.memberships.count()

    @property
    def is_full(self) -> bool:
        return self.current_members_count >= self.total_members

    @property
    def remaining_slots(self) -> int:
        """Cantidad de cupos aún disponibles para unirse."""
        return max(0, self.total_members - self.current_members_count)

    @property
    def can_start(self) -> bool:
        """El pasanaku solo puede iniciar en BORRADOR, con cupos llenos y turnos asignados."""
        return (
            self.is_draft
            and self.current_members_count == self.total_members
            and self.has_all_turns_assigned
        )

    @property
    def has_all_turns_assigned(self) -> bool:
        """Comprueba si todos los turnos del 1 a total_members están asignados 1:1."""
        if self.turns.count() != self.total_members:
            return False
        turn_numbers = set(self.turns.values_list('turn_number', flat=True))
        return turn_numbers == set(range(1, self.total_members + 1))

    @property
    def total_expected_per_round(self):
        """Monto acumulado por ronda: cuota * cantidad de participantes."""
        return self.quota_amount * self.total_members


class GroupMembership(models.Model):
    """
    Relación de pertenencia de un usuario a un grupo de pasanaku con su rol.
    Garantiza que un usuario no pueda registrarse más de una vez en el mismo grupo.
    """
    group = models.ForeignKey(
        PasanakuGroup,
        on_delete=models.CASCADE,
        related_name='memberships',
        verbose_name='grupo'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pasanaku_memberships',
        verbose_name='usuario participante'
    )
    role = models.CharField(
        'rol en el grupo',
        max_length=20,
        choices=MembershipRole.choices,
        default=MembershipRole.PARTICIPANTE
    )
    joined_at = models.DateTimeField('fecha de ingreso', auto_now_add=True)

    class Meta:
        verbose_name = 'Membresía de Grupo'
        verbose_name_plural = 'Membresías de Grupo'
        ordering = ['joined_at']
        constraints = [
            models.UniqueConstraint(
                fields=['group', 'user'],
                name='unique_user_in_group'
            )
        ]

    def __str__(self):
        return f"{self.user.username} en {self.group.name} como {self.role}"


class PasanakuTurn(models.Model):
    """
    Asignación estricta de turno para la recepción del fondo en una ronda.
    Reglas del negocio:
    - Cada integrante debe aparecer exactamente una vez como beneficiario (1:1).
    - Los turnos van de 1 a N (cantidad total de participantes).
    - No puede haber turnos sin beneficiario ni beneficiarios con múltiples turnos.
    """
    group = models.ForeignKey(
        PasanakuGroup,
        on_delete=models.CASCADE,
        related_name='turns',
        verbose_name='grupo'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pasanaku_turns',
        verbose_name='beneficiario'
    )
    turn_number = models.PositiveIntegerField('número de turno')
    created_at = models.DateTimeField('fecha de asignación', auto_now_add=True)
    updated_at = models.DateTimeField('última modificación', auto_now=True)

    class Meta:
        verbose_name = 'Turno de Pasanaku'
        verbose_name_plural = 'Turnos de Pasanaku'
        ordering = ['turn_number']
        constraints = [
            models.UniqueConstraint(
                fields=['group', 'turn_number'],
                name='unique_turn_number_in_group'
            ),
            models.UniqueConstraint(
                fields=['group', 'user'],
                name='unique_user_turn_in_group'
            )
        ]

    def __str__(self):
        return f"Turno {self.turn_number}: {self.user.username} en {self.group.name}"
