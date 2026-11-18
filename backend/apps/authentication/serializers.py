from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializador para representación del perfil de usuario."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'phone_number',
            'ci',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_ci(self, value):
        clean_val = value.strip() if value else ''
        if clean_val:
            user = self.instance
            qs = User.objects.filter(ci__iexact=clean_val)
            if user:
                qs = qs.exclude(pk=user.pk)
            if qs.exists():
                raise serializers.ValidationError('Ya existe un usuario registrado con esta cédula de identidad.')
        return clean_val

    def validate_phone_number(self, value):
        clean_val = value.strip() if value else ''
        if clean_val:
            user = self.instance
            qs = User.objects.filter(phone_number=clean_val)
            if user:
                qs = qs.exclude(pk=user.pk)
            if qs.exists():
                raise serializers.ValidationError('Ya existe un usuario registrado con este número de celular/teléfono.')
        return clean_val


class RegisterInputSerializer(serializers.Serializer):
    """Validador de datos de entrada para registro."""
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    ci = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')


class LoginInputSerializer(serializers.Serializer):
    """Validador de credenciales de inicio de sesión."""
    username_or_email = serializers.CharField()
    password = serializers.CharField(write_only=True)
