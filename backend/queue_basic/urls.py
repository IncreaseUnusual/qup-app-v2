from django.urls import path
from .views import (
    BasicQueueEntryListCreateView,
    BasicQueueEntryStatusUpdateView,
    BasicQueueEntryDeleteView,
)

urlpatterns = [
    path('queue/', BasicQueueEntryListCreateView.as_view(), name='queue-list-create'),
    path('queue/<int:pk>/', BasicQueueEntryStatusUpdateView.as_view(), name='queue-update'),
    path('queue/<int:pk>/delete/', BasicQueueEntryDeleteView.as_view(), name='queue-delete'),
]
