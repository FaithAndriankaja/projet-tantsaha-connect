from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from api.auth_views import (
    CustomTokenRefreshView,
    PhoneTokenObtainView,
    RegisterView,
    ProofUploadView,
    VerifyEmailView,
    ResendVerificationCodeView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    #  documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Authentication endpoints (phone-based login provided)
    path('api/auth/login/', PhoneTokenObtainView.as_view(), name='token_obtain_pair'),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('api/auth/resend-verification-code/', ResendVerificationCodeView.as_view(), name='resend_verification_code'),
    path('api/auth/password-reset-request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('api/auth/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('api/media/proof/', ProofUploadView.as_view(), name='proof_upload'),
    
    # App API Endpoints
    path('api/', include('api.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
