from django.urls import re_path

from .consumers import GroupConsumer, UserNotificationsConsumer

websocket_urlpatterns = [
    re_path(r'^ws/groups/(?P<group_id>\d+)/$', GroupConsumer.as_asgi()),
    re_path(r'^ws/users/me/$', UserNotificationsConsumer.as_asgi()),
]
