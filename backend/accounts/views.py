import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Hostel, HostelPhoto, Room
from .models import EmailOTP, OwnerProfile, StudentProfile, User
from .serializers import (
    OwnerProfileSerializer,
    StudentProfileSerializer,
    UserCreateSerializer,
    UserSerializer,
)

OTP_EXPIRY_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_SENDS_PER_HOUR = 5
OTP_MAX_VERIFY_ATTEMPTS = 5

AuthUser = get_user_model()


def issue_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    refresh["name"] = user.name
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def send_email_otp(email, purpose):
    now = timezone.now()
    latest_otp = (
        EmailOTP.objects.filter(email__iexact=email, purpose=purpose)
        .order_by("-created_at")
        .first()
    )
    if latest_otp:
        seconds_since_last_send = (now - latest_otp.created_at).total_seconds()
        if seconds_since_last_send < OTP_RESEND_COOLDOWN_SECONDS:
            remaining = int(OTP_RESEND_COOLDOWN_SECONDS - seconds_since_last_send)
            return Response(
                {"detail": f"Please wait {remaining}s before requesting another OTP."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

    hourly_sends = EmailOTP.objects.filter(
        email__iexact=email,
        purpose=purpose,
        created_at__gte=now - timedelta(hours=1),
    ).count()
    if hourly_sends >= OTP_MAX_SENDS_PER_HOUR:
        return Response(
            {"detail": "Too many OTP requests. Please try again after an hour."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    code = f"{random.randint(0, 999999):06d}"
    EmailOTP.objects.filter(email__iexact=email, purpose=purpose, is_used=False).update(
        is_used=True
    )
    EmailOTP.objects.create(
        email=email,
        code=code,
        purpose=purpose,
        expires_at=now + timedelta(minutes=OTP_EXPIRY_MINUTES),
    )

    otp_purpose = {
        "register": "registration",
        "login": "login",
        "reset_password": "password reset",
    }.get(purpose, "verification")
    send_mail(
        subject=f"StayNest {otp_purpose} OTP",
        message=f"Your StayNest OTP is {code}. It is valid for {OTP_EXPIRY_MINUTES} minutes.",
        from_email=None,
        recipient_list=[email],
        fail_silently=False,
    )

    return Response({"detail": "OTP sent to your email."}, status=status.HTTP_200_OK)


def validate_otp_or_response(email, otp_code, purpose):
    otp_record = (
        EmailOTP.objects.filter(
            email__iexact=email,
            purpose=purpose,
            is_used=False,
            expires_at__gt=timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )
    if not otp_record:
        return None, Response({"detail": "Invalid or expired email OTP."}, status=status.HTTP_400_BAD_REQUEST)
    if otp_record.attempt_count >= OTP_MAX_VERIFY_ATTEMPTS:
        otp_record.is_used = True
        otp_record.save(update_fields=["is_used"])
        return None, Response(
            {"detail": "Too many invalid OTP attempts. Please request a new OTP."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    if otp_record.code != otp_code:
        otp_record.attempt_count += 1
        otp_record.last_attempt_at = timezone.now()
        update_fields = ["attempt_count", "last_attempt_at"]
        if otp_record.attempt_count >= OTP_MAX_VERIFY_ATTEMPTS:
            otp_record.is_used = True
            update_fields.append("is_used")
        otp_record.save(update_fields=update_fields)
        return None, Response({"detail": "Invalid or expired email OTP."}, status=status.HTTP_400_BAD_REQUEST)
    return otp_record, None


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
        email = (data.get("email") or "").strip().lower()
        otp_code = (data.get("otp_code") or "").strip()

        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not otp_code:
            return Response({"detail": "Email OTP is required."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "This email is already registered."}, status=status.HTTP_400_BAD_REQUEST)

        otp_record, error_response = validate_otp_or_response(email, otp_code, "register")
        if error_response:
            return error_response

        data["email"] = email
        data["email_verified"] = True
        if role == User.Role.ADMIN:
            return Response({"detail": "Cannot register admin account."}, status=status.HTTP_403_FORBIDDEN)
        if role == User.Role.OWNER:
            data["status"] = User.Status.PENDING
            data["verification_state"] = User.Verification.PENDING
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

        serializer = UserCreateSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user = serializer.save()
            otp_record.is_used = True
            otp_record.save(update_fields=["is_used"])
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
                    moderation_status=Hostel.ModerationStatus.PENDING,
                )
                photos = hostel_payload.get("photos") or []
                for index, photo_url in enumerate(photos):
                    HostelPhoto.objects.create(hostel=hostel, url=photo_url, display_order=index)
                rooms = hostel_payload.get("rooms") or []
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


class EmailPasswordLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        role = request.data.get("role")

        if not email or not password:
            return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = AuthUser.objects.filter(email__iexact=email).first()
        if not user or not user.check_password(password):
            return Response({"detail": "Invalid email or password."}, status=status.HTTP_400_BAD_REQUEST)
        if role and user.role != role:
            return Response({"detail": f"This account is registered as {user.role}."}, status=status.HTTP_400_BAD_REQUEST)
        if user.status == User.Status.SUSPENDED:
            return Response({"detail": "Your account is suspended. Contact support."}, status=status.HTTP_403_FORBIDDEN)

        return Response(issue_tokens_for_user(user), status=status.HTTP_200_OK)


class SendRegistrationOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "This email is already registered."}, status=status.HTTP_400_BAD_REQUEST)
        return send_email_otp(email, "register")


class SendLoginOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        role = request.data.get("role")
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        user = AuthUser.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "No account found for this email."}, status=status.HTTP_404_NOT_FOUND)
        if role and user.role != role:
            return Response({"detail": f"This account is registered as {user.role}."}, status=status.HTTP_400_BAD_REQUEST)
        if user.status == User.Status.SUSPENDED:
            return Response({"detail": "Your account is suspended. Contact support."}, status=status.HTTP_403_FORBIDDEN)
        return send_email_otp(email, "login")


class SendPasswordResetOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        role = request.data.get("role")
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        user = AuthUser.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "No account found for this email."}, status=status.HTTP_404_NOT_FOUND)
        if role and user.role != role:
            return Response({"detail": f"This account is registered as {user.role}."}, status=status.HTTP_400_BAD_REQUEST)
        if user.status == User.Status.SUSPENDED:
            return Response({"detail": "Your account is suspended. Contact support."}, status=status.HTTP_403_FORBIDDEN)
        return send_email_otp(email, "reset_password")


class OTPLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        otp_code = (request.data.get("otp_code") or "").strip()
        role = request.data.get("role")
        if not email or not otp_code:
            return Response({"detail": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)
        user = AuthUser.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "No account found for this email."}, status=status.HTTP_404_NOT_FOUND)
        if role and user.role != role:
            return Response({"detail": f"This account is registered as {user.role}."}, status=status.HTTP_400_BAD_REQUEST)
        if user.status == User.Status.SUSPENDED:
            return Response({"detail": "Your account is suspended. Contact support."}, status=status.HTTP_403_FORBIDDEN)

        otp_record, error_response = validate_otp_or_response(email, otp_code, "login")
        if error_response:
            return error_response

        otp_record.is_used = True
        otp_record.save(update_fields=["is_used"])
        return Response(issue_tokens_for_user(user), status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        otp_code = (request.data.get("otp_code") or "").strip()
        new_password = request.data.get("new_password") or ""
        role = request.data.get("role")

        if not email or not otp_code or not new_password:
            return Response(
                {"detail": "Email, OTP, and new password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 6:
            return Response(
                {"detail": "Password must be at least 6 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = AuthUser.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "No account found for this email."}, status=status.HTTP_404_NOT_FOUND)
        if role and user.role != role:
            return Response({"detail": f"This account is registered as {user.role}."}, status=status.HTTP_400_BAD_REQUEST)

        otp_record, error_response = validate_otp_or_response(email, otp_code, "reset_password")
        if error_response:
            return error_response

        try:
            validate_password(new_password, user=user)
        except ValidationError as exc:
            return Response({"detail": " ".join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        otp_record.is_used = True
        otp_record.save(update_fields=["is_used"])

        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def admin_overview(request):
    if request.user.role != User.Role.ADMIN:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    return Response(
        {
            "pending_owners": User.objects.filter(
                role=User.Role.OWNER,
                verification_state=User.Verification.PENDING,
            ).count(),
            "pending_hostels": Hostel.objects.filter(
                moderation_status=Hostel.ModerationStatus.PENDING,
            ).count(),
            "active_students": User.objects.filter(role=User.Role.STUDENT, status=User.Status.ACTIVE).count(),
            "suspended_users": User.objects.filter(status=User.Status.SUSPENDED).count(),
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def admin_owner_queue(request):
    if request.user.role != User.Role.ADMIN:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    owners = User.objects.filter(
        role=User.Role.OWNER,
        verification_state=User.Verification.PENDING,
    ).order_by("-date_joined")
    return Response(UserSerializer(owners, many=True).data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def admin_all_owners(request):
    if request.user.role != User.Role.ADMIN:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    owners = User.objects.filter(role=User.Role.OWNER).order_by("-date_joined")
    return Response(UserSerializer(owners, many=True).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def admin_update_user(request, user_id):
    if request.user.role != User.Role.ADMIN:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    user = AuthUser.objects.filter(id=user_id).first()
    if not user:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    next_status = request.data.get("status")
    next_verification = request.data.get("verification_state")
    changed = False

    if next_status in dict(User.Status.choices):
        user.status = next_status
        changed = True
    if next_verification in dict(User.Verification.choices):
        user.verification_state = next_verification
        changed = True

    if not changed:
        return Response({"detail": "No valid updates provided."}, status=status.HTTP_400_BAD_REQUEST)

    user.save()
    return Response(UserSerializer(user).data)


@api_view(["PATCH"])
@permission_classes([permissions.IsAuthenticated])
def update_my_profile(request):
    user = request.user
    user.name = request.data.get("name", user.name)
    user.email = request.data.get("email", user.email)
    user.phone = request.data.get("phone", user.phone)
    user.save()

    if user.role == User.Role.STUDENT:
        profile, _ = StudentProfile.objects.get_or_create(user=user)
        serializer = StudentProfileSerializer(profile, data=request.data.get("student_profile", {}), partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

    if user.role == User.Role.OWNER:
        profile, _ = OwnerProfile.objects.get_or_create(user=user)
        serializer = OwnerProfileSerializer(profile, data=request.data.get("owner_profile", {}), partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

    user.refresh_from_db()
    return Response(UserSerializer(user).data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)
