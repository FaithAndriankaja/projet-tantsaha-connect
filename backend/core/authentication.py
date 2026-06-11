from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings

from api.models import User as APIUser


class CustomJWTAuthentication(JWTAuthentication):
    """Custom JWTAuthentication that resolves tokens to the project's `api.User` model first.

    This allows `request.user` to be an instance of `api.models.User` (the existing DB-backed model)
    instead of Django's default user model.
    """
    def get_user(self, validated_token):
        user_id = validated_token.get(api_settings.USER_ID_CLAIM)
        if user_id is None:
            return None

        try:
            return APIUser.objects.get(id=user_id)
        except APIUser.DoesNotExist:
            # Fallback to the default behaviour
            return super().get_user(validated_token)
