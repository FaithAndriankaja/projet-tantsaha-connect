import uuid
from django.db import models

class UserRole(models.TextChoices):
    CONSUMER = 'consumer', 'Consumer'
    PRODUCER = 'producer', 'Producer'
    MANAGER = 'manager', 'Manager'
    ADMIN = 'admin', 'Admin'

class SaleSessionStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    OPEN = 'open', 'Open'
    CLOSED = 'closed', 'Closed'
    DISTRIBUTED = 'distributed', 'Distributed'
    CANCELLED = 'cancelled', 'Cancelled'

class OrderStatus(models.TextChoices):
    PENDING_PAYMENT = 'pending_payment', 'Pending Payment'
    PAYMENT_SUBMITTED = 'payment_submitted', 'Payment Submitted'
    CONFIRMED = 'confirmed', 'Confirmed'
    READY = 'ready', 'Ready'
    PICKED_UP = 'picked_up', 'Picked Up'
    CANCELLED = 'cancelled', 'Cancelled'

class PaymentMethod(models.TextChoices):
    MVOLA = 'mvola', 'Mvola'
    ORANGE_MONEY = 'orange_money', 'Orange Money'
    AIRTEL_MONEY = 'airtel_money', 'Airtel Money'

class PaymentVerificationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    ACCEPTED = 'accepted', 'Accepted'
    REJECTED = 'rejected', 'Rejected'

class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, unique=True)
    email = models.EmailField(max_length=180, unique=True, null=True, blank=True)
    password_hash = models.TextField()
    role = models.CharField(max_length=20, choices=UserRole.choices)
    default_pickup_point = models.ForeignKey('PickupPoint', on_delete=models.SET_NULL, null=True, blank=True, db_column='default_pickup_point_id')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} ({self.role})"

    class Meta:
        managed = False
        db_table = 'users'

class PickupPoint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=150)
    address = models.TextField()
    city = models.CharField(max_length=100)
    manager_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, db_column='manager_user_id', related_name='managed_pickup_points')
    distribution_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        managed = False
        db_table = 'pickup_points'

class Producer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_column='user_id')
    farm_name = models.CharField(max_length=150)
    location = models.TextField()
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.farm_name

    class Meta:
        managed = False
        db_table = 'producers'

class ProducerPickupPoint(models.Model):
    # Table de liaison producteur <-> point de retrait
    # La table SQL utilise une clé primaire composite (producer_id, pickup_point_id) sans colonne 'id'.
    # On utilise 'producer' comme PK artificiel pour Django et unique_together pour la contrainte réelle.
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, db_column='producer_id', primary_key=True)
    pickup_point = models.ForeignKey(PickupPoint, on_delete=models.CASCADE, db_column='pickup_point_id')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.producer.farm_name} @ {self.pickup_point.name}"

    class Meta:
        managed = False
        db_table = 'producer_pickup_points'
        unique_together = (('producer', 'pickup_point'),)

class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        managed = False
        db_table = 'categories'

class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    producer = models.ForeignKey(Producer, on_delete=models.CASCADE, db_column='producer_id')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, db_column='category_id')
    name = models.CharField(max_length=150)
    description = models.TextField(null=True, blank=True)
    unit = models.CharField(max_length=30)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        managed = False
        db_table = 'products'
        unique_together = (('id', 'producer'),)

class SaleSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    pickup_point = models.ForeignKey(PickupPoint, on_delete=models.CASCADE, db_column='pickup_point_id')
    opens_at = models.DateTimeField()
    closes_at = models.DateTimeField()
    pickup_date = models.DateField()
    status = models.CharField(max_length=20, choices=SaleSessionStatus.choices, default=SaleSessionStatus.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session {self.pickup_point.name} - {self.pickup_date}"

    class Meta:
        managed = False
        db_table = 'sale_sessions'
        unique_together = (('id', 'pickup_point'),)

class ProductStock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, db_column='product_id')
    sale_session = models.ForeignKey(SaleSession, on_delete=models.CASCADE, db_column='sale_session_id')
    available_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    reserved_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product.name} ({self.sale_session.pickup_date})"

    class Meta:
        managed = False
        db_table = 'product_stocks'
        unique_together = (('product', 'sale_session'),)

class Order(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    transaction_code = models.CharField(max_length=40, unique=True, null=True, blank=True) # Set by trigger
    consumer_user = models.ForeignKey(User, on_delete=models.RESTRICT, db_column='consumer_user_id')
    pickup_point = models.ForeignKey(PickupPoint, on_delete=models.RESTRICT, db_column='pickup_point_id')
    sale_session = models.ForeignKey(SaleSession, on_delete=models.RESTRICT, db_column='sale_session_id')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0) # Handled by trigger
    status = models.CharField(max_length=30, choices=OrderStatus.choices, default=OrderStatus.PENDING_PAYMENT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order {self.transaction_code or self.id}"

    class Meta:
        managed = False
        db_table = 'orders'

class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='order_id', related_name='items')
    product = models.ForeignKey(Product, on_delete=models.RESTRICT, db_column='product_id')
    producer = models.ForeignKey(Producer, on_delete=models.RESTRICT, db_column='producer_id')
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True) # Generated column
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"

    class Meta:
        managed = False
        db_table = 'order_items'

class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, db_column='order_id')
    method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    proof_file_path = models.TextField()
    verification_status = models.CharField(max_length=20, choices=PaymentVerificationStatus.choices, default=PaymentVerificationStatus.PENDING)
    verified_by_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, db_column='verified_by_user_id')
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment for {self.order.transaction_code}"

    class Meta:
        managed = False
        db_table = 'payments'

class HandoverConfirmation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, db_column='order_id')
    manager_user = models.ForeignKey(User, on_delete=models.RESTRICT, db_column='manager_user_id')
    handed_over_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Handover for {self.order.transaction_code}"

    class Meta:
        managed = False
        db_table = 'handover_confirmations'

# Database Views (Read-only models)
class UnifiedShopView(models.Model):
    product_id = models.UUIDField(primary_key=True)
    sale_session_id = models.UUIDField()
    pickup_point_id = models.UUIDField()
    pickup_point_name = models.CharField(max_length=150)
    product_name = models.CharField(max_length=150)
    product_description = models.TextField()
    unit = models.CharField(max_length=30)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    category_name = models.CharField(max_length=100)
    producer_id = models.UUIDField()
    farm_name = models.CharField(max_length=150)
    available_quantity = models.DecimalField(max_digits=12, decimal_places=3)
    reserved_quantity = models.DecimalField(max_digits=12, decimal_places=3)
    remaining_quantity = models.DecimalField(max_digits=12, decimal_places=3)
    opens_at = models.DateTimeField()
    closes_at = models.DateTimeField()
    pickup_date = models.DateField()
    sale_session_status = models.CharField(max_length=20)

    class Meta:
        managed = False
        db_table = 'unified_shop_view'

class HarvestSheetView(models.Model):
    id = models.UUIDField(primary_key=True) # Fake PK for Django
    sale_session_id = models.UUIDField()
    pickup_point_id = models.UUIDField()
    producer_id = models.UUIDField()
    farm_name = models.CharField(max_length=150)
    product_id = models.UUIDField()
    product_name = models.CharField(max_length=150)
    unit = models.CharField(max_length=30)
    total_quantity_to_prepare = models.DecimalField(max_digits=12, decimal_places=3)
    order_count = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'harvest_sheet_view'
