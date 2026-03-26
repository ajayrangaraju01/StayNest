from rest_framework import serializers

from .models import Booking, Hostel, HostelPhoto, Notification, Room


class HostelPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelPhoto
        fields = ("id", "url", "display_order")


class HostelSerializer(serializers.ModelSerializer):
    photos = HostelPhotoSerializer(many=True, required=False)

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
            "moderation_status",
            "is_active",
            "photos",
        )

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


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = (
            "id",
            "hostel",
            "type",
            "monthly_rent",
            "total_beds",
            "occupied_beds",
            "is_maintenance",
        )


class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = (
            "id",
            "hostel",
            "student",
            "room",
            "status",
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
