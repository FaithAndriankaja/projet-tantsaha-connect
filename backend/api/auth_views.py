import os
import uuid

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Producer, User

ROLE_MAP = {
    'mpanjifa': 'consumer',
    'tantsaha': 'producer',
    'mpandrindra': 'manager',
    'consumer': 'consumer',
    'producer': 'producer',
    'manager': 'manager',
}


def build_auth_response(user):
    # Génération correcte des tokens via SimpleJWT
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token
    
    # Injection des claims personnalisés sur le token d'accès
    access['role'] = user.role
    access['name'] = user.full_name

    return {
        'access': str(access),
        'refresh': str(refresh),
        'user': {
            'id': str(user.id),
            'phone': user.phone,
            'full_name': user.full_name,
            'email': user.email or '',
            'role': user.role,
        },
    }


class PhoneTokenObtainView(APIView):
    """Obtain JWT tokens using phone + password instead of username."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        phone = request.data.get('phone') or request.data.get('username')
        password = request.data.get('password')

        if not phone or not password:
            return Response({'detail': 'phone and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            return Response({'detail': 'No active account found with the given credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        # Vérification sécurisée du mot de passe
        if not check_password(password, user.password_hash):
            return Response({'detail': 'No active account found with the given credentials'}, status=status.HTTP_401_UNAUTHORIZED)

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

        if not phone or not password or not full_name:
            return Response(
                {'detail': 'phone, password and full_name are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(phone=phone).exists():
            return Response({'detail': 'Ce numéro de téléphone est déjà utilisé.'}, status=status.HTTP_400_BAD_REQUEST)

        if email and User.objects.filter(email=email).exists():
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

        return Response(build_auth_response(user), status=status.HTTP_201_CREATED)


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
