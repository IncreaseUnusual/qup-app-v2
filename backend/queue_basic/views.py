from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializer import BasicQueueEntrySerializer
from .models import BasicQueueEntry
from .realtime import notify_queue_update
from typing import List, Dict

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

    def perform_create(self, serializer):
        instance = serializer.save()
        # Broadcast a minimal payload; clients can refetch or use this directly
        notify_queue_update({
            "event": "created",
            "entry": BasicQueueEntrySerializer(instance).data,
        })

class BasicQueueEntryStatusUpdateView(generics.UpdateAPIView):
    queryset = BasicQueueEntry.objects.all()
    serializer_class = BasicQueueEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        instance = serializer.save()
        notify_queue_update({
            "event": "updated",
            "entry": BasicQueueEntrySerializer(instance).data,
        })

class BasicQueueEntryDeleteView(generics.DestroyAPIView):
    queryset = BasicQueueEntry.objects.all()
    serializer_class = BasicQueueEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        entry_id = instance.id
        super().perform_destroy(instance)
        notify_queue_update({
            "event": "deleted",
            "id": entry_id,
        })

class SeatingOptimizeView(APIView):
    """
    Compute a seating plan using First-Fit Decreasing (FFD) with Best-Fit tie-break
    given current waiting parties and available table capacities.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_tables(self) -> List[Dict]:
        """
        Define available tables. In production, this could be a model or env-driven.
        """
        # Example inventory: 4x2-top, 6x4-top, 2x6-top
        tables: List[Dict] = []
        table_id = 1
        for _ in range(4):
            tables.append({"id": table_id, "capacity": 2, "occupied": False})
            table_id += 1
        for _ in range(6):
            tables.append({"id": table_id, "capacity": 4, "occupied": False})
            table_id += 1
        for _ in range(2):
            tables.append({"id": table_id, "capacity": 6, "occupied": False})
            table_id += 1
        return tables

    def post(self, request):
        # Optionally allow client to pass a custom table set
        custom_tables = request.data.get("tables")
        tables = custom_tables if isinstance(custom_tables, list) else self.get_tables()

        waiting_entries = BasicQueueEntry.objects.filter(status='waiting').order_by('-party_size', 'joined_at')
        parties = [{"id": e.id, "name": e.name, "size": e.party_size} for e in waiting_entries]

        # First-Fit Decreasing with Best-Fit improvement (choose smallest fitting table)
        sorted_parties = sorted(parties, key=lambda p: p["size"], reverse=True)
        assignments: List[Dict] = []
        unseated: List[Dict] = []
        trace: List[Dict] = []

        for party in sorted_parties:
            candidates = [t for t in tables if not t["occupied"] and t["capacity"] >= party["size"]]
            step = {
                "party": party,
                "candidates": [{"id": t["id"], "capacity": t["capacity"]} for t in sorted(candidates, key=lambda x: x["capacity"])],
                "chosen": None,
                "waste": None,
            }
            if not candidates:
                unseated.append(party)
                step["chosen"] = None
                trace.append(step)
                continue
            candidates.sort(key=lambda t: t["capacity"])  # best-fit: smallest that fits
            chosen = candidates[0]
            chosen["occupied"] = True
            chosen["party"] = party
            waste = chosen["capacity"] - party["size"]
            assignments.append({"table_id": chosen["id"], "table_capacity": chosen["capacity"], "party": party, "waste": waste})
            step["chosen"] = {"id": chosen["id"], "capacity": chosen["capacity"]}
            step["waste"] = waste
            trace.append(step)

        # Metrics
        used_tables = [t for t in tables if t.get("occupied")]
        wasted_seats = sum(t["capacity"] - t["party"]["size"] for t in used_tables)

        result = {
            "assignments": assignments,
            "unseated": unseated,
            "sorted_parties": sorted_parties,
            "trace": trace,
            "summary": {
                "tables_used": len(used_tables),
                "total_tables": len(tables),
                "wasted_seats": wasted_seats,
                "total_waiting": len(parties),
                "seated_now": len(assignments),
            },
            "tables": tables,
        }
        return Response(result)