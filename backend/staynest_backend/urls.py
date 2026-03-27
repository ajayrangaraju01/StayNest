"""
URL configuration for staynest_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import (
    LoginView,
    OTPLoginView,
    RegisterView,
    SendLoginOTPView,
    SendRegistrationOTPView,
    UserViewSet,
    admin_all_owners,
    admin_overview,
    admin_owner_queue,
    admin_update_user,
    me_view,
    update_my_profile,
)
from rest_framework_simplejwt.views import TokenRefreshView
from core.views import (
    BookingViewSet,
    ComplaintViewSet,
    FeeLedgerViewSet,
    FeePaymentViewSet,
    admin_all_hostels,
    HostelViewSet,
    LeaveViewSet,
    MenuViewSet,
    NotificationViewSet,
    ReviewViewSet,
    admin_hostel_queue,
    admin_update_hostel_moderation,
    owner_analytics,
    owner_add_walkin_student,
    owner_defaulters,
    owner_export_fee_ledgers,
    owner_send_fee_reminders,
    owner_update_guest,
    RoomViewSet,
    health_check,
    owner_students,
    student_overview,
    trust_summary,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'hostels', HostelViewSet, basename='hostel')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'fee-ledgers', FeeLedgerViewSet, basename='fee-ledger')
router.register(r'fee-payments', FeePaymentViewSet, basename='fee-payment')
router.register(r'menus', MenuViewSet, basename='menu')
router.register(r'leaves', LeaveViewSet, basename='leave')
router.register(r'complaints', ComplaintViewSet, basename='complaint')
router.register(r'reviews', ReviewViewSet, basename='review')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check),
    path('api/owner/students/', owner_students),
    path('api/owner/students/walkin/', owner_add_walkin_student),
    path('api/owner/students/<int:student_id>/update/', owner_update_guest),
    path('api/owner/analytics/', owner_analytics),
    path('api/owner/defaulters/', owner_defaulters),
    path('api/owner/fee-reminders/send/', owner_send_fee_reminders),
    path('api/owner/fee-ledgers/export/', owner_export_fee_ledgers),
    path('api/student/overview/', student_overview),
    path('api/trust/summary/', trust_summary),
    path('api/auth/register/', RegisterView.as_view()),
    path('api/auth/send-registration-otp/', SendRegistrationOTPView.as_view()),
    path('api/auth/send-login-otp/', SendLoginOTPView.as_view()),
    path('api/auth/login-otp/', OTPLoginView.as_view()),
    path('api/auth/login/', LoginView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/me/', me_view),
    path('api/auth/me/update/', update_my_profile),
    path('api/admin/overview/', admin_overview),
    path('api/admin/owners/', admin_owner_queue),
    path('api/admin/owners/all/', admin_all_owners),
    path('api/admin/users/<int:user_id>/update/', admin_update_user),
    path('api/admin/hostels/', admin_hostel_queue),
    path('api/admin/hostels/all/', admin_all_hostels),
    path('api/admin/hostels/<int:hostel_id>/moderation/', admin_update_hostel_moderation),
    path('api/', include(router.urls)),
]
