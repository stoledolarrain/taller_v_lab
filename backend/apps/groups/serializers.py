from decimal import Decimal
from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from .models import (
    PasanakuGroup,
    GroupMembership,
    PasanakuTurn,
    Periodicity,
    MembershipRole,
)


class GroupMembershipSerializer(serializers.ModelSerializer):
    """Representación de la pertenencia de un usuario en un grupo."""
    user = UserSerializer(read_only=True)

    class Meta:
        model = GroupMembership
        fields = [
            'id',
            'user',
            'role',
            'joined_at',
        ]
        read_only_fields = ['id', 'joined_at']


class PasanakuTurnSerializer(serializers.ModelSerializer):
    """Representación de un turno asignado a un beneficiario."""
    user = UserSerializer(read_only=True)

    class Meta:
        model = PasanakuTurn
        fields = [
            'id',
            'turn_number',
            'user',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PasanakuGroupListSerializer(serializers.ModelSerializer):
    """Serializador compacto para listados de grupos."""
    current_members_count = serializers.IntegerField(read_only=True)
    remaining_slots = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    can_start = serializers.BooleanField(read_only=True)
    has_all_turns_assigned = serializers.BooleanField(read_only=True)
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = PasanakuGroup
        fields = [
            'id',
            'name',
            'description',
            'quota_amount',
            'currency',
            'periodicity',
            'start_date',
            'total_members',
            'current_members_count',
            'remaining_slots',
            'is_full',
            'has_all_turns_assigned',
            'can_start',
            'status',
            'my_role',
            'created_at',
        ]

    def get_my_role(self, obj: PasanakuGroup) -> str:
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
            return 'INVITADO'
        membership = obj.memberships.filter(user=user).first()
        return membership.role if membership else 'NO_MIEMBRO'


class PasanakuGroupDetailSerializer(serializers.ModelSerializer):
    """Serializador detallado con lista de integrantes, código de invitación y turnos."""
    current_members_count = serializers.IntegerField(read_only=True)
    remaining_slots = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    has_all_turns_assigned = serializers.BooleanField(read_only=True)
    can_start = serializers.BooleanField(read_only=True)
    total_expected_per_round = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    memberships = GroupMembershipSerializer(many=True, read_only=True)
    turns = PasanakuTurnSerializer(many=True, read_only=True)
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = PasanakuGroup
        fields = [
            'id',
            'name',
            'description',
            'quota_amount',
            'currency',
            'periodicity',
            'start_date',
            'total_members',
            'current_members_count',
            'remaining_slots',
            'is_full',
            'has_all_turns_assigned',
            'can_start',
            'total_expected_per_round',
            'status',
            'invite_code',
            'is_admin',
            'memberships',
            'turns',
            'created_at',
            'updated_at',
        ]

    def get_is_admin(self, obj: PasanakuGroup) -> bool:
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
            return False
        membership = obj.memberships.filter(user=user).first()
        return membership.role == MembershipRole.ADMIN if membership else False


class PasanakuGroupPreviewSerializer(serializers.ModelSerializer):
    """Información pública/previa de un grupo consultado vía código de invitación."""
    current_members_count = serializers.IntegerField(read_only=True)
    remaining_slots = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    creator_name = serializers.SerializerMethodField()

    class Meta:
        model = PasanakuGroup
        fields = [
            'id',
            'name',
            'description',
            'quota_amount',
            'currency',
            'periodicity',
            'start_date',
            'total_members',
            'current_members_count',
            'remaining_slots',
            'is_full',
            'status',
            'creator_name',
        ]

    def get_creator_name(self, obj: PasanakuGroup) -> str:
        return obj.creator.get_full_name() or obj.creator.username


class PasanakuGroupCreateInputSerializer(serializers.Serializer):
    """Validador de entrada para crear un nuevo grupo de pasanaku."""
    name = serializers.CharField(max_length=150)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    quota_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    periodicity = serializers.ChoiceField(choices=Periodicity.choices)
    start_date = serializers.DateField()
    total_members = serializers.IntegerField(min_value=2)


class PasanakuGroupUpdateInputSerializer(serializers.Serializer):
    """Validador de entrada para actualizar la configuración de un grupo en borrador."""
    name = serializers.CharField(max_length=150, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    quota_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'), required=False)
    periodicity = serializers.ChoiceField(choices=Periodicity.choices, required=False)
    start_date = serializers.DateField(required=False)
    total_members = serializers.IntegerField(min_value=2, required=False)


class JoinGroupInputSerializer(serializers.Serializer):
    """Validador para unirse a un pasanaku con código de invitación."""
    invite_code = serializers.CharField(max_length=12, trim_whitespace=True)


class RemoveMemberInputSerializer(serializers.Serializer):
    """Validador para expulsar o remover a un participante de un grupo."""
    user_id = serializers.IntegerField(min_value=1)


class TurnAssignmentItemInputSerializer(serializers.Serializer):
    """Asignación individual de un turno a un usuario."""
    user_id = serializers.IntegerField(min_value=1)
    turn_number = serializers.IntegerField(min_value=1)


class TurnManualAssignInputSerializer(serializers.Serializer):
    """Validador para la lista completa de asignaciones manuales de turnos."""
    assignments = TurnAssignmentItemInputSerializer(many=True)
