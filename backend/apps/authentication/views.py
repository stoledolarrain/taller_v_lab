from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .serializers import (
    UserSerializer,
    RegisterInputSerializer,
    LoginInputSerializer,
)
from .services import user_register, user_authenticate


class RegisterAPIView(APIView):
    """
    Endpoint público para registrar un nuevo participante en Pasanaku Digital.
    POST /api/v1/auth/register/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, tokens = user_register(**serializer.validated_data)

        return Response(
            {
                'message': 'Usuario registrado exitosamente.',
                'user': UserSerializer(user).data,
                'tokens': tokens,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    """
    Endpoint público para iniciar sesión con username o email.
    POST /api/v1/auth/login/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, tokens = user_authenticate(**serializer.validated_data)

        return Response(
            {
                'message': 'Inicio de sesión exitoso.',
                'user': UserSerializer(user).data,
                'tokens': tokens,
            },
            status=status.HTTP_200_OK,
        )


class MeAPIView(APIView):
    """
    Endpoint autenticado para consultar y actualizar el perfil del usuario activo.
    GET /api/v1/auth/me/
    PATCH /api/v1/auth/me/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                'message': 'Perfil actualizado exitosamente.',
                'user': serializer.data,
            },
            status=status.HTTP_200_OK,
        )
