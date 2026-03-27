import os

from django.core.management.base import BaseCommand, CommandError

from accounts.models import User


class Command(BaseCommand):
    help = "Create or update the default admin user from environment variables."

    def handle(self, *args, **options):
        phone = os.getenv("ADMIN_PHONE", "").strip()
        password = os.getenv("ADMIN_PASSWORD", "").strip()
        email = os.getenv("ADMIN_EMAIL", "").strip().lower()
        name = os.getenv("ADMIN_NAME", "StayNest Admin").strip() or "StayNest Admin"

        if not phone or not password:
            raise CommandError("ADMIN_PHONE and ADMIN_PASSWORD must be set.")

        user, created = User.objects.get_or_create(
            phone=phone,
            defaults={
                "email": email or None,
                "name": name,
                "role": User.Role.ADMIN,
                "status": User.Status.ACTIVE,
                "verification_state": User.Verification.VERIFIED,
                "is_staff": True,
                "is_superuser": True,
                "email_verified": bool(email),
                "phone_verified": True,
            },
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created admin user {phone}."))
            return

        user.name = name
        user.role = User.Role.ADMIN
        user.status = User.Status.ACTIVE
        user.verification_state = User.Verification.VERIFIED
        user.is_staff = True
        user.is_superuser = True
        user.phone_verified = True
        if email:
            user.email = email
            user.email_verified = True
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Updated admin user {phone}."))
