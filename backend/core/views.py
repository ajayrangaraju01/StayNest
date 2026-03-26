from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.models import User
from .models import Booking, FeeLedger, Hostel, HostelPhoto, Notification, Room
from .serializers import BookingSerializer, HostelSerializer, NotificationSerializer, RoomSerializer


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health_check(request):
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def owner_students(request):
    user = request.user
    if user.role != User.Role.OWNER:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    bookings = (
        Booking.objects.filter(
            hostel__owner=user,
            status__in=[Booking.Status.APPROVED, Booking.Status.CHECKED_IN],
        )
        .select_related("student", "hostel", "room")
        .order_by("-created_at")
    )

    data = []
    for booking in bookings:
        data.append(
            {
                "booking_id": booking.id,
                "student_id": booking.student_id,
                "student_name": booking.student.name,
                "student_phone": booking.student.phone,
                "hostel_id": booking.hostel_id,
                "hostel_name": booking.hostel.name,
                "room_id": booking.room_id,
                "room_type": booking.room.get_type_display() if booking.room else "",
                "status": booking.status,
                "move_in_date": booking.move_in_date,
            },
        )
    return Response(data)


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
        return Response({"joined": False, "hostel": None, "upcoming_fee": None})

    today = timezone.now().date()
    upcoming = (
        FeeLedger.objects.filter(student=user, hostel=booking.hostel, due_date__gte=today)
        .order_by("due_date")
        .first()
    )

    upcoming_payload = None
    if upcoming:
        upcoming_payload = {
            "month": upcoming.month,
            "amount_due": str(upcoming.amount_due),
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

    return Response({"joined": True, "hostel": hostel_payload, "upcoming_fee": upcoming_payload})


class HostelViewSet(viewsets.ModelViewSet):
    queryset = Hostel.objects.all().order_by("-created_at")
    serializer_class = HostelSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role == User.Role.ADMIN:
            return Hostel.objects.all().order_by("-created_at")
        if user.is_authenticated and user.role == User.Role.OWNER:
            return Hostel.objects.filter(owner=user).order_by("-created_at")
        return Hostel.objects.filter(moderation_status=Hostel.ModerationStatus.APPROVED, is_active=True)

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user.is_authenticated or user.role != User.Role.OWNER:
            return Response({"detail": "Only owners can create hostels."}, status=status.HTTP_403_FORBIDDEN)
        payload_owner = request.data.get("owner")
        if str(payload_owner) != str(user.id):
            return Response({"detail": "Owner mismatch."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role == User.Role.ADMIN:
            return Room.objects.all()
        if user.is_authenticated and user.role == User.Role.OWNER:
            return Room.objects.filter(hostel__owner=user)
        return Room.objects.filter(hostel__moderation_status=Hostel.ModerationStatus.APPROVED, hostel__is_active=True)

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user.is_authenticated or user.role != User.Role.OWNER:
            return Response({"detail": "Only owners can create rooms."}, status=status.HTTP_403_FORBIDDEN)
        hostel_id = request.data.get("hostel")
        if not hostel_id:
            return Response({"detail": "Hostel is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not Hostel.objects.filter(id=hostel_id, owner=user).exists():
            return Response({"detail": "Owner does not control this hostel."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all().order_by("-created_at")
    serializer_class = BookingSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return Booking.objects.all().order_by("-created_at")
        if user.role == User.Role.OWNER:
            return Booking.objects.filter(hostel__owner=user).order_by("-created_at")
        if user.role == User.Role.STUDENT:
            return Booking.objects.filter(student=user).order_by("-created_at")
        return Booking.objects.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role != User.Role.STUDENT:
            return Response({"detail": "Only students can create bookings."}, status=status.HTTP_403_FORBIDDEN)
        payload_student = request.data.get("student")
        if str(payload_student) != str(user.id):
            return Response({"detail": "Student mismatch."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = serializer.validated_data.get("room")
        if room and room.occupied_beds >= room.total_beds:
            return Response({"detail": "No beds available for this room."}, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        booking = serializer.instance
        Notification.objects.create(
            user=booking.hostel.owner,
            type="booking_request",
            title="New booking request",
            body=f"{booking.student.name} requested {booking.hostel.name}.",
        )
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        user = request.user
        booking = self.get_object()
        if user.role == User.Role.ADMIN:
            allowed = True
        elif user.role == User.Role.OWNER and booking.hostel.owner_id == user.id:
            allowed = True
        elif user.role == User.Role.STUDENT and booking.student_id == user.id:
            allowed = True
        else:
            allowed = False

        if not allowed:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(booking, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        prev_status = booking.status
        next_status = serializer.validated_data.get("status", prev_status)

        if next_status in [Booking.Status.APPROVED, Booking.Status.CHECKED_IN] and booking.room:
            if booking.room.occupied_beds >= booking.room.total_beds:
                return Response({"detail": "No beds available for this room."}, status=status.HTTP_400_BAD_REQUEST)

        audit_updates = {}
        if next_status != prev_status:
            now = timezone.now()
            audit_updates["status_updated_at"] = now
            if next_status == Booking.Status.APPROVED:
                audit_updates["approved_by"] = user
                audit_updates["approved_at"] = now
            if next_status == Booking.Status.REJECTED:
                audit_updates["rejected_by"] = user
                audit_updates["rejected_at"] = now

        self.perform_update(serializer)
        if audit_updates:
            Booking.objects.filter(id=booking.id).update(**audit_updates)
            booking.refresh_from_db()

        if booking.room and next_status != prev_status:
            was_active = prev_status in [Booking.Status.APPROVED, Booking.Status.CHECKED_IN]
            is_active = next_status in [Booking.Status.APPROVED, Booking.Status.CHECKED_IN]
            if not was_active and is_active:
                booking.room.occupied_beds = min(
                    booking.room.total_beds,
                    booking.room.occupied_beds + 1,
                )
                booking.room.save(update_fields=["occupied_beds"])
            if was_active and not is_active:
                booking.room.occupied_beds = max(0, booking.room.occupied_beds - 1)
                booking.room.save(update_fields=["occupied_beds"])

        if next_status != prev_status:
            if next_status == Booking.Status.APPROVED:
                title = "Booking approved"
                body = f"Your request for {booking.hostel.name} was approved."
            elif next_status == Booking.Status.REJECTED:
                title = "Booking rejected"
                body = f"Your request for {booking.hostel.name} was rejected."
            elif next_status == Booking.Status.CHECKED_IN:
                title = "Checked in"
                body = f"You are checked in at {booking.hostel.name}."
            else:
                title = None
                body = None

            if title and body:
                Notification.objects.create(
                    user=booking.student,
                    type="booking_status",
                    title=title,
                    body=body,
                )

        return Response(self.get_serializer(booking).data)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.all().order_by("-created_at")
    serializer_class = NotificationSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return Notification.objects.all().order_by("-created_at")
        return Notification.objects.filter(user=user).order_by("-created_at")
