import calendar
from datetime import date
from decimal import Decimal
from django.db import models
from django.utils import timezone
from ..models import Hostel, Room, Booking, FeeLedger

def add_months_safe(base_date, months):
    month_index = (base_date.month - 1) + months
    year = base_date.year + (month_index // 12)
    month = (month_index % 12) + 1
    day = min(base_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def ledger_outstanding_amount(ledger):
    return max(Decimal("0"), (ledger.amount_due + ledger.late_fee) - ledger.amount_paid)


def recalculate_ledger_payment_status(ledger):
    amount = ledger.payments.aggregate(total=models.Sum("amount"))["total"] or Decimal("0")
    ledger.amount_paid = amount
    total_due = ledger.amount_due + ledger.late_fee
    if amount <= 0:
        ledger.status = FeeLedger.Status.OVERDUE if ledger.due_date < timezone.now().date() else FeeLedger.Status.PENDING
    elif amount < total_due:
        ledger.status = FeeLedger.Status.OVERDUE if ledger.due_date < timezone.now().date() else FeeLedger.Status.PARTIAL
    else:
        ledger.status = FeeLedger.Status.PAID
    ledger.save(update_fields=["amount_paid", "status"])


def get_booking_due_dates(move_in_date, today):
    if not move_in_date:
        return None, None
    current_due = date(
        today.year,
        today.month,
        min(move_in_date.day, calendar.monthrange(today.year, today.month)[1]),
    )
    if current_due < move_in_date:
        current_due = move_in_date
    next_due = add_months_safe(current_due, 1)
    return current_due, next_due


def get_booking_fee_snapshot(booking, today):
    fallback_amount = booking.room.monthly_rent if booking.room else Decimal("0")
    current_due, next_due = get_booking_due_dates(booking.move_in_date, today)
    ledgers = list(
        FeeLedger.objects.filter(hostel=booking.hostel, student=booking.student).order_by("due_date", "created_at")
    )
    outstanding_ledgers = [ledger for ledger in ledgers if ledger_outstanding_amount(ledger) > 0]
    active_booking = booking.status != Booking.Status.CHECKED_OUT

    overdue_or_due_now = next((ledger for ledger in outstanding_ledgers if ledger.due_date <= today), None)
    if overdue_or_due_now:
        return overdue_or_due_now, current_due, next_due

    current_cycle_ledger = next((ledger for ledger in ledgers if current_due and ledger.due_date == current_due), None)
    current_cycle_paid = current_cycle_ledger and ledger_outstanding_amount(current_cycle_ledger) <= 0

    if active_booking and current_due and current_due <= today and not current_cycle_paid:
        if current_cycle_ledger:
            return current_cycle_ledger, current_due, next_due
        return FeeLedger(
            hostel=booking.hostel,
            student=booking.student,
            month=current_due,
            amount_due=fallback_amount,
            amount_paid=Decimal("0"),
            due_date=current_due,
            late_fee=Decimal("0"),
            status=FeeLedger.Status.PENDING if current_due == today else FeeLedger.Status.OVERDUE,
        ), current_due, next_due

    if outstanding_ledgers:
        return outstanding_ledgers[0], current_due, next_due

    if active_booking and next_due:
        return FeeLedger(
            hostel=booking.hostel,
            student=booking.student,
            month=next_due,
            amount_due=fallback_amount,
            amount_paid=Decimal("0"),
            due_date=next_due,
            late_fee=Decimal("0"),
            status=FeeLedger.Status.PENDING,
        ), current_due, next_due

    return None, current_due, next_due


def sync_room_occupancy(room_ids=None):
    rooms = Room.objects.all() if room_ids is None else Room.objects.filter(id__in=set(room_ids))
    for room in rooms:
        checked_in_count = Booking.objects.filter(room=room, status=Booking.Status.CHECKED_IN).count()
        normalized_occupied = min(room.total_beds, checked_in_count)
        if room.occupied_beds != normalized_occupied:
            room.occupied_beds = normalized_occupied
            room.save(update_fields=["occupied_beds"])


def apply_pending_hostel_update(hostel):
    pending = hostel.pending_update or {}
    if not pending:
        return

    photos_data = pending.pop("photos", None)
    room_drafts = pending.pop("rooms", [])
    allowed_fields = {
        "name",
        "address",
        "area",
        "city",
        "pincode",
        "gender_type",
        "description",
        "rules",
        "contact_number",
        "amenities",
        "total_floors",
        "rooms_per_floor",
        "total_rooms",
        "floor_room_counts",
        "geo_lat",
        "geo_lng",
    }
    for attr, value in pending.items():
        if attr in allowed_fields:
            setattr(hostel, attr, value)
    hostel.pending_update = None
    hostel.moderation_status = Hostel.ModerationStatus.APPROVED
    hostel.save()

    if photos_data is not None:
        HostelPhoto.objects.filter(hostel=hostel).delete()
        for photo in photos_data:
            HostelPhoto.objects.create(hostel=hostel, **photo)

    synced_room_ids = []
    for room_payload in room_drafts:
        room = None
        room_id = room_payload.get("id")
        if room_id:
            room = Room.objects.filter(id=room_id, hostel=hostel).first()
        if not room:
            room = Room.objects.filter(hostel=hostel, type=room_payload.get("type"), room_number="").order_by("id").first()

        payload = {
            "type": room_payload.get("type"),
            "monthly_rent": room_payload.get("monthly_rent", 0),
            "daily_rent": room_payload.get("daily_rent", 0),
            "booking_advance": room_payload.get("booking_advance", 0),
            "security_deposit": room_payload.get("security_deposit", 0),
            "total_beds": room_payload.get("total_beds", 0),
            "occupied_beds": room_payload.get("occupied_beds", 0),
            "is_maintenance": room_payload.get("is_maintenance", False),
            "room_number": room_payload.get("room_number", ""),
        }
        if room:
            for attr, value in payload.items():
                setattr(room, attr, value)
            room.save()
        else:
            room = Room.objects.create(hostel=hostel, **payload)
        synced_room_ids.append(room.id)

    if synced_room_ids:
        sync_room_occupancy(synced_room_ids)


