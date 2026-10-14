from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .serializers import (
    PasanakuGroupListSerializer,
    PasanakuGroupDetailSerializer,
    PasanakuGroupCreateInputSerializer,
    PasanakuGroupUpdateInputSerializer,
    JoinGroupInputSerializer,
)
from .services import (
    group_create,
    group_update,
    group_join_by_code,
    group_regenerate_invite_code,
    group_leave,
)
from .selectors import group_list_for_user, group_get_by_id


class GroupListCreateAPIView(APIView):
    """
    Listar grupos del usuario autenticado o crear un nuevo pasanaku.
    GET /api/v1/groups/
    POST /api/v1/groups/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        groups = group_list_for_user(user=request.user)
        serializer = PasanakuGroupListSerializer(
            groups,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PasanakuGroupCreateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group = group_create(
            creator=request.user,
            **serializer.validated_data
        )

        detail_serializer = PasanakuGroupDetailSerializer(
            group,
            context={'request': request}
        )
        return Response(
            {
                'message': 'Grupo de pasanaku creado exitosamente.',
                'group': detail_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class GroupDetailAPIView(APIView):
    """
    Consultar o modificar un grupo existente.
    GET /api/v1/groups/<int:pk>/
    PATCH /api/v1/groups/<int:pk>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        serializer = PasanakuGroupDetailSerializer(
            group,
            context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        serializer = PasanakuGroupUpdateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_group = group_update(
            group=group,
            user=request.user,
            **serializer.validated_data
        )

        detail_serializer = PasanakuGroupDetailSerializer(
            updated_group,
            context={'request': request}
        )
        return Response(
            {
                'message': 'Configuración del grupo actualizada exitosamente.',
                'group': detail_serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class GroupJoinAPIView(APIView):
    """
    Unirse a un grupo mediante código de invitación.
    POST /api/v1/groups/join/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinGroupInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        membership = group_join_by_code(
            user=request.user,
            invite_code=serializer.validated_data['invite_code']
        )

        detail_serializer = PasanakuGroupDetailSerializer(
            membership.group,
            context={'request': request}
        )
        return Response(
            {
                'message': f'Te has unido exitosamente al grupo "{membership.group.name}".',
                'group': detail_serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class GroupRegenerateInviteCodeAPIView(APIView):
    """
    Regenerar código de invitación (Solo Administrador y en BORRADOR).
    POST /api/v1/groups/<int:pk>/regenerate-code/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        new_code = group_regenerate_invite_code(group=group, user=request.user)
        return Response(
            {
                'message': 'Código de invitación regenerado exitosamente.',
                'invite_code': new_code,
            },
            status=status.HTTP_200_OK,
        )


class GroupLeaveAPIView(APIView):
    """
    Abandonar grupo de pasanaku (Solo permitido en estado BORRADOR).
    POST /api/v1/groups/<int:pk>/leave/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        group_leave(group=group, user=request.user)
        return Response(
            {'message': f'Has abandonado el grupo "{group.name}".'},
            status=status.HTTP_200_OK,
        )
