from django.db import models

class BasicQueueEntry(models.Model):
    '''Basic queue model'''
    name = models.CharField(max_length=120)
    party_size = models.PositiveIntegerField()
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('seated', 'Seated'),
        ('no_show', 'No Show'),
        ('cancelled', 'Cancelled')
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='waiting')

    def __str__(self):
        return f"{self.name} - Party of {self.party_size} ({self.status})"