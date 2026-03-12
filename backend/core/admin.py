from django.contrib import admin

from .models import (
    Booking,
    Complaint,
    ComplaintEvidence,
    Expense,
    FeeLedger,
    FeePayment,
    Hostel,
    HostelPhoto,
    Leave,
    MealOptOut,
    Menu,
    Notification,
    Review,
    Room,
)


@admin.register(Hostel)
class HostelAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "city", "area", "moderation_status", "is_active")
    list_filter = ("moderation_status", "city")
    search_fields = ("name", "owner__name", "owner__phone", "area")


admin.site.register(HostelPhoto)
admin.site.register(Room)
admin.site.register(Booking)
admin.site.register(FeeLedger)
admin.site.register(FeePayment)
admin.site.register(Menu)
admin.site.register(MealOptOut)
admin.site.register(Leave)
admin.site.register(Expense)
admin.site.register(Complaint)
admin.site.register(ComplaintEvidence)
admin.site.register(Review)
admin.site.register(Notification)
