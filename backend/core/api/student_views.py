from django.utils import timezone
from accounts.serializers import UserSerializer
from accounts.models import User
from datetime import date
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions, status
from rest_framework.response import Response

from ..models import Booking, Complaint, FeeLedger, Leave, Menu
from ..serializers import (
    BookingSerializer,
    ComplaintSerializer,
    FeeLedgerSerializer,
    LeaveSerializer,
    MenuSerializer,
)
from ..services.booking_services import get_booking_fee_snapshot

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def student_overview(request):
    user = request.user
    if user.role != User.Role.STUDENT:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    booking = (
        Booking.objects.filter(
            student=user,
            status__in=[Booking.Status.APPROVED, Booking.Status.CHECKED_IN],
        )
        .select_related("hostel", "room")
        .order_by("-created_at")
        .first()
    )

    if not booking:
        return Response({"joined": False, "hostel": None, "upcoming_fee": None, "user": UserSerializer(user).data})

    today = timezone.now().date()
    upcoming, _, _ = get_booking_fee_snapshot(booking, today)

    upcoming_payload = None
    if upcoming:
        upcoming_payload = {
            "month": upcoming.month,
            "amount_due": str(ledger_outstanding_amount(upcoming) if getattr(upcoming, "id", None) else upcoming.amount_due),
            "amount_paid": str(upcoming.amount_paid),
            "due_date": upcoming.due_date,
            "late_fee": str(upcoming.late_fee),
            "status": upcoming.status,
        }

    hostel_payload = {
        "id": booking.hostel_id,
        "name": booking.hostel.name,
        "address": booking.hostel.address,
        "area": booking.hostel.area,
        "city": booking.hostel.city,
        "contact_number": booking.hostel.contact_number,
        "gender_type": booking.hostel.gender_type,
        "room_type": booking.room.get_type_display() if booking.room else "",
        "move_in_date": booking.move_in_date,
        "status": booking.status,
    }

    return Response(
        {
            "joined": True,
            "hostel": hostel_payload,
            "upcoming_fee": upcoming_payload,
            "user": UserSerializer(user).data,
        }
    )


