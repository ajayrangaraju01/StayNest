from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions, status
from rest_framework.response import Response

from ..models import Hostel, Review, Complaint

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


