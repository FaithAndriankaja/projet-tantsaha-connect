from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ShopViewSet, OrderViewSet, AdminPaymentViewSet, HarvestSheetViewSet,
    PickupPointViewSet, ProducerMeView, ManagerDeliveriesView,
)

router = DefaultRouter()
router.register(r'shop/unified', ShopViewSet, basename='unified-shop')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'admin/payments', AdminPaymentViewSet, basename='admin-payments')
router.register(r'harvest-sheet', HarvestSheetViewSet, basename='harvest-sheet')
router.register(r'pickup-points', PickupPointViewSet, basename='pickup-points')

urlpatterns = [
    path('producers/me/', ProducerMeView.as_view(), name='producer-me'),
    path('manager/deliveries/', ManagerDeliveriesView.as_view(), name='manager-deliveries'),
    path('', include(router.urls)),
]
