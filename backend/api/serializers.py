from rest_framework import serializers
from .models import (
    User, UnifiedShopView, Order, OrderItem, Payment, HarvestSheetView, SaleSession,
    PickupPoint, Producer, Product, Category
)
from django.utils import timezone

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'phone', 'email', 'role', 'default_pickup_point']
        read_only_fields = ['id', 'role']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']

class UnifiedShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnifiedShopView
        fields = '__all__'

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['product', 'producer', 'quantity', 'unit_price']

class OrderItemResponseSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    unit = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['product', 'producer', 'product_name', 'quantity', 'unit_price', 'unit']

    def get_product_name(self, obj):
        return obj.product.name if obj.product_id else None

    def get_unit(self, obj):
        return obj.product.unit if obj.product_id else None

class OrderCreateSerializer(serializers.Serializer):
    pickup_point_id = serializers.UUIDField()
    sale_session_id = serializers.UUIDField()
    items = OrderItemSerializer(many=True)

    def validate(self, data):
        try:
            session = SaleSession.objects.get(id=data['sale_session_id'])
            if session.status != 'open':
                raise serializers.ValidationError({"sale_session_id": "Cette session de vente n'est pas ouverte."})
            if session.closes_at < timezone.now():
                raise serializers.ValidationError({"sale_session_id": "Cette session de vente est terminée."})
        except SaleSession.DoesNotExist:
            raise serializers.ValidationError({"sale_session_id": "Session introuvable."})

        if not data.get('items'):
            raise serializers.ValidationError({"items": "La commande doit contenir au moins un article."})

        for item in data['items']:
            if item['quantity'] <= 0:
                raise serializers.ValidationError({"items": "La quantité doit être supérieure à 0."})

        return data

class OrderResponseSerializer(serializers.ModelSerializer):
    items = OrderItemResponseSerializer(many=True, read_only=True)
    pickup_point_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'transaction_code', 'status', 'total_amount', 'pickup_point', 'pickup_point_name', 'sale_session', 'items', 'created_at']

    def get_pickup_point_name(self, obj):
        return obj.pickup_point.name if obj.pickup_point_id else None

class ManagerDeliveryItemSerializer(serializers.Serializer):
    product_name = serializers.CharField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3)
    unit = serializers.CharField()

class ManagerDeliverySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    transaction_code = serializers.CharField()
    status = serializers.CharField()
    consumer_name = serializers.CharField()
    consumer_phone = serializers.CharField()
    items = ManagerDeliveryItemSerializer(many=True)

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

class PickupPointSerializer(serializers.ModelSerializer):
    class Meta:
        model = PickupPoint
        fields = ['id', 'name', 'address', 'city']

class ProducerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Producer
        fields = ['id', 'farm_name', 'location', 'description', 'user']
