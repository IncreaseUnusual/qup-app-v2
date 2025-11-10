from django.urls import path
from .views import (
    BasicQueueEntryListCreateView,
    BasicQueueEntryStatusUpdateView,
    BasicQueueEntryDeleteView,
    SeatingOptimizeView,
)

urlpatterns = [
    path('queue/', BasicQueueEntryListCreateView.as_view(), name='queue-list-create'),
    path('queue/<int:pk>/', BasicQueueEntryStatusUpdateView.as_view(), name='queue-update'),
    path('queue/<int:pk>/delete/', BasicQueueEntryDeleteView.as_view(), name='queue-delete'),
    path('queue/optimize/', SeatingOptimizeView.as_view(), name='queue-optimize'),
]
