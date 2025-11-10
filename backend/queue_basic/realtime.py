from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def notify_queue_update(data: dict) -> None:
    """
    Broadcast a queue update to all connected WebSocket clients.
    """
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(
        "queue_updates",
        {"type": "queue.update", "data": data},
    )

