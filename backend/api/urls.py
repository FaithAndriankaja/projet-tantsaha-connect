from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ShopViewSet, OrderViewSet, AdminPaymentViewSet, HarvestSheetViewSet
)

router = DefaultRouter()
router.register(r'shop/unified', ShopViewSet, basename='unified-shop')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'admin/payments', AdminPaymentViewSet, basename='admin-payments')
router.register(r'harvest-sheet', HarvestSheetViewSet, basename='harvest-sheet')

urlpatterns = [
    path('', include(router.urls)),
]
