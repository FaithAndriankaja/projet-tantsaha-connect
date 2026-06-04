from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError

def custom_exception_handler(exc, context):
    """
    Custom exception handler to standardize all API errors.
    Returns:
    {
        "error_code": "...",
        "message": "...",
        "details": {}
    }
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if response is not None:
        error_code = "API_ERROR"
        message = "Une erreur est survenue."
        details = response.data

        # Determine specific error codes based on status
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            error_code = "VALIDATION_ERROR"
            message = "Erreur de validation des données."
        elif response.status_code == status.HTTP_401_UNAUTHORIZED:
            error_code = "AUTHENTICATION_FAILED"
            message = "Authentification requise ou jeton invalide."
        elif response.status_code == status.HTTP_403_FORBIDDEN:
            error_code = "PERMISSION_DENIED"
            message = "Vous n'avez pas la permission d'effectuer cette action."
        elif response.status_code == status.HTTP_404_NOT_FOUND:
            error_code = "NOT_FOUND"
            message = "Ressource introuvable."
            details = {}

        # Format details
        if isinstance(details, list):
            details = {"non_field_errors": details}
        elif isinstance(details, str):
            details = {"detail": [details]}

        # If standard DRF "detail" key is used, extract message
        if "detail" in details and len(details) == 1:
            message = details.pop("detail")[0] if isinstance(details["detail"], list) else details.pop("detail")

        response.data = {
            "error_code": error_code,
            "message": str(message),
            "details": details
        }
    else:
        # Handling standard Django Exceptions that DRF missed
        if isinstance(exc, DjangoValidationError):
            return Response(
                {
                    "error_code": "VALIDATION_ERROR",
                    "message": "Erreur de validation des données.",
                    "details": exc.message_dict if hasattr(exc, 'message_dict') else {"non_field_errors": list(exc.messages)}
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    return response
