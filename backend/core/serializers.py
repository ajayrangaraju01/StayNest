from rest_framework import serializers

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


class HostelPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelPhoto
        fields = ("id", "url", "display_order")


class HostelSerializer(serializers.ModelSerializer):
    photos = HostelPhotoSerializer(many=True, required=False)
    pending_update = serializers.SerializerMethodField()
    has_pending_changes = serializers.SerializerMethodField()

    class Meta:
        model = Hostel
        fields = (
            "id",
            "owner",
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
            "pending_update",
            "has_pending_changes",
            "moderation_status",
            "is_active",
            "photos",
        )

    def get_pending_update(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        if request.user.role == "admin":
            return obj.pending_update
        if request.user.role == "owner" and obj.owner_id == request.user.id:
            return obj.pending_update
        return None

    def get_has_pending_changes(self, obj):
        return bool(obj.pending_update)

    def create(self, validated_data):
        photos_data = validated_data.pop("photos", [])
        hostel = Hostel.objects.create(**validated_data)
        for photo in photos_data:
            HostelPhoto.objects.create(hostel=hostel, **photo)
        return hostel

    def update(self, instance, validated_data):
        photos_data = validated_data.pop("photos", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if photos_data is not None:
            HostelPhoto.objects.filter(hostel=instance).delete()
            for photo in photos_data:
                HostelPhoto.objects.create(hostel=instance, **photo)
        return instance


class AdminHostelSerializer(HostelSerializer):
    owner_name = serializers.CharField(source="owner.name", read_only=True)
    owner_phone = serializers.CharField(source="owner.phone", read_only=True)
    owner_status = serializers.CharField(source="owner.status", read_only=True)
    owner_verification_state = serializers.CharField(source="owner.verification_state", read_only=True)

    class Meta(HostelSerializer.Meta):
        fields = HostelSerializer.Meta.fields + (
            "owner_name",
            "owner_phone",
            "owner_status",
            "owner_verification_state",
            "created_at",
        )


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = (
            "id",
            "hostel",
            "room_number",
            "type",
            "monthly_rent",
            "daily_rent",
            "booking_advance",
            "security_deposit",
            "total_beds",
            "occupied_beds",
            "is_maintenance",
        )


class BookingSerializer(serializers.ModelSerializer):
    room_number = serializers.SerializerMethodField()

    def get_room_number(self, obj):
        return obj.assigned_room_number or (obj.room.room_number if obj.room else "")

    class Meta:
        model = Booking
        fields = (
            "id",
            "hostel",
            "student",
            "room",
            "assigned_room_number",
            "room_number",
            "status",
            "stay_type",
            "total_days",
            "message",
            "student_phone",
            "move_in_date",
            "move_out_date",
            "approved_by",
            "approved_at",
            "rejected_by",
            "rejected_at",
            "status_updated_at",
            "created_at",
        )
        read_only_fields = (
            "approved_by",
            "approved_at",
            "rejected_by",
            "rejected_at",
            "status_updated_at",
            "created_at",
        )


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id",
            "user",
            "type",
            "title",
            "body",
            "channel",
            "status",
            "created_at",
        )
        read_only_fields = ("created_at",)


class FeePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeePayment
        fields = (
            "id",
            "ledger",
            "amount",
            "mode",
            "paid_at",
            "receipt_url",
            "reference_id",
            "razorpay_ref",
        )
        read_only_fields = ("paid_at",)


class FeeLedgerSerializer(serializers.ModelSerializer):
    payments = FeePaymentSerializer(many=True, read_only=True)
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    student_name = serializers.CharField(source="student.name", read_only=True)
    student_phone = serializers.CharField(source="student.phone", read_only=True)

    class Meta:
        model = FeeLedger
        fields = (
            "id",
            "hostel",
            "hostel_name",
            "student",
            "student_name",
            "student_phone",
            "month",
            "amount_due",
            "amount_paid",
            "due_date",
            "late_fee",
            "status",
            "created_at",
            "payments",
        )
        read_only_fields = ("created_at",)


class MenuSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)

    class Meta:
        model = Menu
        fields = (
            "id",
            "hostel",
            "hostel_name",
            "date",
            "breakfast",
            "lunch",
            "dinner",
            "is_override",
        )


class LeaveSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)

    class Meta:
        model = Leave
        fields = (
            "id",
            "hostel",
            "hostel_name",
            "student",
            "student_name",
            "start_date",
            "end_date",
            "reason",
            "status",
        )


class ComplaintEvidenceSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.CharField(source="submitted_by.name", read_only=True)

    class Meta:
        model = ComplaintEvidence
        fields = (
            "id",
            "file_url",
            "submitted_by",
            "submitted_by_name",
            "created_at",
        )
        read_only_fields = ("submitted_by", "created_at")


class ComplaintSerializer(serializers.ModelSerializer):
    evidence = ComplaintEvidenceSerializer(many=True, read_only=True)
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    owner_name = serializers.CharField(source="owner.name", read_only=True)
    student_name = serializers.CharField(source="student.name", read_only=True)
    student_phone = serializers.CharField(source="student.phone", read_only=True)

    class Meta:
        model = Complaint
        fields = (
            "id",
            "hostel",
            "hostel_name",
            "owner",
            "owner_name",
            "student",
            "student_name",
            "student_phone",
            "reason",
            "status",
            "admin_decision",
            "created_at",
            "updated_at",
            "evidence",
        )
        read_only_fields = (
            "owner",
            "status",
            "admin_decision",
            "created_at",
            "updated_at",
        )


class ReviewSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    student_name = serializers.CharField(source="student.name", read_only=True)
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "hostel",
            "hostel_name",
            "student",
            "student_name",
            "rating_cleanliness",
            "rating_food",
            "rating_owner",
            "rating_facilities",
            "rating_value",
            "average_rating",
            "text",
            "owner_reply",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "student",
            "status",
            "created_at",
            "updated_at",
        )

    def get_average_rating(self, obj):
        ratings = [
            obj.rating_cleanliness,
            obj.rating_food,
            obj.rating_owner,
            obj.rating_facilities,
            obj.rating_value,
        ]
        return round(sum(ratings) / len(ratings), 1)
