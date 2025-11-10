from channels.generic.websocket import AsyncJsonWebsocketConsumer


class QueueConsumer(AsyncJsonWebsocketConsumer):
    group_name = "queue_updates"

    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add(self.group_name, self.channel_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Echo handler for basic testing
        await self.send_json({"ok": True, "received": content})

    # Group message handler: type "queue.update" -> method name "queue_update"
    async def queue_update(self, event):
        await self.send_json(event["data"])

