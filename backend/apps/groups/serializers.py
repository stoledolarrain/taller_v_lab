from decimal import Decimal
from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from .models import PasanakuGroup, GroupMembership, Periodicity, MembershipRole


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


class PasanakuGroupListSerializer(serializers.ModelSerializer):
    """Serializador compacto para listados de grupos."""
    current_members_count = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
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
            'is_full',
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
    """Serializador detallado con lista de integrantes y código de invitación."""
    current_members_count = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    total_expected_per_round = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    memberships = GroupMembershipSerializer(many=True, read_only=True)
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
            'is_full',
            'total_expected_per_round',
            'status',
            'invite_code',
            'is_admin',
            'memberships',
            'created_at',
            'updated_at',
        ]

    def get_is_admin(self, obj: PasanakuGroup) -> bool:
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
            return False
        membership = obj.memberships.filter(user=user).first()
        return membership.role == MembershipRole.ADMIN if membership else False


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
