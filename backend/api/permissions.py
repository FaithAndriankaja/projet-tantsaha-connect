from rest_framework import permissions

class IsProducer(permissions.BasePermission):
    """Accès réservé aux producteurs (Tantsaha)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'producer')

class IsManager(permissions.BasePermission):
    """Accès réservé aux coordinateurs (Mpandrindra)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'manager')

class IsConsumer(permissions.BasePermission):
    """Accès réservé aux acheteurs (Mpanjifa)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role == 'consumer' or request.user.role == 'mpanjifa'))
