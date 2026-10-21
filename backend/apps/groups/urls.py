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
)

app_name = 'groups'

urlpatterns = [
    path('', GroupListCreateAPIView.as_view(), name='list_create'),
    path('preview/', GroupPreviewByCodeAPIView.as_view(), name='preview'),
    path('join/', GroupJoinAPIView.as_view(), name='join'),
    path('<int:pk>/', GroupDetailAPIView.as_view(), name='detail'),
    path('<int:pk>/regenerate-code/', GroupRegenerateInviteCodeAPIView.as_view(), name='regenerate_code'),
    path('<int:pk>/leave/', GroupLeaveAPIView.as_view(), name='leave'),
    path('<int:pk>/remove-member/', GroupRemoveMemberAPIView.as_view(), name='remove_member'),
    path('<int:pk>/turns/', GroupTurnListAPIView.as_view(), name='turns_list'),
    path('<int:pk>/turns/manual/', GroupTurnManualAssignAPIView.as_view(), name='turns_manual'),
    path('<int:pk>/turns/raffle/', GroupTurnRaffleAPIView.as_view(), name='turns_raffle'),
    path('<int:pk>/start/', GroupStartAPIView.as_view(), name='start'),
]
