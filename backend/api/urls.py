from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ShopViewSet, OrderViewSet, AdminPaymentViewSet, HarvestSheetViewSet,
    PickupPointViewSet, ProducerMeView, ManagerDeliveriesView, CategoryViewSet, ProductStockViewSet,ProducerHarvestCreateView,SaleSessionViewSet
)
from .stripe_views import CreatePaymentIntentView, StripeWebhookView

router = DefaultRouter()
#  CORRECTION : Simplification de l'URL pour correspondre aux requêtes standard d'Angular ('api/shop/')
router.register(r'shop', ShopViewSet, basename='unified-shop')

router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'admin/payments', AdminPaymentViewSet, basename='admin-payments')

#  CORRECTION : Nettoyage du doublon (gardé une seule fois)
router.register(r'harvest-sheet', HarvestSheetViewSet, basename='harvest-sheet')

router.register(r'pickup-points', PickupPointViewSet, basename='pickup-points')
router.register(r'categories', CategoryViewSet, basename='categories')

# La route pour le bouton Switch du Tantsaha ('api/stocks/')
router.register(r'stocks', ProductStockViewSet, basename='stocks')

router.register(r'sale-sessions', SaleSessionViewSet, basename='sale-sessions')

urlpatterns = [
    path('producers/me/', ProducerMeView.as_view(), name='producer-me'),
    path('manager/deliveries/', ManagerDeliveriesView.as_view(), name='manager-deliveries'),
    path('producer/harvests/', ProducerHarvestCreateView.as_view(), name='producer-harvests'),
    # Routes Stripe
    path('stripe/create-payment-intent/', CreatePaymentIntentView.as_view(), name='stripe-create-payment-intent'),
    path('stripe/webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('', include(router.urls)),
]
