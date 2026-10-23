from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions, status
from rest_framework.response import Response

from ..models import Hostel
from ..serializers import AdminHostelSerializer
from ..services.booking_services import apply_pending_hostel_update

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def admin_hostel_queue(request):
    if request.user.role != User.Role.ADMIN:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    hostels = (
        Hostel.objects.filter(
            models.Q(moderation_status=Hostel.ModerationStatus.PENDING)
            | models.Q(pending_update__isnull=False)
        )
        .select_related("owner")
        .prefetch_related("photos")
        .order_by("-created_at")
    )
    return Response(AdminHostelSerializer(hostels, many=True).data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def admin_all_hostels(request):
    if request.user.role != User.Role.ADMIN:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    hostels = Hostel.objects.select_related("owner").prefetch_related("photos").order_by("-created_at")
    return Response(AdminHostelSerializer(hostels, many=True).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def admin_update_hostel_moderation(request, hostel_id):
    if request.user.role != User.Role.ADMIN:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    hostel = Hostel.objects.filter(id=hostel_id).first()
    if not hostel:
        return Response({"detail": "Hostel not found."}, status=status.HTTP_404_NOT_FOUND)

    next_status = request.data.get("moderation_status")
    if next_status not in dict(Hostel.ModerationStatus.choices):
        return Response({"detail": "Invalid moderation status."}, status=status.HTTP_400_BAD_REQUEST)

    if hostel.pending_update:
        if next_status == Hostel.ModerationStatus.APPROVED:
            apply_pending_hostel_update(hostel)
            return Response(AdminHostelSerializer(hostel, context={"request": request}).data)
        if next_status == Hostel.ModerationStatus.REJECTED:
            hostel.pending_update = None
            hostel.moderation_status = Hostel.ModerationStatus.APPROVED
            hostel.save(update_fields=["pending_update", "moderation_status"])
            return Response(AdminHostelSerializer(hostel, context={"request": request}).data)

    hostel.moderation_status = next_status
    hostel.save(update_fields=["moderation_status"])
    return Response(AdminHostelSerializer(hostel, context={"request": request}).data)


