import csv
import calendar
from datetime import date
from decimal import Decimal

from django.http import HttpResponse
from django.db import models, transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.serializers import UserSerializer
from accounts.models import StudentProfile, User
from .models import (
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
from .serializers import (
    AdminHostelSerializer,
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


def add_months_safe(base_date, months):
    month_index = (base_date.month - 1) + months
    year = base_date.year + (month_index // 12)
    month = (month_index % 12) + 1
    day = min(base_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def sync_room_occupancy(room_ids=None):
    rooms = Room.objects.all() if room_ids is None else Room.objects.filter(id__in=set(room_ids))
    for room in rooms:
        checked_in_count = Booking.objects.filter(room=room, status=Booking.Status.CHECKED_IN).count()
        normalized_occupied = min(room.total_beds, checked_in_count)
        if room.occupied_beds != normalized_occupied:
            room.occupied_beds = normalized_occupied
            room.save(update_fields=["occupied_beds"])


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
            status__in=[Booking.Status.APPROVED, Booking.Status.CHECKED_IN, Booking.Status.CHECKED_OUT],
        )
        .select_related("student", "hostel", "room")
        .order_by("-created_at")
    )

    data = []
    for booking in bookings:
        profile = getattr(booking.student, "student_profile", None)
        next_due_date = None
        fallback_amount = booking.room.monthly_rent if booking.room else Decimal("0")
        if booking.move_in_date:
            today = timezone.now().date()
            join_day = booking.move_in_date.day
            year = today.year
            month = today.month
            last_day_this_month = calendar.monthrange(year, month)[1]
            candidate_date = today.replace(day=min(join_day, last_day_this_month))
            if candidate_date <= today:
                if month == 12:
                    year += 1
                    month = 1
                else:
                    month += 1
                last_day_next_month = calendar.monthrange(year, month)[1]
                candidate_date = candidate_date.replace(
                    year=year,
                    month=month,
                    day=min(join_day, last_day_next_month),
                )
            next_due_date = candidate_date

        upcoming_fee = (
            FeeLedger.objects.filter(
                hostel=booking.hostel,
                student=booking.student,
                status__in=[
                    FeeLedger.Status.PENDING,
                    FeeLedger.Status.PARTIAL,
                    FeeLedger.Status.OVERDUE,
                ],
            )
            .order_by("due_date")
            .first()
        )
        if not upcoming_fee and next_due_date and booking.status != Booking.Status.CHECKED_OUT:
            upcoming_fee = FeeLedger(
                hostel=booking.hostel,
                student=booking.student,
                month=next_due_date,
                amount_due=fallback_amount,
                amount_paid=Decimal("0"),
                due_date=next_due_date,
                late_fee=Decimal("0"),
                status=FeeLedger.Status.PENDING,
            )
        fee_history = (
            FeeLedger.objects.filter(hostel=booking.hostel, student=booking.student)
            .prefetch_related("payments")
            .order_by("-due_date", "-created_at")[:6]
        )
        data.append(
            {
                "booking_id": booking.id,
                "student_id": booking.student_id,
                "student_name": booking.student.name,
                "student_phone": booking.student.phone,
                "student_email": booking.student.email,
                "hostel_id": booking.hostel_id,
                "hostel_name": booking.hostel.name,
                "room_id": booking.room_id,
                "room_number": booking.assigned_room_number or (booking.room.room_number if booking.room else ""),
                "room_type": booking.room.get_type_display() if booking.room else "",
                "status": booking.status,
                "move_in_date": booking.move_in_date,
                "trust_score": booking.student.trust_score,
                "verification_state": booking.student.verification_state,
                "college_company": profile.college_company if profile else "",
                "emergency_contact": profile.emergency_contact if profile else "",
                "age": profile.age if profile else None,
                "gender": profile.gender if profile else "",
                "upcoming_fee_due_date": upcoming_fee.due_date if upcoming_fee else None,
                "upcoming_fee_amount": str(upcoming_fee.amount_due) if upcoming_fee else "",
                "fee_history": [
                    {
                        "id": ledger.id,
                        "month": ledger.month,
                        "amount_due": str(ledger.amount_due),
                        "amount_paid": str(ledger.amount_paid),
                        "due_date": ledger.due_date,
                        "late_fee": str(ledger.late_fee),
                        "status": ledger.status,
                        "payments": [
                            {
                                "id": payment.id,
                                "amount": str(payment.amount),
                                "mode": payment.mode,
                                "paid_at": payment.paid_at,
                                "reference_id": payment.reference_id,
                            }
                            for payment in ledger.payments.all().order_by("-paid_at")
                        ],
                    }
                    for ledger in fee_history
                ],
            },
        )
    return Response(data)


@api_view(["PATCH"])
@permission_classes([permissions.IsAuthenticated])
def owner_update_guest(request, student_id):
    user = request.user
    if user.role != User.Role.OWNER:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    booking = (
        Booking.objects.filter(
            hostel__owner=user,
            student_id=student_id,
            status__in=[Booking.Status.APPROVED, Booking.Status.CHECKED_IN, Booking.Status.CHECKED_OUT],
        )
        .select_related("student")
        .order_by("-created_at")
        .first()
    )
    if not booking:
        return Response({"detail": "Guest not found."}, status=status.HTTP_404_NOT_FOUND)

    guest = booking.student
    guest.name = request.data.get("name", guest.name)
    guest.email = request.data.get("email", guest.email)
    guest.phone = request.data.get("phone", guest.phone)
    guest.save()

    profile, _ = StudentProfile.objects.get_or_create(user=guest)
    profile.age = request.data.get("age", profile.age)
    profile.gender = request.data.get("gender", profile.gender)
    profile.college_company = request.data.get("college_company", profile.college_company)
    profile.emergency_contact = request.data.get("emergency_contact", profile.emergency_contact)
    profile.save()

    room_number = (request.data.get("room_number") or "").strip()
    room_type = (request.data.get("room_type") or "").strip()
    previous_room_id = booking.room_id
    if room_number or room_type:
        target_type = booking.room.type if booking.room else ""
        type_map = {
            "Single": Room.RoomType.SINGLE,
            "2 Share": Room.RoomType.DOUBLE,
            "3 Share": Room.RoomType.TRIPLE,
            "4 Share": Room.RoomType.FOUR,
            "5 Share": Room.RoomType.FIVE,
            "6 Share": Room.RoomType.SIX,
            Room.RoomType.SINGLE: Room.RoomType.SINGLE,
            Room.RoomType.DOUBLE: Room.RoomType.DOUBLE,
            Room.RoomType.TRIPLE: Room.RoomType.TRIPLE,
            Room.RoomType.FOUR: Room.RoomType.FOUR,
            Room.RoomType.FIVE: Room.RoomType.FIVE,
            Room.RoomType.SIX: Room.RoomType.SIX,
        }
        if room_type:
            mapped_type = type_map.get(room_type, "")
            if not mapped_type:
                return Response({"detail": "Invalid room type."}, status=status.HTTP_400_BAD_REQUEST)
            target_type = mapped_type

        target_room = Room.objects.filter(
            hostel=booking.hostel,
            type=target_type,
            is_maintenance=False,
        ).order_by("id").first()
        if not target_room:
            return Response({"detail": "No room inventory found for that share type."}, status=status.HTTP_400_BAD_REQUEST)

        if booking.room_id != target_room.id:
            previous_room_id = booking.room_id
            if booking.status == Booking.Status.CHECKED_IN and booking.room:
                booking.room.occupied_beds = max(0, booking.room.occupied_beds - 1)
                booking.room.save(update_fields=["occupied_beds"])
            booking.room = target_room
            if booking.status == Booking.Status.CHECKED_IN:
                if target_room.occupied_beds >= target_room.total_beds:
                    return Response({"detail": "No beds available in the selected room type."}, status=status.HTTP_400_BAD_REQUEST)
                target_room.occupied_beds = min(target_room.total_beds, target_room.occupied_beds + 1)
                target_room.save(update_fields=["occupied_beds"])

        booking.assigned_room_number = room_number
        booking.save(update_fields=["room", "assigned_room_number"])
        sync_room_occupancy([room_id for room_id in [previous_room_id, booking.room_id] if room_id])

    return Response(UserSerializer(guest).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def owner_add_walkin_student(request):
    user = request.user
    if user.role != User.Role.OWNER:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    name = (request.data.get("name") or "").strip()
    phone = (request.data.get("phone") or "").strip()
    email = (request.data.get("email") or "").strip().lower() or None
    hostel_id = request.data.get("hostel")
    room_id = request.data.get("room")
    room_number = (request.data.get("room_number") or "").strip()
    room_type = (request.data.get("room_type") or "").strip()
    move_in_date = request.data.get("move_in_date")
    joining_fee_status = (request.data.get("joining_fee_status") or "unpaid").strip().lower()
    joining_fee_paid = Decimal(str(request.data.get("joining_fee_paid") or "0"))
    joining_fee_mode = (request.data.get("joining_fee_mode") or FeePayment.Mode.CASH).strip().lower()
    joining_fee_reference = (request.data.get("joining_fee_reference") or "").strip()

    if not name or not phone or not hostel_id or (not room_id and not room_number) or not move_in_date:
        return Response(
            {"detail": "Name, phone, hostel, room number, and move-in date are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if joining_fee_status not in {"unpaid", "partial", "paid"}:
        return Response({"detail": "Invalid joining fee status."}, status=status.HTTP_400_BAD_REQUEST)
    if joining_fee_mode not in {FeePayment.Mode.CASH, FeePayment.Mode.UPI, FeePayment.Mode.BANK}:
        return Response({"detail": "Invalid payment mode."}, status=status.HTTP_400_BAD_REQUEST)

    hostel = Hostel.objects.filter(id=hostel_id, owner=user).first()
    if not hostel:
        return Response({"detail": "Hostel not found."}, status=status.HTTP_404_NOT_FOUND)
    try:
        move_in_date_obj = date.fromisoformat(move_in_date)
    except ValueError:
        return Response({"detail": "Invalid move-in date."}, status=status.HTTP_400_BAD_REQUEST)

    total_beds_by_type = {
        Room.RoomType.SINGLE: 1,
        Room.RoomType.DOUBLE: 2,
        Room.RoomType.TRIPLE: 3,
        Room.RoomType.FOUR: 4,
        Room.RoomType.FIVE: 5,
        Room.RoomType.SIX: 6,
    }
    valid_room_types = set(total_beds_by_type.keys())

    room = None
    assigned_room_number = room_number
    if room_number:
        room = Room.objects.filter(hostel=hostel, room_number__iexact=room_number).first()
    if not room and room_id:
        room = Room.objects.filter(id=room_id, hostel=hostel).first()
    if not room:
        if room_type not in valid_room_types:
            return Response(
                {"detail": "Select a valid share type to create a new room."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        existing_type_room = (
            Room.objects.filter(hostel=hostel, type=room_type)
            .order_by("id")
            .first()
        )
        if existing_type_room:
            room = existing_type_room
        else:
            room = Room.objects.create(
                hostel=hostel,
                room_number="",
                type=room_type,
                monthly_rent=Decimal("0"),
                total_beds=total_beds_by_type[room_type],
                occupied_beds=0,
                is_maintenance=False,
            )
    else:
        normalized_type = room.type
        if room_type in valid_room_types and room_type != room.type:
            normalized_type = room_type
        expected_beds = total_beds_by_type.get(normalized_type, room.total_beds)
        updates = []
        if room.type != normalized_type:
            room.type = normalized_type
            updates.append("type")
        if room.total_beds != expected_beds:
            room.total_beds = expected_beds
            if room.occupied_beds > room.total_beds:
                room.occupied_beds = room.total_beds
                updates.append("occupied_beds")
            updates.append("total_beds")
        if updates:
            room.save(update_fields=updates)

    if room.is_maintenance:
        return Response({"detail": "This room is under maintenance."}, status=status.HTTP_400_BAD_REQUEST)
    if room.occupied_beds >= room.total_beds:
        return Response({"detail": "No beds available for this room."}, status=status.HTTP_400_BAD_REQUEST)

    existing_phone = User.objects.filter(phone=phone).first()
    if existing_phone:
        return Response({"detail": "A user with this phone number already exists."}, status=status.HTTP_400_BAD_REQUEST)
    if email and User.objects.filter(email__iexact=email).exists():
        return Response({"detail": "A user with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
    room_rent = Decimal(room.monthly_rent or 0)
    if move_in_date_obj == timezone.now().date():
        if joining_fee_status == "paid" and joining_fee_paid <= 0:
            joining_fee_paid = room_rent
        if joining_fee_status == "partial" and joining_fee_paid <= 0:
            return Response({"detail": "Enter a paid amount for partial payment."}, status=status.HTTP_400_BAD_REQUEST)
        if joining_fee_status == "unpaid":
            joining_fee_paid = Decimal("0")
    if joining_fee_paid < 0:
        return Response({"detail": "Paid amount cannot be negative."}, status=status.HTTP_400_BAD_REQUEST)
    if joining_fee_paid > room_rent:
        return Response({"detail": "Paid amount cannot exceed the monthly fee."}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        student = User.objects.create_user(
            phone=phone,
            password=None,
            email=email,
            name=name,
            role=User.Role.STUDENT,
            status=User.Status.ACTIVE,
            verification_state=User.Verification.VERIFIED,
            email_verified=bool(email),
        )
        student.phone_verified = True
        student.save(update_fields=["phone_verified"])
        StudentProfile.objects.create(
            user=student,
            college_company=(request.data.get("college_company") or "").strip(),
            emergency_contact=(request.data.get("emergency_contact") or "").strip(),
        )
        booking = Booking.objects.create(
            hostel=hostel,
            student=student,
            room=room,
            assigned_room_number=assigned_room_number,
            status=Booking.Status.CHECKED_IN,
            student_phone=phone,
            move_in_date=move_in_date,
            approved_by=user,
            approved_at=timezone.now(),
            status_updated_at=timezone.now(),
        )
        sync_room_occupancy([room.id])
        Notification.objects.create(
            user=student,
            type="walkin_checkin",
            title="Checked in by owner",
            body=f"You were added as a walk-in resident at {hostel.name}.",
        )
        today = timezone.now().date()
        if room_rent > 0:
            if move_in_date_obj < today:
                months_elapsed = ((today.year - move_in_date_obj.year) * 12) + (today.month - move_in_date_obj.month)
                if today.day < move_in_date_obj.day:
                    months_elapsed -= 1
                months_elapsed = max(0, months_elapsed)
                for month_offset in range(months_elapsed + 1):
                    cycle_date = add_months_safe(move_in_date_obj, month_offset)
                    ledger = FeeLedger.objects.create(
                        hostel=hostel,
                        student=student,
                        month=cycle_date,
                        amount_due=room_rent,
                        amount_paid=room_rent,
                        due_date=cycle_date,
                        late_fee=Decimal("0"),
                        status=FeeLedger.Status.PAID,
                    )
                    FeePayment.objects.create(
                        ledger=ledger,
                        amount=room_rent,
                        mode=FeePayment.Mode.CASH,
                        reference_id="Auto-paid for backdated join",
                    )
            elif move_in_date_obj == today:
                status_map = {
                    "unpaid": FeeLedger.Status.PENDING,
                    "partial": FeeLedger.Status.PARTIAL,
                    "paid": FeeLedger.Status.PAID,
                }
                ledger = FeeLedger.objects.create(
                    hostel=hostel,
                    student=student,
                    month=move_in_date_obj,
                    amount_due=room_rent,
                    amount_paid=joining_fee_paid,
                    due_date=move_in_date_obj,
                    late_fee=Decimal("0"),
                    status=status_map[joining_fee_status],
                )
                if joining_fee_paid > 0:
                    FeePayment.objects.create(
                        ledger=ledger,
                        amount=joining_fee_paid,
                        mode=joining_fee_mode,
                        reference_id=joining_fee_reference,
                    )

    return Response(
        {
            "student": UserSerializer(student).data,
            "booking": BookingSerializer(booking).data,
        },
        status=status.HTTP_201_CREATED,
    )


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

    return Response(
        {
            "joined": True,
            "hostel": hostel_payload,
            "upcoming_fee": upcoming_payload,
            "user": UserSerializer(user).data,
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def admin_hostel_queue(request):
    if request.user.role != User.Role.ADMIN:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    hostels = (
        Hostel.objects.filter(moderation_status=Hostel.ModerationStatus.PENDING)
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

    hostel.moderation_status = next_status
    hostel.save(update_fields=["moderation_status"])
    return Response(AdminHostelSerializer(hostel).data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def trust_summary(request):
    user = request.user
    owned_hostels = Hostel.objects.filter(owner=user) if user.role == User.Role.OWNER else Hostel.objects.none()
    active_booking = None
    if user.role == User.Role.STUDENT:
        active_booking = (
            Booking.objects.filter(
                student=user,
                status__in=[Booking.Status.APPROVED, Booking.Status.CHECKED_IN, Booking.Status.CHECKED_OUT],
            )
            .select_related("hostel")
            .order_by("-created_at")
            .first()
        )

    payload = {
        "user_id": user.id,
        "role": user.role,
        "trust_score": user.trust_score,
        "verification_state": user.verification_state,
        "account_status": user.status,
        "complaints_filed": 0,
        "complaints_against_me": 0,
        "published_reviews_count": 0,
        "average_review_rating": None,
        "hostel_review_summary": [],
    }

    if user.role == User.Role.STUDENT:
        payload["complaints_filed"] = Complaint.objects.filter(owner=user).count()
        payload["complaints_against_me"] = Complaint.objects.filter(student=user).count()
        ratings = Review.objects.filter(student=user, status=Review.Status.PUBLISHED)
        payload["published_reviews_count"] = ratings.count()
        if active_booking:
            hostel_reviews = Review.objects.filter(hostel=active_booking.hostel, status=Review.Status.PUBLISHED)
            aggregate = hostel_reviews.aggregate(
                avg_cleanliness=models.Avg("rating_cleanliness"),
                avg_food=models.Avg("rating_food"),
                avg_owner=models.Avg("rating_owner"),
                avg_facilities=models.Avg("rating_facilities"),
                avg_value=models.Avg("rating_value"),
            )
            values = [value for value in aggregate.values() if value is not None]
            payload["average_review_rating"] = round(sum(values) / len(values), 1) if values else None
    elif user.role == User.Role.OWNER:
        payload["complaints_filed"] = Complaint.objects.filter(owner=user).count()
        payload["complaints_against_me"] = 0
        published_reviews = Review.objects.filter(hostel__owner=user, status=Review.Status.PUBLISHED)
        payload["published_reviews_count"] = published_reviews.count()
        hostel_summaries = []
        for hostel in owned_hostels:
            hostel_reviews = published_reviews.filter(hostel=hostel)
            aggregate = hostel_reviews.aggregate(
                avg_cleanliness=models.Avg("rating_cleanliness"),
                avg_food=models.Avg("rating_food"),
                avg_owner=models.Avg("rating_owner"),
                avg_facilities=models.Avg("rating_facilities"),
                avg_value=models.Avg("rating_value"),
            )
            values = [value for value in aggregate.values() if value is not None]
            hostel_summaries.append(
                {
                    "hostel_id": hostel.id,
                    "hostel_name": hostel.name,
                    "reviews_count": hostel_reviews.count(),
                    "average_rating": round(sum(values) / len(values), 1) if values else None,
                    "open_complaints": Complaint.objects.filter(hostel=hostel, status__in=[Complaint.Status.OPEN, Complaint.Status.UNDER_REVIEW]).count(),
                }
            )
        payload["hostel_review_summary"] = hostel_summaries

    return Response(payload)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def owner_analytics(request):
    if request.user.role != User.Role.OWNER:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    hostels = Hostel.objects.filter(owner=request.user)
    rooms = Room.objects.filter(hostel__owner=request.user)
    ledgers = FeeLedger.objects.filter(hostel__owner=request.user)
    today = timezone.now().date()

    total_beds = rooms.aggregate(total=models.Sum("total_beds"))["total"] or 0
    occupied_beds = rooms.aggregate(total=models.Sum("occupied_beds"))["total"] or 0
    total_due = ledgers.aggregate(total=models.Sum("amount_due"))["total"] or Decimal("0")
    total_paid = ledgers.aggregate(total=models.Sum("amount_paid"))["total"] or Decimal("0")
    current_month_ledgers = ledgers.filter(due_date__year=today.year, due_date__month=today.month)
    monthly_collected = current_month_ledgers.aggregate(total=models.Sum("amount_paid"))["total"] or Decimal("0")
    overdue_ledgers = ledgers.filter(
        due_date__lt=today,
        status__in=[FeeLedger.Status.PENDING, FeeLedger.Status.PARTIAL, FeeLedger.Status.OVERDUE],
    )
    overdue_amount = sum(
        max(Decimal("0"), (ledger.amount_due + ledger.late_fee) - ledger.amount_paid)
        for ledger in overdue_ledgers
    )
    monthly_overdue_amount = sum(
        max(Decimal("0"), (ledger.amount_due + ledger.late_fee) - ledger.amount_paid)
        for ledger in current_month_ledgers.filter(
            due_date__lt=today,
            status__in=[FeeLedger.Status.PENDING, FeeLedger.Status.PARTIAL, FeeLedger.Status.OVERDUE],
        )
    )

    return Response(
        {
            "hostels_count": hostels.count(),
            "occupancy_rate": round((occupied_beds / total_beds) * 100, 1) if total_beds else 0,
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "fee_collected_till_date": str(total_paid),
            "fee_pending_or_overdue_amount": str(overdue_amount),
            "monthly_collected": str(monthly_collected),
            "monthly_overdue": str(monthly_overdue_amount),
            "revenue_collected": str(total_paid),
            "outstanding_amount": str(max(Decimal("0"), total_due - total_paid)),
            "overdue_ledger_count": overdue_ledgers.count(),
            "pending_reviews": Review.objects.filter(hostel__owner=request.user, status=Review.Status.PENDING).count(),
            "open_complaints": Complaint.objects.filter(
                owner=request.user,
                status__in=[Complaint.Status.OPEN, Complaint.Status.UNDER_REVIEW],
            ).count(),
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def owner_defaulters(request):
    if request.user.role != User.Role.OWNER:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    today = timezone.now().date()
    ledgers = (
        FeeLedger.objects.filter(hostel__owner=request.user)
        .select_related("student", "hostel")
        .filter(
            due_date__lt=today,
            status__in=[FeeLedger.Status.PENDING, FeeLedger.Status.PARTIAL, FeeLedger.Status.OVERDUE],
        )
        .order_by("due_date")
    )

    data = []
    for ledger in ledgers:
        outstanding = max(Decimal("0"), (ledger.amount_due + ledger.late_fee) - ledger.amount_paid)
        days_overdue = max(0, (today - ledger.due_date).days)
        data.append(
            {
                "ledger_id": ledger.id,
                "student_id": ledger.student_id,
                "student_name": ledger.student.name,
                "student_phone": ledger.student.phone,
                "hostel_name": ledger.hostel.name,
                "month": ledger.month,
                "due_date": ledger.due_date,
                "status": ledger.status,
                "days_overdue": days_overdue,
                "outstanding_amount": str(outstanding),
            }
        )
    return Response(data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def owner_send_fee_reminders(request):
    if request.user.role != User.Role.OWNER:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    today = timezone.now().date()
    ledgers = FeeLedger.objects.filter(hostel__owner=request.user)
    hostel_id = request.data.get("hostel_id")
    if hostel_id:
        ledgers = ledgers.filter(hostel_id=hostel_id)
    if request.data.get("only_overdue", True):
        ledgers = ledgers.filter(
            due_date__lt=today,
            status__in=[FeeLedger.Status.PENDING, FeeLedger.Status.PARTIAL, FeeLedger.Status.OVERDUE],
        )
    else:
        ledgers = ledgers.filter(status__in=[FeeLedger.Status.PENDING, FeeLedger.Status.PARTIAL, FeeLedger.Status.OVERDUE])

    ledgers = ledgers.select_related("student", "hostel")
    sent = 0
    for ledger in ledgers:
        outstanding = max(Decimal("0"), (ledger.amount_due + ledger.late_fee) - ledger.amount_paid)
        Notification.objects.create(
            user=ledger.student,
            type="fee_reminder",
            title="Fee reminder",
            body=f"Your due for {ledger.hostel.name} is INR {outstanding} with due date {ledger.due_date}.",
        )
        sent += 1
    return Response({"detail": f"Sent {sent} fee reminder(s).", "count": sent})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def owner_export_fee_ledgers(request):
    if request.user.role not in [User.Role.OWNER, User.Role.ADMIN]:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    ledgers = FeeLedger.objects.select_related("student", "hostel").order_by("-due_date")
    if request.user.role == User.Role.OWNER:
        ledgers = ledgers.filter(hostel__owner=request.user)

    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="staynest-fee-ledgers.csv"'
    writer = csv.writer(response)
    writer.writerow(
        ["Hostel", "Student", "Phone", "Month", "Due Date", "Amount Due", "Amount Paid", "Late Fee", "Status"]
    )
    for ledger in ledgers:
        writer.writerow(
            [
                ledger.hostel.name,
                ledger.student.name,
                ledger.student.phone,
                ledger.month,
                ledger.due_date,
                ledger.amount_due,
                ledger.amount_paid,
                ledger.late_fee,
                ledger.status,
            ]
        )
    return response


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
            amount = ledger.payments.aggregate(total=models.Sum("amount"))["total"] or 0
            ledger.amount_paid = amount
            total_due = ledger.amount_due + ledger.late_fee
            if amount <= 0:
                ledger.status = FeeLedger.Status.PENDING
            elif amount < total_due:
                ledger.status = FeeLedger.Status.PARTIAL
            else:
                ledger.status = FeeLedger.Status.PAID
            ledger.save(update_fields=["amount_paid", "status"])
        return response


class MenuViewSet(viewsets.ModelViewSet):
    queryset = Menu.objects.select_related("hostel").all().order_by("-date")
    serializer_class = MenuSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
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
