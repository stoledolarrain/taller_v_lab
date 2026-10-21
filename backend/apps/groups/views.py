from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from .serializers import (
    PasanakuGroupListSerializer,
    PasanakuGroupDetailSerializer,
    PasanakuGroupPreviewSerializer,
    PasanakuGroupCreateInputSerializer,
    PasanakuGroupUpdateInputSerializer,
    JoinGroupInputSerializer,
    RemoveMemberInputSerializer,
    PasanakuTurnSerializer,
    TurnManualAssignInputSerializer,
)
from .services import (
    group_create,
    group_update,
    group_join_by_code,
    group_regenerate_invite_code,
    group_leave,
    group_remove_member,
    turn_assign_manual,
    turn_raffle_auto,
    group_start,
)
from .selectors import (
    group_list_for_user,
    group_get_by_id,
    group_get_by_invite_code,
    turn_list_for_group,
)


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


class GroupPreviewByCodeAPIView(APIView):
    """
    Previsualizar información de un grupo mediante su código de invitación antes de unirse.
    GET /api/v1/groups/preview/?code=XXXX
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        code = request.query_params.get('code')
        if not code:
            raise ValidationError({'code': 'Debe proporcionar un código de invitación.'})

        group = group_get_by_invite_code(invite_code=code)
        serializer = PasanakuGroupPreviewSerializer(group)
        return Response(serializer.data, status=status.HTTP_200_OK)


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


class GroupRemoveMemberAPIView(APIView):
    """
    Remover a un participante del grupo (Solo Administrador y en BORRADOR).
    POST /api/v1/groups/<int:pk>/remove-member/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        serializer = RemoveMemberInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group_remove_member(
            group=group,
            admin_user=request.user,
            target_user_id=serializer.validated_data['user_id']
        )
        return Response(
            {'message': 'Participante removido del grupo exitosamente.'},
            status=status.HTTP_200_OK,
        )


class GroupTurnListAPIView(APIView):
    """
    Listar los turnos configurados para un grupo.
    GET /api/v1/groups/<int:pk>/turns/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        turns = turn_list_for_group(group=group, user=request.user)
        serializer = PasanakuTurnSerializer(turns, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GroupTurnManualAssignAPIView(APIView):
    """
    Asignar turnos manualmente a los participantes (Solo Administrador y en BORRADOR).
    POST /api/v1/groups/<int:pk>/turns/manual/
    Body: {"assignments": [{"user_id": 1, "turn_number": 1}, ...]}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        serializer = TurnManualAssignInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        turns = turn_assign_manual(
            group=group,
            admin_user=request.user,
            assignments=serializer.validated_data['assignments']
        )
        return Response(
            {
                'message': 'Turnos asignados manualmente con éxito.',
                'turns': PasanakuTurnSerializer(turns, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class GroupTurnRaffleAPIView(APIView):
    """
    Sortear automáticamente los turnos entre los participantes (Solo Administrador y en BORRADOR).
    POST /api/v1/groups/<int:pk>/turns/raffle/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        turns = turn_raffle_auto(group=group, admin_user=request.user)
        return Response(
            {
                'message': 'Sorteo de turnos realizado exitosamente.',
                'turns': PasanakuTurnSerializer(turns, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class GroupStartAPIView(APIView):
    """
    Iniciar oficialmente el pasanaku (Solo Administrador).
    POST /api/v1/groups/<int:pk>/start/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        started_group = group_start(group=group, admin_user=request.user)
        detail_serializer = PasanakuGroupDetailSerializer(
            started_group,
            context={'request': request}
        )
        return Response(
            {
                'message': f'¡El pasanaku "{started_group.name}" ha sido iniciado oficialmente!',
                'group': detail_serializer.data,
            },
            status=status.HTTP_200_OK,
        )
