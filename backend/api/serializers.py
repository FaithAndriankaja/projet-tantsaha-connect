from rest_framework import serializers
from .models import (
    User, UnifiedShopView, Order, OrderItem, Payment, HarvestSheetView, SaleSession
)
from django.utils import timezone

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'phone', 'email', 'role', 'default_pickup_point']
        read_only_fields = ['id', 'role']

class UnifiedShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnifiedShopView
        fields = '__all__'

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['product', 'producer', 'quantity', 'unit_price']

class OrderCreateSerializer(serializers.Serializer):
    pickup_point_id = serializers.UUIDField()
    sale_session_id = serializers.UUIDField()
    items = OrderItemSerializer(many=True)

    def validate(self, data):
        # Validation: Session is open?
        try:
            session = SaleSession.objects.get(id=data['sale_session_id'])
            if session.status != 'open':
                raise serializers.ValidationError({"sale_session_id": "Cette session de vente n'est pas ouverte."})
            if session.closes_at < timezone.now():
                raise serializers.ValidationError({"sale_session_id": "Cette session de vente est terminée."})
        except SaleSession.DoesNotExist:
            raise serializers.ValidationError({"sale_session_id": "Session introuvable."})
        
        # Validation: Items not empty
        if not data.get('items'):
            raise serializers.ValidationError({"items": "La commande doit contenir au moins un article."})
        
        for item in data['items']:
            if item['quantity'] <= 0:
                raise serializers.ValidationError({"items": "La quantité doit être supérieure à 0."})

        return data

class OrderResponseSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    class Meta:
        model = Order
        fields = ['id', 'transaction_code', 'status', 'total_amount', 'pickup_point', 'sale_session', 'items', 'created_at']

class PaymentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['method', 'proof_file_path']

class PaymentValidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['verification_status']

class HarvestSheetSerializer(serializers.ModelSerializer):
    class Meta:
        model = HarvestSheetView
        fields = '__all__'
