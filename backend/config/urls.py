"""
URL configuration for Pasanaku Digital backend.
"""
from django.contrib import admin
from django.urls import path, include
from apps.groups.views import (
    RoundDetailAPIView,
    RoundContributionsAPIView,
    RoundCloseAndAdvanceAPIView,
    ContributionPayAPIView,
    ContributionValidateAPIView,
    ContributionGenerateQRAPIView,
    PaymentQRDetailAPIView,
    PaymentQRConfirmAPIView,
    UserContributionsAPIView,
    UserRemindersListAPIView,
    ReminderMarkReadAPIView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/groups/', include('apps.groups.urls')),

    # Rutas RESTful directas para Rondas y Aportes
    path('api/v1/rounds/<int:pk>/', RoundDetailAPIView.as_view(), name='direct_round_detail'),
    path('api/v1/rounds/<int:pk>/contributions/', RoundContributionsAPIView.as_view(), name='direct_round_contributions'),
    path('api/v1/rounds/<int:pk>/close/', RoundCloseAndAdvanceAPIView.as_view(), name='direct_round_close'),
    path('api/v1/contributions/<int:pk>/pay/', ContributionPayAPIView.as_view(), name='direct_contribution_pay'),
    path('api/v1/contributions/<int:pk>/validate/', ContributionValidateAPIView.as_view(), name='direct_contribution_validate'),
    path('api/v1/contributions/<int:pk>/qr/generate/', ContributionGenerateQRAPIView.as_view(), name='direct_contribution_qr_generate'),
    path('api/v1/payments/qr/<str:qr_reference>/', PaymentQRDetailAPIView.as_view(), name='direct_payment_qr_detail'),
    path('api/v1/payments/qr/<str:qr_reference>/confirm/', PaymentQRConfirmAPIView.as_view(), name='direct_payment_qr_confirm'),
    path('api/v1/users/me/contributions/', UserContributionsAPIView.as_view(), name='user_contributions'),
    path('api/v1/users/me/reminders/', UserRemindersListAPIView.as_view(), name='user_reminders'),
    path('api/v1/reminders/<int:pk>/read/', ReminderMarkReadAPIView.as_view(), name='reminder_mark_read'),
]
