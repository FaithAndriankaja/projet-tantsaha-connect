import os
import secrets
import uuid

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.template.loader import render_to_string
from django.utils import timezone
from datetime import timedelta
from urllib.parse import urlencode
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Producer, PickupPoint, User, AuthToken

ROLE_MAP = {
    'mpanjifa': 'consumer',
    'tantsaha': 'producer',
    'mpandrindra': 'manager',
    'consumer': 'consumer',
    'producer': 'producer',
    'manager': 'manager',
}

EMAIL_VERIFICATION_EXPIRY_MINUTES = getattr(settings, 'EMAIL_VERIFICATION_EXPIRY_MINUTES', 10)
EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = getattr(settings, 'EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS', 10)
EMAIL_VERIFICATION_MAX_ATTEMPTS = getattr(settings, 'EMAIL_VERIFICATION_MAX_ATTEMPTS', 5)


def validate_password_strength(password):
    if not password or len(password) < 8:
        return 'Le mot de passe doit contenir au moins 8 caractères.'
    return None


def build_frontend_url(path, query):
    base_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:4200').rstrip('/')
    query_string = urlencode({key: value for key, value in query.items() if value})
    return f"{base_url}{path}?{query_string}" if query_string else f"{base_url}{path}"


def generate_email_verification_code():
    while True:
        code = f"{secrets.randbelow(1_000_000):06d}"
        if not AuthToken.objects.filter(token=code, token_type='verify_email').exists():
            return code


def verification_attempts_key(token_obj):
    return f'email_verify_attempts:{token_obj.id}'


def verification_resend_key(user):
    return f'email_verify_resend:{user.id}'


def seconds_until(expires_at):
    return max(1, int((expires_at - timezone.now()).total_seconds()))


def send_html_email(subject, template_name, context, recipient_list):
    html_content = render_to_string(f'emails/{template_name}', context)
    text_content = "Veuillez activer l'affichage HTML pour lire cet email."
    email = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, recipient_list)
    email.attach_alternative(html_content, "text/html")
    email.send()


def send_verification_code(user):
    AuthToken.objects.filter(user=user, token_type='verify_email').delete()
    token_str = generate_email_verification_code()
    AuthToken.objects.create(
        user=user,
        token=token_str,
        token_type='verify_email',
        expires_at=timezone.now() + timedelta(minutes=EMAIL_VERIFICATION_EXPIRY_MINUTES)
    )
    cache.set(verification_resend_key(user), True, EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS)

    verify_link = build_frontend_url('/verify-email', {
        'email': user.email,
        'code': token_str,
        'phone': user.phone,
    })
    send_html_email(
        subject='Bienvenue sur Tantsaha Connect - Vérifiez votre email',
        template_name='verify_email.html',
        context={
            'user': user,
            'verification_url': verify_link,
            'verification_code': token_str,
            'expires_in_minutes': EMAIL_VERIFICATION_EXPIRY_MINUTES,
        },
        recipient_list=[user.email]
    )


def build_auth_response(user):
    # Génération correcte des tokens via SimpleJWT
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token
    
    # Injection des claims personnalisés sur le token d'accès
    access['role'] = user.role
    access['name'] = user.full_name
    access['is_email_verified'] = user.is_email_verified

    return {
        'access': str(access),
        'refresh': str(refresh),
        'user': {
            'id': str(user.id),
            'phone': user.phone,
            'full_name': user.full_name,
            'email': user.email or '',
            'role': user.role,
            'is_email_verified': user.is_email_verified,
        },
    }


class CustomTokenRefreshView(APIView):
    """Rafraîchit le token d'accès sans passer par le modèle User Django (UUID api.User)."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Le refresh token est requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            refresh = RefreshToken(refresh_token)
            return Response({'access': str(refresh.access_token)}, status=status.HTTP_200_OK)
        except TokenError:
            return Response(
                {'detail': 'Token invalide ou expiré.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class PhoneTokenObtainView(APIView):
    """Obtain JWT tokens using phone + password instead of username."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        phone = request.data.get('phone') or request.data.get('username')
        password = request.data.get('password')

        if not phone or not password:
            return Response(
                {'detail': 'Le numéro de téléphone et le mot de passe sont requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Numéro de téléphone ou mot de passe incorrect.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not check_password(password, user.password_hash):
            return Response(
                {'detail': 'Numéro de téléphone ou mot de passe incorrect.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response({'detail': 'Ce compte a été désactivé.'}, status=status.HTTP_403_FORBIDDEN)

        if not user.is_email_verified:
            return Response(
                {
                    'detail': 'Veuillez vérifier votre adresse email avant de vous connecter.',
                    'code': 'email_not_verified',
                    'email': user.email,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(build_auth_response(user))


class RegisterView(APIView):
    """Create a new user account with phone + password."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        phone = (request.data.get('phone') or '').strip()
        password = request.data.get('password')
        full_name = (request.data.get('full_name') or '').strip()
        email = (request.data.get('email') or '').strip() or None
        role_input = request.data.get('role', 'consumer')
        role = ROLE_MAP.get(role_input, 'consumer')

        if not phone or not password or not full_name or not email:
            return Response(
                {'detail': 'Le téléphone, l\'email, le mot de passe et le nom complet sont requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_email(email)
        except ValidationError:
            return Response({'detail': 'Adresse email invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        password_error = validate_password_strength(password)
        if password_error:
            return Response({'detail': password_error}, status=status.HTTP_400_BAD_REQUEST)

        if role == 'manager':
            pickup_address = (
                (request.data.get('pickup_address') or request.data.get('location') or '').strip()
            )
            if not pickup_address:
                return Response(
                    {'detail': 'L\'adresse du point de retrait est requise.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if User.objects.filter(phone=phone).exists():
            return Response({'detail': 'Ce numéro de téléphone est déjà utilisé.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'detail': 'Cet email est déjà utilisé.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create(
            full_name=full_name,
            phone=phone,
            email=email,
            password_hash=make_password(password),
            role=role,
        )

        if role == 'producer':
            farm_name = request.data.get('farm_name') or f'Ferme {full_name}'
            location = request.data.get('location') or 'Madagascar'
            Producer.objects.create(user=user, farm_name=farm_name, location=location)

        if role == 'manager':
            pickup_name = request.data.get('pickup_point_name') or f'Point {full_name}'
            pickup_address = (
                (request.data.get('pickup_address') or request.data.get('location') or '').strip()
            )
            pickup_city = (request.data.get('pickup_city') or 'Antananarivo').strip()
            PickupPoint.objects.create(
                name=pickup_name,
                address=pickup_address,
                city=pickup_city,
                manager_user=user,
            )

        send_verification_code(user)

        return Response(
            {
                'detail': 'Compte créé. Un code de vérification a été envoyé à votre adresse email.',
                'email': user.email,
                'phone': user.phone,
                'expires_in_minutes': EMAIL_VERIFICATION_EXPIRY_MINUTES,
                'resend_available_in': EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
            },
            status=status.HTTP_201_CREATED,
        )


class ResendVerificationCodeView(APIView):
    """Resend an email verification code."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = (request.data.get('email') or '').strip()
        if not email:
            return Response({'detail': 'Adresse email requise.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Si cette adresse est enregistrée, un nouveau code a été envoyé.'},
                status=status.HTTP_200_OK,
            )

        if user.is_email_verified:
            return Response({'detail': 'Cette adresse email est déjà vérifiée.'}, status=status.HTTP_400_BAD_REQUEST)

        if cache.get(verification_resend_key(user)):
            return Response(
                {
                    'detail': 'Veuillez patienter avant de demander un nouveau code.',
                    'retry_after': EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        send_verification_code(user)
        return Response(
            {
                'detail': 'Un nouveau code de vérification a été envoyé.',
                'resend_available_in': EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
            },
            status=status.HTTP_200_OK,
        )


class VerifyEmailView(APIView):
    """Verify email via token"""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        token_str = (request.data.get('token') or request.data.get('code') or '').strip()
        email = (request.data.get('email') or '').strip()
        if not token_str or not email:
            return Response({'detail': 'Adresse email et code de vérification requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Code de vérification invalide ou introuvable.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_email_verified:
            return Response(build_auth_response(user), status=status.HTTP_200_OK)

        token_obj = (
            AuthToken.objects
            .filter(user=user, token_type='verify_email')
            .order_by('-created_at')
            .first()
        )
        if not token_obj:
            return Response({'detail': 'Code de vérification invalide ou introuvable.'}, status=status.HTTP_400_BAD_REQUEST)

        if token_obj.expires_at < timezone.now():
            token_obj.delete()
            return Response({'detail': 'Ce code de vérification a expiré.'}, status=status.HTTP_400_BAD_REQUEST)

        attempts_key = verification_attempts_key(token_obj)
        attempts = cache.get(attempts_key, 0)
        if attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS:
            return Response(
                {'detail': 'Trop de tentatives incorrectes. Demandez un nouveau code.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if token_obj.token != token_str:
            attempts += 1
            cache.set(attempts_key, attempts, seconds_until(token_obj.expires_at))
            remaining_attempts = max(0, EMAIL_VERIFICATION_MAX_ATTEMPTS - attempts)
            if remaining_attempts == 0:
                return Response(
                    {'detail': 'Trop de tentatives incorrectes. Demandez un nouveau code.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            return Response(
                {
                    'detail': f'Code de vérification invalide. Tentatives restantes : {remaining_attempts}.',
                    'remaining_attempts': remaining_attempts,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_email_verified = True
        user.save()
        AuthToken.objects.filter(user=user, token_type='verify_email').delete()
        cache.delete(attempts_key)
        cache.delete(verification_resend_key(user))

        response = build_auth_response(user)
        response['detail'] = 'Votre email a été vérifié avec succès.'
        return Response(response, status=status.HTTP_200_OK)

class PasswordResetRequestView(APIView):
    """Request a password reset link (via email)"""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        if not email:
            return Response({'detail': 'L\'adresse email est requise.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Ne pas révéler que l'email n'existe pas pour des raisons de sécurité
            return Response({'detail': 'Si cet email est enregistré, un lien de réinitialisation vous a été envoyé.'}, status=status.HTTP_200_OK)

        # Invalider les anciens tokens de reset non utilisés
        AuthToken.objects.filter(user=user, token_type='reset_password').delete()

        # Créer le nouveau token
        token_str = str(uuid.uuid4())
        AuthToken.objects.create(
            user=user,
            token=token_str,
            token_type='reset_password',
            expires_at=timezone.now() + timedelta(hours=1)
        )

        reset_link = build_frontend_url('/reset-password', {'token': token_str})
        send_html_email(
            subject='Réinitialisation de votre mot de passe - Tantsaha Connect',
            template_name='reset_password.html',
            context={'user': user, 'reset_url': reset_link},
            recipient_list=[user.email]
        )

        return Response({'detail': 'Si cet email est enregistré, un lien de réinitialisation vous a été envoyé.'}, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    """Confirm a password reset using the token"""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        token_str = request.data.get('token')
        new_password = request.data.get('password')

        if not token_str or not new_password:
            return Response({'detail': 'Token et nouveau mot de passe sont requis.'}, status=status.HTTP_400_BAD_REQUEST)

        password_error = validate_password_strength(new_password)
        if password_error:
            return Response({'detail': password_error}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token_obj = AuthToken.objects.get(token=token_str, token_type='reset_password')
        except AuthToken.DoesNotExist:
            return Response({'detail': 'Lien de réinitialisation invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        if token_obj.expires_at < timezone.now():
            return Response({'detail': 'Ce lien de réinitialisation a expiré.'}, status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user
        user.password_hash = make_password(new_password)
        user.save()
        token_obj.delete()

        return Response({'detail': 'Mot de passe réinitialisé avec succès.'}, status=status.HTTP_200_OK)



class ProofUploadView(APIView):
    """Upload a payment proof image and return its storage path."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'A file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Sécurisation du nom de fichier
        safe_name = os.path.basename(file.name)
        filename = f'{uuid.uuid4()}_{safe_name}'
        
        # Sauvegarde conforme via l'API Storage de Django
        relative_path = os.path.join('proofs', filename)
        saved_path = default_storage.save(relative_path, ContentFile(file.read()))
        file_url = default_storage.url(saved_path)

        return Response({'proof_file_path': file_url}, status=status.HTTP_201_CREATED)
