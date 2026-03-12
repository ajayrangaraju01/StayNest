from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.models import User
from .models import Booking, Hostel, Room
from .serializers import BookingSerializer, HostelSerializer, RoomSerializer


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health_check(request):
    return Response({"status": "ok"})


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
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        user = request.user
        booking = self.get_object()
        if user.role == User.Role.ADMIN:
            return super().update(request, *args, **kwargs)
        if user.role == User.Role.OWNER and booking.hostel.owner_id == user.id:
            return super().update(request, *args, **kwargs)
        if user.role == User.Role.STUDENT and booking.student_id == user.id:
            return super().update(request, *args, **kwargs)
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
