from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from core.models import Hostel, HostelPhoto, Room
from .models import User
from .serializers import PhoneTokenObtainPairSerializer, UserCreateSerializer, UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ("create",):
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        if request.user.role != User.Role.ADMIN and str(self.get_object().id) != str(request.user.id):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role != User.Role.ADMIN and str(self.get_object().id) != str(request.user.id):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data.copy()
        role = data.get("role")
        if role == User.Role.ADMIN:
            return Response({"detail": "Cannot register admin account."}, status=status.HTTP_403_FORBIDDEN)
        if role == User.Role.OWNER:
            data["status"] = User.Status.ACTIVE
            data["verification_state"] = User.Verification.VERIFIED
        elif role == User.Role.STUDENT:
            data["status"] = User.Status.ACTIVE
            data["verification_state"] = User.Verification.VERIFIED

        hostel_payload = data.get("hostel") if role == User.Role.OWNER else None
        if role == User.Role.OWNER and hostel_payload:
            required_fields = ["name", "address", "area", "city", "gender_type", "contact_number"]
            missing = [field for field in required_fields if not hostel_payload.get(field)]
            if missing:
                return Response(
                    {"detail": f"Missing hostel fields: {', '.join(missing)}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            rooms = hostel_payload.get("rooms") or []
            if not rooms:
                return Response(
                    {"detail": "At least one room type is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            photos = hostel_payload.get("photos") or []
            if not photos:
                return Response(
                    {"detail": "At least one hostel photo is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = UserCreateSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user = serializer.save()
            if role == User.Role.OWNER and hostel_payload:
                hostel = Hostel.objects.create(
                    owner=user,
                    name=hostel_payload.get("name"),
                    address=hostel_payload.get("address"),
                    area=hostel_payload.get("area"),
                    city=hostel_payload.get("city"),
                    pincode=hostel_payload.get("pincode", ""),
                    gender_type=hostel_payload.get("gender_type"),
                    description=hostel_payload.get("description", ""),
                    rules=hostel_payload.get("rules", ""),
                    contact_number=hostel_payload.get("contact_number", ""),
                    amenities=hostel_payload.get("amenities", []),
                    moderation_status=Hostel.ModerationStatus.APPROVED,
                )
                for index, photo_url in enumerate(photos):
                    HostelPhoto.objects.create(hostel=hostel, url=photo_url, display_order=index)
                for room in rooms:
                    Room.objects.create(
                        hostel=hostel,
                        type=room.get("type"),
                        monthly_rent=room.get("monthly_rent", 0),
                        total_beds=room.get("total_beds", 0),
                        occupied_beds=room.get("occupied_beds", 0),
                        is_maintenance=False,
                    )

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PhoneTokenObtainPairSerializer


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)
