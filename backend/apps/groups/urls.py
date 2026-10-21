from django.urls import path
from .views import (
    GroupListCreateAPIView,
    GroupDetailAPIView,
    GroupPreviewByCodeAPIView,
    GroupJoinAPIView,
    GroupRegenerateInviteCodeAPIView,
    GroupLeaveAPIView,
    GroupRemoveMemberAPIView,
    GroupTurnListAPIView,
    GroupTurnManualAssignAPIView,
    GroupTurnRaffleAPIView,
    GroupStartAPIView,
    GroupRoundListAPIView,
    GroupCurrentRoundAPIView,
    RoundDetailAPIView,
    RoundContributionsAPIView,
    RoundCloseAndAdvanceAPIView,
    ContributionPayAPIView,
    ContributionValidateAPIView,
    GroupFinancialSummaryAPIView,
    GroupSendRemindersAPIView,
)

app_name = 'groups'

urlpatterns = [
    # Grupos y miembros
    path('', GroupListCreateAPIView.as_view(), name='list_create'),
    path('preview/', GroupPreviewByCodeAPIView.as_view(), name='preview'),
    path('join/', GroupJoinAPIView.as_view(), name='join'),
    path('<int:pk>/', GroupDetailAPIView.as_view(), name='detail'),
    path('<int:pk>/regenerate-code/', GroupRegenerateInviteCodeAPIView.as_view(), name='regenerate_code'),
    path('<int:pk>/leave/', GroupLeaveAPIView.as_view(), name='leave'),
    path('<int:pk>/remove-member/', GroupRemoveMemberAPIView.as_view(), name='remove_member'),

    # Turnos
    path('<int:pk>/turns/', GroupTurnListAPIView.as_view(), name='turns_list'),
    path('<int:pk>/turns/manual/', GroupTurnManualAssignAPIView.as_view(), name='turns_manual'),
    path('<int:pk>/turns/raffle/', GroupTurnRaffleAPIView.as_view(), name='turns_raffle'),

    # Inicio del Pasanaku
    path('<int:pk>/start/', GroupStartAPIView.as_view(), name='start'),

    # Rondas
    path('<int:pk>/rounds/', GroupRoundListAPIView.as_view(), name='rounds_list'),
    path('<int:pk>/rounds/current/', GroupCurrentRoundAPIView.as_view(), name='current_round'),

    # Métricas y Recordatorios por Grupo
    path('<int:pk>/summary/', GroupFinancialSummaryAPIView.as_view(), name='financial_summary'),
    path('<int:pk>/reminders/', GroupSendRemindersAPIView.as_view(), name='send_reminders'),

    # Rutas anidadas de Rondas y Aportes
    path('rounds/<int:pk>/', RoundDetailAPIView.as_view(), name='round_detail'),
    path('rounds/<int:pk>/contributions/', RoundContributionsAPIView.as_view(), name='round_contributions'),
    path('rounds/<int:pk>/close/', RoundCloseAndAdvanceAPIView.as_view(), name='round_close'),
    path('contributions/<int:pk>/pay/', ContributionPayAPIView.as_view(), name='contribution_pay'),
    path('contributions/<int:pk>/validate/', ContributionValidateAPIView.as_view(), name='contribution_validate'),
]
