from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination

from .serializers import (
    PasanakuGroupListSerializer,
    PasanakuGroupDetailSerializer,
    PasanakuGroupPreviewSerializer,
    PasanakuGroupCreateInputSerializer,
    PasanakuGroupUpdateInputSerializer,
    JoinGroupInputSerializer,
    JoinGroupByQRInputSerializer,
    JoinRequestMessageInputSerializer,
    GroupJoinRequestSerializer,
    RemoveMemberInputSerializer,
    PasanakuTurnSerializer,
    TurnManualAssignInputSerializer,
    RoundSerializer,
    RoundDetailSerializer,
    ContributionSerializer,
    ContributionReportInputSerializer,
    InternalReminderSerializer,
    ReminderCreateInputSerializer,
)
from .services import (
    group_create,
    group_update,
    group_join_by_code,
    group_join_by_qr,
    group_join_or_request,
    join_request_approve,
    join_request_reject,
    group_regenerate_invite_code,
    group_leave,
    group_remove_member,
    turn_assign_manual,
    turn_raffle_auto,
    group_start,
    contribution_report_payment,
    contribution_validate_payment,
    round_close_and_advance,
    reminder_create_for_pending,
    reminder_mark_as_read,
)
from .selectors import (
    group_list_for_user,
    group_list_public,
    group_get_by_id,
    group_get_by_invite_code,
    join_request_list_for_group,
    join_request_get_by_id,
    turn_list_for_group,
    round_list_for_group,
    round_get_current,
    round_get_by_id,
    contribution_get_by_id,
    contribution_list_for_round,
    contribution_list_for_user,
    group_get_financial_summary,
    reminder_list_for_user,
)


class GroupPagination(PageNumberPagination):
    """Paginación estándar DRF para listados de grupos de pasanaku."""
    page_size = 6
    page_size_query_param = 'page_size'
    max_page_size = 50


class GroupListCreateAPIView(APIView):
    """
    Listar grupos del usuario autenticado (paginado) o crear un nuevo pasanaku.
    GET /api/v1/groups/?page=1&page_size=6
    POST /api/v1/groups/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        groups = group_list_for_user(user=request.user)
        paginator = GroupPagination()
        page = paginator.paginate_queryset(groups, request, view=self)
        serializer = PasanakuGroupListSerializer(
            page,
            many=True,
            context={'request': request}
        )
        return paginator.get_paginated_response(serializer.data)

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
    Unirse a un grupo mediante código de invitación (aplica filtro de reputación).
    POST /api/v1/groups/join/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinGroupInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        clean_code = serializer.validated_data['invite_code'].strip().upper()
        group = group_get_by_invite_code(invite_code=clean_code)
        membership, join_req = group_join_or_request(
            user=request.user,
            group=group,
            bypass_reputation=False,
            message=serializer.validated_data.get('message', ''),
        )

        if join_req is not None:
            return Response(
                {
                    'message': (
                        f'Tu reputación actual ({request.user.reputation}) es menor a la requerida '
                        f'({group.min_reputation}). Se envió una solicitud al administrador.'
                    ),
                    'status': 'PENDING_APPROVAL',
                    'join_request': GroupJoinRequestSerializer(join_req).data,
                },
                status=status.HTTP_202_ACCEPTED,
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


class GroupJoinByQRAPIView(APIView):
    """
    Unirse automáticamente a un grupo escaneando su código QR (omite reputación y aprobación).
    POST /api/v1/groups/join-qr/
    Body: {"qr_token": "<token>"}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinGroupByQRInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        membership = group_join_by_qr(
            user=request.user,
            qr_token=serializer.validated_data['qr_token'],
        )
        return Response(
            {
                'message': f'Te has unido exitosamente al grupo "{membership.group.name}" vía QR.',
                'group': PasanakuGroupDetailSerializer(membership.group, context={'request': request}).data,
            },
            status=status.HTTP_200_OK,
        )


class PublicGroupListAPIView(APIView):
    """
    Listar pasanakus públicos disponibles (paginado) con filtro opcional ?min_reputation=.
    GET /api/v1/groups/public/?page=1&page_size=6&min_reputation=ALTA
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        min_rep = request.query_params.get('min_reputation')
        groups = group_list_public(min_reputation=min_rep)
        paginator = GroupPagination()
        page = paginator.paginate_queryset(groups, request, view=self)
        serializer = PasanakuGroupListSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class PublicGroupJoinAPIView(APIView):
    """
    Unirse o solicitar ingreso a un pasanaku público según reputación.
    POST /api/v1/groups/<int:pk>/join-public/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        from .models import PasanakuGroup
        from rest_framework.exceptions import NotFound

        group = PasanakuGroup.objects.filter(id=pk, is_public=True).first()
        if not group:
            raise NotFound('El grupo público solicitado no existe.')

        serializer = JoinRequestMessageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        membership, join_req = group_join_or_request(
            user=request.user,
            group=group,
            bypass_reputation=False,
            message=serializer.validated_data.get('message', ''),
        )

        if join_req is not None:
            return Response(
                {
                    'message': 'Solicitud enviada al administrador para aprobación previa.',
                    'status': 'PENDING_APPROVAL',
                    'join_request': GroupJoinRequestSerializer(join_req).data,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        return Response(
            {
                'message': f'Te has unido exitosamente al grupo público "{membership.group.name}".',
                'group': PasanakuGroupDetailSerializer(membership.group, context={'request': request}).data,
            },
            status=status.HTTP_200_OK,
        )


class GroupJoinRequestListAPIView(APIView):
    """
    Listar solicitudes de ingreso de un grupo (Solo Administrador).
    GET /api/v1/groups/<int:pk>/join-requests/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        requests_qs = join_request_list_for_group(group=group, admin_user=request.user)
        return Response(GroupJoinRequestSerializer(requests_qs, many=True).data, status=status.HTTP_200_OK)


class JoinRequestApproveAPIView(APIView):
    """
    Aprobar solicitud de ingreso pendiente (Solo Administrador).
    POST /api/v1/groups/join-requests/<int:pk>/approve/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        join_req = join_request_get_by_id(request_id=pk)
        membership = join_request_approve(join_request=join_req, admin_user=request.user)
        return Response(
            {
                'message': f'Solicitud aprobada: {membership.user.username} ahora es miembro del grupo.',
                'group': PasanakuGroupDetailSerializer(membership.group, context={'request': request}).data,
            },
            status=status.HTTP_200_OK,
        )


class JoinRequestRejectAPIView(APIView):
    """
    Rechazar solicitud de ingreso pendiente (Solo Administrador).
    POST /api/v1/groups/join-requests/<int:pk>/reject/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        join_req = join_request_get_by_id(request_id=pk)
        rejected = join_request_reject(join_request=join_req, admin_user=request.user)
        return Response(
            {
                'message': 'Solicitud rechazada.',
                'join_request': GroupJoinRequestSerializer(rejected).data,
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


class GroupRoundListAPIView(APIView):
    """
    Listar las rondas de un grupo.
    GET /api/v1/groups/<int:pk>/rounds/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        rounds = round_list_for_group(group=group, user=request.user)
        serializer = RoundSerializer(rounds, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GroupCurrentRoundAPIView(APIView):
    """
    Obtener la ronda activa actual de un grupo con el detalle de sus aportes.
    GET /api/v1/groups/<int:pk>/rounds/current/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        current_round = round_get_current(group=group, user=request.user)
        if not current_round:
            return Response(
                {'message': 'No existe ninguna ronda activa en este grupo.'},
                status=status.HTTP_200_OK
            )
        serializer = RoundDetailSerializer(current_round)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RoundDetailAPIView(APIView):
    """
    Consultar el detalle de una ronda específica y sus aportes.
    GET /api/v1/rounds/<int:pk>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        round_obj = round_get_by_id(round_id=pk, user=request.user)
        serializer = RoundDetailSerializer(round_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RoundContributionsAPIView(APIView):
    """
    Listar los aportes de una ronda específica.
    GET /api/v1/rounds/<int:pk>/contributions/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        round_obj = round_get_by_id(round_id=pk, user=request.user)
        contributions = contribution_list_for_round(round_obj=round_obj, user=request.user)
        serializer = ContributionSerializer(contributions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ContributionPayAPIView(APIView):
    """
    Reportar o registrar el pago de un aporte (por el participante o admin).
    POST /api/v1/contributions/<int:pk>/pay/
    Body: {"notes": "Comprobante de transferencia #12345"}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        contribution = contribution_get_by_id(contribution_id=pk, user=request.user)
        serializer = ContributionReportInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_contrib = contribution_report_payment(
            contribution=contribution,
            user=request.user,
            notes=serializer.validated_data.get('notes', '')
        )
        return Response(
            {
                'message': 'Pago de cuota reportado exitosamente.',
                'contribution': ContributionSerializer(updated_contrib).data,
            },
            status=status.HTTP_200_OK,
        )


class ContributionValidateAPIView(APIView):
    """
    Validar un aporte y marcarlo como PAGADO (Solo Administrador).
    POST /api/v1/contributions/<int:pk>/validate/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        contribution = contribution_get_by_id(contribution_id=pk, user=request.user)
        validated_contrib = contribution_validate_payment(
            contribution=contribution,
            admin_user=request.user
        )
        return Response(
            {
                'message': 'Aporte validado exitosamente como PAGADO.',
                'contribution': ContributionSerializer(validated_contrib).data,
            },
            status=status.HTTP_200_OK,
        )


class RoundCloseAndAdvanceAPIView(APIView):
    """
    Cerrar la ronda actual, confirmar entrega al beneficiario y avanzar al siguiente turno.
    POST /api/v1/rounds/<int:pk>/close/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        round_obj = round_get_by_id(round_id=pk, user=request.user)
        closed_round, next_round = round_close_and_advance(
            round_obj=round_obj,
            admin_user=request.user
        )

        response_data = {
            'message': (
                f'Ronda {closed_round.round_number} cerrada con éxito y '
                f'monto de Bs {closed_round.expected_amount} entregado a {closed_round.beneficiary.username}.'
            ),
            'closed_round': RoundSerializer(closed_round).data,
        }

        if next_round:
            response_data['next_round'] = RoundDetailSerializer(next_round).data
            response_data['is_finished'] = False
        else:
            response_data['is_finished'] = True
            response_data['group_status'] = 'FINALIZADO'
            response_data['message'] += ' ¡Todos los turnos fueron completados y el pasanaku ha FINALIZADO!'

        return Response(response_data, status=status.HTTP_200_OK)


class UserContributionsAPIView(APIView):
    """
    Consultar todas las cuotas (pendientes y pagadas) del usuario autenticado.
    GET /api/v1/users/me/contributions/?group_id=X
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        group_id_param = request.query_params.get('group_id')
        group_id = int(group_id_param) if group_id_param and group_id_param.isdigit() else None
        contributions = contribution_list_for_user(user=request.user, group_id=group_id)
        serializer = ContributionSerializer(contributions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GroupFinancialSummaryAPIView(APIView):
    """
    Estado de cuenta, totales financieros y deudores del grupo (PDF Sección 8).
    GET /api/v1/groups/<int:pk>/summary/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        summary = group_get_financial_summary(group=group, user=request.user)
        return Response(summary, status=status.HTTP_200_OK)


class GroupSendRemindersAPIView(APIView):
    """
    Generar recordatorios internos a los deudores de la ronda activa (PDF Sección 9).
    POST /api/v1/groups/<int:pk>/reminders/
    Body: {"message": "Por favor realiza tu aporte antes del fin de semana"}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        group = group_get_by_id(group_id=pk, user=request.user)
        serializer = ReminderCreateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reminders = reminder_create_for_pending(
            group=group,
            admin_user=request.user,
            custom_message=serializer.validated_data.get('message', '')
        )
        return Response(
            {
                'message': f'Se enviaron {len(reminders)} recordatorio(s) interno(s) con éxito.',
                'reminders': InternalReminderSerializer(reminders, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class UserRemindersListAPIView(APIView):
    """
    Consultar las notificaciones internas recibidas por el usuario autenticado.
    GET /api/v1/users/me/reminders/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reminders = reminder_list_for_user(user=request.user)
        serializer = InternalReminderSerializer(reminders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReminderMarkReadAPIView(APIView):
    """
    Marcar un recordatorio interno como leído.
    POST /api/v1/reminders/<int:pk>/read/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        reminder = reminder_mark_as_read(reminder_id=pk, user=request.user)
        return Response(
            {
                'message': 'Recordatorio marcado como leído.',
                'reminder': InternalReminderSerializer(reminder).data,
            },
            status=status.HTTP_200_OK,
        )
