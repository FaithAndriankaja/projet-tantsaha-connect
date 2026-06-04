from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from django.db import transaction

from .models import (
    UnifiedShopView, Order, OrderItem, Payment, HarvestSheetView, SaleSession
)
from .serializers import (
    UnifiedShopSerializer, OrderCreateSerializer, OrderResponseSerializer,
    PaymentUploadSerializer, PaymentValidateSerializer, HarvestSheetSerializer
)

class ShopViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UnifiedShopView.objects.all()
    serializer_class = UnifiedShopSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        # Par défaut, ne montrer que ce qui est dans une session ouverte
        qs = super().get_queryset().filter(sale_session_status='open')
        pickup_point = self.request.query_params.get('pickup_point_id')
        if pickup_point:
            qs = qs.filter(pickup_point_id=pickup_point)
        return qs

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        return OrderResponseSerializer

    def get_queryset(self):
        # Consommateur ne voit que ses commandes
        if self.request.user.role == 'consumer':
            return Order.objects.filter(consumer_user=self.request.user)
        return super().get_queryset()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # 1. Créer la commande
        order = Order.objects.create(
            consumer_user=request.user,
            pickup_point_id=data['pickup_point_id'],
            sale_session_id=data['sale_session_id'],
            # status et transaction_code générés automatiquement
        )

        # 2. Insérer les items (déclenche les triggers de stock et de total)
        for item_data in data['items']:
            OrderItem.objects.create(
                order=order,
                product=item_data['product'],
                producer=item_data['producer'],
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price']
            )

        # Recharger l'order pour avoir le total_amount calculé par la base
        order.refresh_from_db()
        
        response_serializer = OrderResponseSerializer(order)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='payment')
    def upload_payment(self, request, pk=None):
        order = self.get_object()
        if order.status != 'pending_payment':
            return Response({"error_code": "INVALID_STATE", "message": "Paiement impossible pour ce statut."}, status=400)
            
        serializer = PaymentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        Payment.objects.create(
            order=order,
            method=serializer.validated_data['method'],
            proof_file_path=serializer.validated_data['proof_file_path']
            # Le trigger va automatiquement passer l'order en 'payment_submitted'
        )
        
        return Response({"message": "Preuve envoyée avec succès."}, status=status.HTTP_201_CREATED)

class AdminPaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentValidateSerializer
    permission_classes = [IsAuthenticated] # Ajouter IsAdmin dans un vrai contexte

    @action(detail=True, methods=['put'], url_path='validate')
    def validate_payment(self, request, pk=None):
        payment = self.get_object()
        serializer = self.get_serializer(payment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Sauvegarde la validation (ex: accepted)
        # Le trigger postgres mettra à jour l'order en 'confirmed' (si accepted)
        serializer.save(verified_by_user=request.user)
        
        payment.order.refresh_from_db()
        return Response({
            "verification_status": payment.verification_status,
            "order_status_updated_to": payment.order.status
        })

class HarvestSheetViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HarvestSheetView.objects.all()
    serializer_class = HarvestSheetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Producteur ne voit que ses récoltes
        if self.request.user.role == 'producer':
            # On suppose qu'il a un profil producer
            return super().get_queryset().filter(producer_id=self.request.user.producer.id)
        return super().get_queryset()
