from rest_framework import serializers

from .models import Booking, Hostel, HostelPhoto, Room


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
            "move_in_date",
            "move_out_date",
            "created_at",
        )
        read_only_fields = ("created_at",)
