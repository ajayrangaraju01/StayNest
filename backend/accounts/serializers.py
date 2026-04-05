from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import OwnerProfile, StudentProfile, User


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = (
            "age",
            "gender",
            "college_company",
            "emergency_contact",
            "photo_url",
            "id_masked",
        )


class OwnerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OwnerProfile
        fields = ("business_name", "payout_method", "verification_docs")


class UserSerializer(serializers.ModelSerializer):
    student_profile = StudentProfileSerializer(required=False)
    owner_profile = OwnerProfileSerializer(required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "phone",
            "email",
            "name",
            "role",
            "status",
            "verification_state",
            "trust_score",
            "phone_verified",
            "email_verified",
            "date_joined",
            "student_profile",
            "owner_profile",
        )


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    student_profile = StudentProfileSerializer(required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "phone",
            "email",
            "name",
            "role",
            "status",
            "verification_state",
            "email_verified",
            "password",
            "student_profile",
        )

    def create(self, validated_data):
        password = validated_data.pop("password")
        student_profile_data = validated_data.pop("student_profile", None)
        user = User.objects.create_user(password=password, **validated_data)
        if user.role == User.Role.STUDENT:
            StudentProfile.objects.create(user=user, **(student_profile_data or {}))
        if user.role == User.Role.OWNER:
            OwnerProfile.objects.create(user=user)
        return user


class PhoneTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["name"] = user.name
        return token
