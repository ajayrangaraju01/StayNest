from django.db import models

from accounts.models import User


class Hostel(models.Model):
    class ModerationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class GenderType(models.TextChoices):
        BOYS = "boys", "Boys"
        GIRLS = "girls", "Girls"
        COED = "coed", "Co-ed"

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="hostels")
    name = models.CharField(max_length=160)
    address = models.TextField()
    area = models.CharField(max_length=120)
    city = models.CharField(max_length=120)
    pincode = models.CharField(max_length=12)
    gender_type = models.CharField(max_length=20, choices=GenderType.choices)
    description = models.TextField(blank=True)
    rules = models.TextField(blank=True)
    contact_number = models.CharField(max_length=20, blank=True)
    amenities = models.JSONField(default=list, blank=True)
    geo_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    geo_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    moderation_status = models.CharField(
        max_length=20,
        choices=ModerationStatus.choices,
        default=ModerationStatus.PENDING,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class HostelPhoto(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="photos")
    url = models.URLField()
    display_order = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f"HostelPhoto({self.hostel_id})"


class Room(models.Model):
    class RoomType(models.TextChoices):
        SINGLE = "single", "Single"
        DOUBLE = "double", "2 Share"
        TRIPLE = "triple", "3 Share"
        FOUR = "four", "4 Share"
        FIVE = "five", "5 Share"
        SIX = "six", "6 Share"

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="rooms")
    type = models.CharField(max_length=20, choices=RoomType.choices)
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2)
    total_beds = models.PositiveSmallIntegerField()
    occupied_beds = models.PositiveSmallIntegerField(default=0)
    is_maintenance = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.hostel.name} - {self.get_type_display()}"


class Booking(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"
        CHECKED_IN = "checked_in", "Checked In"
        CHECKED_OUT = "checked_out", "Checked Out"

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="bookings")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookings")
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    message = models.TextField(blank=True)
    move_in_date = models.DateField(null=True, blank=True)
    move_out_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Booking({self.id})"


class FeeLedger(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PARTIAL = "partial", "Partial"
        PAID = "paid", "Paid"
        OVERDUE = "overdue", "Overdue"

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="fee_ledgers")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="fee_ledgers")
    month = models.DateField()
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField()
    late_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)


class FeePayment(models.Model):
    class Mode(models.TextChoices):
        CASH = "cash", "Cash"
        UPI = "upi", "UPI"
        BANK = "bank", "Bank"

    ledger = models.ForeignKey(FeeLedger, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    mode = models.CharField(max_length=20, choices=Mode.choices)
    paid_at = models.DateTimeField(auto_now_add=True)
    receipt_url = models.URLField(blank=True)
    reference_id = models.CharField(max_length=80, blank=True)


class Menu(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="menus")
    date = models.DateField()
    breakfast = models.CharField(max_length=200, blank=True)
    lunch = models.CharField(max_length=200, blank=True)
    dinner = models.CharField(max_length=200, blank=True)


class MealOptOut(models.Model):
    class MealType(models.TextChoices):
        BREAKFAST = "breakfast", "Breakfast"
        LUNCH = "lunch", "Lunch"
        DINNER = "dinner", "Dinner"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CANCELLED = "cancelled", "Cancelled"

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="meal_opt_outs")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="meal_opt_outs")
    meal_type = models.CharField(max_length=20, choices=MealType.choices)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)


class Leave(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="leaves")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="leaves")
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)


class Expense(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="expenses")
    category = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    expense_date = models.DateField()
    notes = models.TextField(blank=True)


class Complaint(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        UNDER_REVIEW = "under_review", "Under Review"
        RESOLVED = "resolved", "Resolved"
        REJECTED = "rejected", "Rejected"

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="complaints")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owner_complaints")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="student_complaints")
    reason = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    admin_decision = models.TextField(blank=True)


class ComplaintEvidence(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="evidence")
    file_url = models.URLField()
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)


class Review(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PUBLISHED = "published", "Published"
        REJECTED = "rejected", "Rejected"

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="reviews")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    rating_cleanliness = models.PositiveSmallIntegerField(default=0)
    rating_food = models.PositiveSmallIntegerField(default=0)
    rating_owner = models.PositiveSmallIntegerField(default=0)
    rating_facilities = models.PositiveSmallIntegerField(default=0)
    rating_value = models.PositiveSmallIntegerField(default=0)
    text = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)


class Notification(models.Model):
    class Channel(models.TextChoices):
        IN_APP = "in_app", "In App"
        SMS = "sms", "SMS"
        WHATSAPP = "whatsapp", "WhatsApp"
        PUSH = "push", "Push"

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=120)
    title = models.CharField(max_length=160)
    body = models.TextField()
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.IN_APP)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    created_at = models.DateTimeField(auto_now_add=True)
