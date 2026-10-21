import secrets
from decimal import Decimal
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


class RoundStatus(models.TextChoices):
    ACTIVA = 'ACTIVA', 'Activa'
    CERRADA = 'CERRADA', 'Cerrada'


class ContributionStatus(models.TextChoices):
    PENDIENTE = 'PENDIENTE', 'Pendiente'
    PAGADA = 'PAGADA', 'Pagada'


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


class Round(models.Model):
    """
    Ciclo periódico de recaudación de cuotas con un beneficiario asignado.
    """
    group = models.ForeignKey(
        PasanakuGroup,
        on_delete=models.CASCADE,
        related_name='rounds',
        verbose_name='grupo de pasanaku'
    )
    round_number = models.PositiveIntegerField('número de ronda')
    beneficiary = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='beneficiary_rounds',
        verbose_name='beneficiario de la ronda'
    )
    status = models.CharField(
        'estado de la ronda',
        max_length=20,
        choices=RoundStatus.choices,
        default=RoundStatus.ACTIVA
    )
    expected_amount = models.DecimalField(
        'monto total esperado',
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text='Total esperado a recaudar (cuota * número de integrantes).'
    )
    start_date = models.DateField('fecha de inicio de la ronda')
    end_date = models.DateField('fecha límite de la ronda', null=True, blank=True)

    delivered_to_beneficiary = models.BooleanField(
        'entrega confirmada al beneficiario',
        default=False
    )
    delivered_at = models.DateTimeField(
        'fecha de entrega del fondo',
        null=True,
        blank=True
    )
    closed_at = models.DateTimeField(
        'fecha de cierre de ronda',
        null=True,
        blank=True
    )

    created_at = models.DateTimeField('fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('última modificación', auto_now=True)

    class Meta:
        verbose_name = 'Ronda de Pasanaku'
        verbose_name_plural = 'Rondas de Pasanaku'
        ordering = ['round_number']
        constraints = [
            models.UniqueConstraint(
                fields=['group', 'round_number'],
                name='unique_round_number_in_group'
            )
        ]

    def __str__(self):
        return f"Ronda {self.round_number} ({self.status}) - {self.group.name} - Beneficiario: {self.beneficiary.username}"

    @property
    def is_active(self) -> bool:
        return self.status == RoundStatus.ACTIVA

    @property
    def is_closed(self) -> bool:
        return self.status == RoundStatus.CERRADA

    @property
    def total_collected(self) -> Decimal:
        """Suma de cuotas en estado PAGADA."""
        paid_sum = self.contributions.filter(
            status=ContributionStatus.PAGADA
        ).aggregate(total=models.Sum('amount'))['total']
        return paid_sum or Decimal('0.00')

    @property
    def total_pending(self) -> Decimal:
        """Suma de cuotas en estado PENDIENTE."""
        pending_sum = self.contributions.filter(
            status=ContributionStatus.PENDIENTE
        ).aggregate(total=models.Sum('amount'))['total']
        return pending_sum or Decimal('0.00')

    @property
    def has_pending_contributions(self) -> bool:
        """Determina si la ronda tiene cuotas pendientes de pago."""
        return self.contributions.filter(status=ContributionStatus.PENDIENTE).exists()


class Contribution(models.Model):
    """
    Cuota individual que un participante debe aportar en una ronda específica.
    """
    round = models.ForeignKey(
        Round,
        on_delete=models.CASCADE,
        related_name='contributions',
        verbose_name='ronda'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='contributions',
        verbose_name='participante'
    )
    amount = models.DecimalField(
        'monto del aporte',
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    status = models.CharField(
        'estado del aporte',
        max_length=20,
        choices=ContributionStatus.choices,
        default=ContributionStatus.PENDIENTE
    )
    payment_date = models.DateTimeField(
        'fecha de pago/reporte',
        null=True,
        blank=True
    )
    validation_date = models.DateTimeField(
        'fecha de validación por admin',
        null=True,
        blank=True
    )
    validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_contributions',
        verbose_name='administrador validador'
    )
    notes = models.CharField(
        'notas o comprobante de pago',
        max_length=255,
        blank=True,
        default=''
    )

    created_at = models.DateTimeField('fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('última modificación', auto_now=True)

    class Meta:
        verbose_name = 'Aporte de Pasanaku'
        verbose_name_plural = 'Aportes de Pasanaku'
        ordering = ['round', 'user']
        constraints = [
            models.UniqueConstraint(
                fields=['round', 'user'],
                name='unique_user_contribution_per_round'
            )
        ]

    def __str__(self):
        return f"Aporte {self.user.username} - Ronda {self.round.round_number}: {self.amount} Bs ({self.status})"
