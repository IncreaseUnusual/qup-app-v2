from rest_framework import generics, permissions
from .serializer import BasicQueueEntrySerializer
from .models import BasicQueueEntry

class BasicQueueEntryListCreateView(generics.ListCreateAPIView):
    queryset = BasicQueueEntry.objects.all() # Get all entries
    serializer_class = BasicQueueEntrySerializer
    ordering = ['joined_at']
    filterset_fields = ['status']
    search_fields = ['name', 'phone_number']

    def get_permissions(self):
        # GET requires authentication (admin/staff), POST is open for signup
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

class BasicQueueEntryStatusUpdateView(generics.UpdateAPIView):
    queryset = BasicQueueEntry.objects.all()
    serializer_class = BasicQueueEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

class BasicQueueEntryDeleteView(generics.DestroyAPIView):
    queryset = BasicQueueEntry.objects.all()
    serializer_class = BasicQueueEntrySerializer
    permission_classes = [permissions.IsAuthenticated]