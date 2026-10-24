import csv
from datetime import date
from decimal import Decimal
from django.http import HttpResponse
from django.db import models, transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions, status
from rest_framework.response import Response

from accounts.models import StudentProfile, User
from accounts.serializers import UserSerializer
from ..models import Booking, FeeLedger, FeePayment, Hostel, Room, Notification, Review
from ..serializers import BookingSerializer, FeeLedgerSerializer
from ..services.booking_services import (
    add_months_safe,
    ledger_outstanding_amount,
    recalculate_ledger_payment_status,
    get_booking_due_dates,
    get_booking_fee_snapshot,
    sync_room_occupancy,
)

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
        today = timezone.now().date()
        upcoming_fee, _, _ = get_booking_fee_snapshot(booking, today)
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
                "upcoming_fee_amount": str(ledger_outstanding_amount(upcoming_fee) if getattr(upcoming_fee, "id", None) else upcoming_fee.amount_due) if upcoming_fee else "",
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
def owner_analytics(request):
    if request.user.role != User.Role.OWNER:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

    hostels = Hostel.objects.filter(owner=request.user)
    rooms = Room.objects.filter(hostel__owner=request.user)
    ledgers = FeeLedger.objects.filter(hostel__owner=request.user)
    today = timezone.now().date()
    active_monthly_bookings = Booking.objects.filter(
        hostel__owner=request.user,
        status__in=[Booking.Status.APPROVED, Booking.Status.CHECKED_IN],
        stay_type=Booking.StayType.MONTHLY,
    ).select_related("room")
    checkins_today = Booking.objects.filter(
        hostel__owner=request.user,
        status=Booking.Status.CHECKED_IN,
        status_updated_at__date=today,
    ).count()
    checkouts_today = Booking.objects.filter(
        hostel__owner=request.user,
        status=Booking.Status.CHECKED_OUT,
        status_updated_at__date=today,
    ).count()
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
    monthly_revenue = sum(
        Decimal(booking.room.monthly_rent or 0)
        for booking in active_monthly_bookings
        if booking.room
    )
    room_type_occupancy = []
    for room_type, label in Room.RoomType.choices:
        if room_type == Room.RoomType.SINGLE:
            continue
        type_rooms = rooms.filter(type=room_type)
        total_type_beds = type_rooms.aggregate(total=models.Sum("total_beds"))["total"] or 0
        occupied_type_beds = type_rooms.aggregate(total=models.Sum("occupied_beds"))["total"] or 0
        if total_type_beds:
            room_type_occupancy.append(
                {
                    "type": room_type,
                    "label": label,
                    "occupied_beds": occupied_type_beds,
                    "total_beds": total_type_beds,
                    "occupancy_rate": round((occupied_type_beds / total_type_beds) * 100, 1) if total_type_beds else 0,
                }
            )

    return Response(
        {
            "hostels_count": hostels.count(),
            "occupancy_rate": round((occupied_beds / total_beds) * 100, 1) if total_beds else 0,
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "active_guests_count": active_monthly_bookings.count(),
            "monthly_revenue": str(monthly_revenue),
            "expected_this_month": str(monthly_revenue),
            "checkins_today": checkins_today,
            "checkouts_today": checkouts_today,
            "room_type_occupancy": room_type_occupancy,
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
    bookings = (
        Booking.objects.filter(
            hostel__owner=request.user,
            status__in=[Booking.Status.APPROVED, Booking.Status.CHECKED_IN],
        )
        .select_related("student", "hostel", "room")
        .order_by("move_in_date", "created_at")
    )

    data = []
    for booking in bookings:
        due_item, _, _ = get_booking_fee_snapshot(booking, today)
        if not due_item or due_item.due_date > today:
            continue
        outstanding = ledger_outstanding_amount(due_item) if getattr(due_item, "id", None) else Decimal(due_item.amount_due)
        if outstanding <= 0:
            continue
        days_overdue = max(0, (today - due_item.due_date).days)
        data.append(
            {
                "ledger_id": getattr(due_item, "id", None),
                "student_id": booking.student_id,
                "student_name": booking.student.name,
                "student_phone": booking.student.phone,
                "hostel_name": booking.hostel.name,
                "month": due_item.month,
                "due_date": due_item.due_date,
                "status": due_item.status,
                "days_overdue": days_overdue,
                "outstanding_amount": str(outstanding),
            }
        )
    data.sort(key=lambda item: (item["due_date"], item["student_name"].lower()))
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


