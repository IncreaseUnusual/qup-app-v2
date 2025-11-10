from rest_framework import serializers
from django.utils import timezone
from .models import BasicQueueEntry      

class BasicQueueEntrySerializer(serializers.ModelSerializer):
    '''Serialize model to JSON.'''
    estimated_wait_minutes = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BasicQueueEntry
        fields = '__all__'
        read_only_fields = ('estimated_wait_minutes',)

    def get_estimated_wait_minutes(self, obj: BasicQueueEntry):
        if obj.status != 'waiting':
            return 0
        # Count waiting parties ahead (joined earlier)
        waiting_ahead = BasicQueueEntry.objects.filter(
            status='waiting',
            joined_at__lt=obj.joined_at
        ).count()
        average_minutes_per_party = 10
        return waiting_ahead * average_minutes_per_party
