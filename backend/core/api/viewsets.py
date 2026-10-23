from datetime import date
from django.db import models, transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from accounts.models import User
from ..models import (
    Booking,
    Complaint,
    ComplaintEvidence,
    FeeLedger,
    FeePayment,
    Hostel,
    HostelPhoto,
    Leave,
    Menu,
    Notification,
    Review,
    Room,
)
from ..serializers import (
    BookingSerializer,
    ComplaintSerializer,
    FeeLedgerSerializer,
    FeePaymentSerializer,
    HostelSerializer,
    LeaveSerializer,
    MenuSerializer,
    NotificationSerializer,
    ReviewSerializer,
    RoomSerializer,
)
from ..services.booking_services import (
    add_months_safe,
    recalculate_ledger_payment_status,
    sync_room_occupancy,
    apply_pending_hostel_update,
)

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
        if user.verification_state != User.Verification.VERIFIED or user.status != User.Status.ACTIVE:
            return Response(
                {"detail": "Owner verification is pending. Admin approval is required before listing hostels."},
                status=status.HTTP_403_FORBIDDEN,
            )
        payload_owner = request.data.get("owner")
        if str(payload_owner) != str(user.id):
            return Response({"detail": "Owner mismatch."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role == User.Role.OWNER:
            kwargs["partial"] = True
            instance = self.get_object()
            update_payload = request.data.copy()
            if instance.moderation_status == Hostel.ModerationStatus.APPROVED:
                instance.pending_update = dict(update_payload)
                instance.save(update_fields=["pending_update"])
                serializer = self.get_serializer(instance)
                return Response(serializer.data)
            update_payload["moderation_status"] = Hostel.ModerationStatus.PENDING
            serializer = self.get_serializer(instance, data=update_payload, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
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
        if user.verification_state != User.Verification.VERIFIED or user.status != User.Status.ACTIVE:
            return Response(
                {"detail": "Owner verification is pending. Admin approval is required before managing rooms."},
                status=status.HTTP_403_FORBIDDEN,
            )
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
        stay_type = serializer.validated_data.get("stay_type", Booking.StayType.MONTHLY)
        move_in_date = serializer.validated_data.get("move_in_date")
        move_out_date = serializer.validated_data.get("move_out_date")
        total_days = serializer.validated_data.get("total_days", 0)
        if room and room.occupied_beds >= room.total_beds:
            return Response({"detail": "No beds available for this room."}, status=status.HTTP_400_BAD_REQUEST)
        if stay_type == Booking.StayType.DAILY:
            if not move_in_date or not move_out_date:
                return Response({"detail": "Daily booking requires move-in and move-out dates."}, status=status.HTTP_400_BAD_REQUEST)
            if move_out_date <= move_in_date:
                return Response({"detail": "Move-out date must be after move-in date."}, status=status.HTTP_400_BAD_REQUEST)
            if total_days <= 0:
                return Response({"detail": "Total days must be greater than zero for daily bookings."}, status=status.HTTP_400_BAD_REQUEST)
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
        requested_room = serializer.validated_data.get("room", booking.room)
        room_to_assign = requested_room

        if next_status == Booking.Status.CHECKED_IN and room_to_assign:
            if room_to_assign.occupied_beds >= room_to_assign.total_beds:
                alternate_room = (
                    Room.objects.filter(
                        hostel=booking.hostel,
                        type=room_to_assign.type,
                        is_maintenance=False,
                        occupied_beds__lt=models.F("total_beds"),
                    )
                    .exclude(id=room_to_assign.id)
                    .order_by("id")
                    .first()
                )
                if alternate_room:
                    serializer.validated_data["room"] = alternate_room
                    room_to_assign = alternate_room
                else:
                    return Response({"detail": "No beds available for this room type."}, status=status.HTTP_400_BAD_REQUEST)

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

        if next_status != prev_status:
            room_ids_to_sync = [room.id for room in [requested_room, booking.room] if room]
            if room_ids_to_sync:
                sync_room_occupancy(room_ids_to_sync)

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


class FeeLedgerViewSet(viewsets.ModelViewSet):
    queryset = FeeLedger.objects.all().order_by("-due_date")
    serializer_class = FeeLedgerSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return FeeLedger.objects.all().order_by("-due_date")
        if user.role == User.Role.OWNER:
            return FeeLedger.objects.filter(hostel__owner=user).order_by("-due_date")
        return FeeLedger.objects.filter(student=user).order_by("-due_date")

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Role.OWNER:
            return Response({"detail": "Only owners can create fee ledgers."}, status=status.HTTP_403_FORBIDDEN)
        hostel_id = request.data.get("hostel")
        if not Hostel.objects.filter(id=hostel_id, owner=request.user).exists():
            return Response({"detail": "Owner does not control this hostel."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)


class FeePaymentViewSet(viewsets.ModelViewSet):
    queryset = FeePayment.objects.select_related("ledger", "ledger__hostel", "ledger__student").all().order_by("-paid_at")
    serializer_class = FeePaymentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return self.queryset
        if user.role == User.Role.OWNER:
            return self.queryset.filter(ledger__hostel__owner=user)
        return self.queryset.filter(ledger__student=user)

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Role.OWNER:
            return Response({"detail": "Only owners can record payments."}, status=status.HTTP_403_FORBIDDEN)
        ledger = FeeLedger.objects.filter(id=request.data.get("ledger"), hostel__owner=request.user).first()
        if not ledger:
            return Response({"detail": "Ledger not found."}, status=status.HTTP_404_NOT_FOUND)
        response = super().create(request, *args, **kwargs)
        if response.status_code < 300:
            recalculate_ledger_payment_status(ledger)
        return response

    def update(self, request, *args, **kwargs):
        if request.user.role != User.Role.OWNER:
            return Response({"detail": "Only owners can edit payments."}, status=status.HTTP_403_FORBIDDEN)
        payment = self.get_object()
        if payment.ledger.hostel.owner_id != request.user.id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        original_ledger = payment.ledger
        response = super().update(request, *args, **kwargs)
        if response.status_code < 300:
            original_ledger.refresh_from_db()
            recalculate_ledger_payment_status(original_ledger)
            if payment.ledger_id != original_ledger.id:
                payment.ledger.refresh_from_db()
                recalculate_ledger_payment_status(payment.ledger)
        return response

    def destroy(self, request, *args, **kwargs):
        if request.user.role != User.Role.OWNER:
            return Response({"detail": "Only owners can delete payments."}, status=status.HTTP_403_FORBIDDEN)
        payment = self.get_object()
        if payment.ledger.hostel.owner_id != request.user.id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        ledger = payment.ledger
        response = super().destroy(request, *args, **kwargs)
        if response.status_code < 300:
            ledger.refresh_from_db()
            recalculate_ledger_payment_status(ledger)
        return response


class MenuViewSet(viewsets.ModelViewSet):
    queryset = Menu.objects.select_related("hostel").all().order_by("-date")
    serializer_class = MenuSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return self.queryset.filter(
                hostel__moderation_status=Hostel.ModerationStatus.APPROVED,
                hostel__is_active=True,
            )
        if user.role == User.Role.ADMIN:
            return self.queryset
        if user.role == User.Role.OWNER:
            return self.queryset.filter(hostel__owner=user)
        if user.role == User.Role.STUDENT:
            active_booking = Booking.objects.filter(
                student=user,
                status__in=[Booking.Status.APPROVED, Booking.Status.CHECKED_IN],
            ).order_by("-created_at").first()
            if not active_booking:
                return Menu.objects.none()
            return self.queryset.filter(hostel=active_booking.hostel)
        return Menu.objects.none()

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Role.OWNER:
            return Response({"detail": "Only owners can manage menus."}, status=status.HTTP_403_FORBIDDEN)
        hostel_id = request.data.get("hostel")
        if not Hostel.objects.filter(id=hostel_id, owner=request.user).exists():
            return Response({"detail": "Owner does not control this hostel."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)


class LeaveViewSet(viewsets.ModelViewSet):
    queryset = Leave.objects.select_related("hostel", "student").all().order_by("-start_date")
    serializer_class = LeaveSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return self.queryset
        if user.role == User.Role.OWNER:
            return self.queryset.filter(hostel__owner=user)
        return self.queryset.filter(student=user)

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Role.STUDENT:
            return Response({"detail": "Only students can request leave."}, status=status.HTTP_403_FORBIDDEN)
        active_booking = Booking.objects.filter(
            student=request.user,
            status__in=[Booking.Status.APPROVED, Booking.Status.CHECKED_IN],
        ).order_by("-created_at").first()
        if not active_booking:
            return Response({"detail": "You must join a hostel before requesting leave."}, status=status.HTTP_400_BAD_REQUEST)
        payload = request.data.copy()
        payload["hostel"] = active_booking.hostel_id
        payload["student"] = request.user.id
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        Notification.objects.create(
            user=active_booking.hostel.owner,
            type="leave_request",
            title="New leave request",
            body=f"{request.user.name} requested leave from {serializer.instance.start_date} to {serializer.instance.end_date}.",
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        leave = self.get_object()
        if request.user.role == User.Role.STUDENT and leave.student_id != request.user.id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == User.Role.OWNER and leave.hostel.owner_id != request.user.id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)


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


class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.select_related("hostel", "owner", "student").prefetch_related("evidence").all().order_by("-created_at")
    serializer_class = ComplaintSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return self.queryset
        if user.role == User.Role.OWNER:
            return self.queryset.filter(owner=user)
        return self.queryset.filter(student=user)

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Role.OWNER:
            return Response({"detail": "Only owners can file complaints."}, status=status.HTTP_403_FORBIDDEN)

        hostel = Hostel.objects.filter(id=request.data.get("hostel"), owner=request.user).first()
        if not hostel:
            return Response({"detail": "Hostel not found."}, status=status.HTTP_404_NOT_FOUND)

        student_id = request.data.get("student")
        if not Booking.objects.filter(
            hostel=hostel,
            student_id=student_id,
            status__in=[Booking.Status.APPROVED, Booking.Status.CHECKED_IN, Booking.Status.CHECKED_OUT],
        ).exists():
            return Response({"detail": "Student is not linked to this hostel."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(owner=request.user, status=Complaint.Status.OPEN)

        for file_url in request.data.get("evidence_urls", []):
            if file_url:
                ComplaintEvidence.objects.create(
                    complaint=serializer.instance,
                    file_url=file_url,
                    submitted_by=request.user,
                )

        Notification.objects.create(
            user=serializer.instance.student,
            type="complaint_created",
            title="Complaint raised",
            body=f"A complaint was filed for your stay at {hostel.name}.",
        )
        return Response(self.get_serializer(serializer.instance).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        complaint = self.get_object()
        user = request.user
        if user.role == User.Role.ADMIN:
            next_status = request.data.get("status", complaint.status)
            if next_status not in dict(Complaint.Status.choices):
                return Response({"detail": "Invalid complaint status."}, status=status.HTTP_400_BAD_REQUEST)
            previous_status = complaint.status
            complaint.status = next_status
            complaint.admin_decision = request.data.get("admin_decision", complaint.admin_decision)
            complaint.save(update_fields=["status", "admin_decision", "updated_at"])
            if previous_status != Complaint.Status.RESOLVED and next_status == Complaint.Status.RESOLVED:
                complaint.student.trust_score = max(0, complaint.student.trust_score - 10)
                complaint.student.save(update_fields=["trust_score"])
            Notification.objects.create(
                user=complaint.student,
                type="complaint_status",
                title="Complaint updated",
                body=f"Complaint for {complaint.hostel.name} is now {complaint.status}.",
            )
            return Response(self.get_serializer(complaint).data)

        if user.role == User.Role.STUDENT and complaint.student_id == user.id:
            for file_url in request.data.get("evidence_urls", []):
                if file_url:
                    ComplaintEvidence.objects.create(
                        complaint=complaint,
                        file_url=file_url,
                        submitted_by=user,
                    )
            if request.data.get("dispute_note"):
                complaint.admin_decision = request.data.get("dispute_note")
                if complaint.status == Complaint.Status.OPEN:
                    complaint.status = Complaint.Status.UNDER_REVIEW
                complaint.save(update_fields=["admin_decision", "status", "updated_at"])
            return Response(self.get_serializer(complaint).data)

        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related("hostel", "student").all().order_by("-created_at")
    serializer_class = ReviewSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return self.queryset
        if user.role == User.Role.OWNER:
            return self.queryset.filter(hostel__owner=user)
        return self.queryset.filter(student=user)

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Role.STUDENT:
            return Response({"detail": "Only students can submit reviews."}, status=status.HTTP_403_FORBIDDEN)
        hostel_id = request.data.get("hostel")
        eligible_booking = Booking.objects.filter(
            hostel_id=hostel_id,
            student=request.user,
            status__in=[Booking.Status.APPROVED, Booking.Status.CHECKED_IN, Booking.Status.CHECKED_OUT],
        ).exists()
        if not eligible_booking:
            return Response({"detail": "You can only review a hostel you stayed in."}, status=status.HTTP_400_BAD_REQUEST)
        if Review.objects.filter(hostel_id=hostel_id, student=request.user).exists():
            return Response({"detail": "You already submitted a review for this hostel."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(student=request.user, status=Review.Status.PENDING)
        hostel = Hostel.objects.filter(id=hostel_id).first()
        if hostel:
            Notification.objects.create(
                user=hostel.owner,
                type="review_submitted",
                title="New review submitted",
                body=f"{request.user.name} submitted a review for {hostel.name}.",
            )
        return Response(self.get_serializer(serializer.instance).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        review = self.get_object()
        user = request.user
        if user.role == User.Role.ADMIN:
            next_status = request.data.get("status", review.status)
            if next_status not in dict(Review.Status.choices):
                return Response({"detail": "Invalid review status."}, status=status.HTTP_400_BAD_REQUEST)
            review.status = next_status
            review.save(update_fields=["status", "updated_at"])
            if next_status == Review.Status.PUBLISHED and review.student.trust_score < 100:
                review.student.trust_score = min(100, review.student.trust_score + 2)
                review.student.save(update_fields=["trust_score"])
            return Response(self.get_serializer(review).data)
        if user.role == User.Role.OWNER and review.hostel.owner_id == user.id:
            review.owner_reply = request.data.get("owner_reply", review.owner_reply)
            review.save(update_fields=["owner_reply", "updated_at"])
            return Response(self.get_serializer(review).data)
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
