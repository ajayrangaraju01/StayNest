from typing import Optional

from .models import User


def get_request_user(request) -> Optional[User]:
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        return None
    try:
        return User.objects.get(id=int(user_id))
    except (ValueError, User.DoesNotExist):
        return None


def get_request_role(request) -> Optional[str]:
    role = request.headers.get("X-User-Role")
    return role if role else None
