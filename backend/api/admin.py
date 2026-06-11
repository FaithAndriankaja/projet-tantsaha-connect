from django.contrib import admin
from .models import (
    User, PickupPoint, Producer, ProducerPickupPoint, Category,
    Product, SaleSession, ProductStock, Order, OrderItem,
    Payment, HandoverConfirmation
)

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active')
    search_fields = ('full_name', 'phone', 'email')

@admin.register(PickupPoint)
class PickupPointAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'manager_user')
    search_fields = ('name', 'city')

@admin.register(Producer)
class ProducerAdmin(admin.ModelAdmin):
    list_display = ('farm_name', 'user', 'location')
    search_fields = ('farm_name', 'location')

@admin.register(ProducerPickupPoint)
class ProducerPickupPointAdmin(admin.ModelAdmin):
    list_display = ('producer', 'pickup_point', 'created_at')

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'producer', 'category', 'unit_price', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name',)

@admin.register(SaleSession)
class SaleSessionAdmin(admin.ModelAdmin):
    list_display = ('pickup_point', 'pickup_date', 'status', 'opens_at', 'closes_at')
    list_filter = ('status', 'pickup_point')

@admin.register(ProductStock)
class ProductStockAdmin(admin.ModelAdmin):
    list_display = ('product', 'sale_session', 'available_quantity', 'reserved_quantity')
    list_filter = ('sale_session',)

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('transaction_code', 'consumer_user', 'pickup_point', 'status', 'total_amount', 'created_at')
    list_filter = ('status', 'pickup_point', 'sale_session')
    search_fields = ('transaction_code',)
    inlines = [OrderItemInline]

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'method', 'verification_status', 'verified_at')
    list_filter = ('method', 'verification_status')

@admin.register(HandoverConfirmation)
class HandoverConfirmationAdmin(admin.ModelAdmin):
    list_display = ('order', 'manager_user', 'handed_over_at')
