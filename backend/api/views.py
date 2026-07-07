from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from django.db import transaction
from django.db.models import Exists, OuterRef
from .models import Product
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import (
    UnifiedShopView, Order, OrderItem, Payment, HarvestSheetView, SaleSession,
    PickupPoint, Producer, HandoverConfirmation, Category, ProductStock
)
from .permissions import IsManager
from .serializers import (
    UnifiedShopSerializer, OrderCreateSerializer, OrderResponseSerializer,
    PaymentUploadSerializer, PaymentValidateSerializer, HarvestSheetSerializer,
    PickupPointSerializer, ProducerProfileSerializer, ManagerDeliverySerializer,
    CategorySerializer,ProductStockSerializer,ProducerHarvestCreateSerializer,SaleSessionSerializer,
)

class ShopViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UnifiedShopView.objects.all()
    serializer_class = UnifiedShopSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset().filter(sale_session_status='open')

        promoted_stocks = ProductStock.objects.filter(
            product_id=OuterRef('product_id'),
            sale_session_id=OuterRef('sale_session_id'),
            approval_status='published',
            is_promoted=True,
        )
        qs = qs.filter(Exists(promoted_stocks))

        pickup_point = self.request.query_params.get('pickup_point_id')
        if pickup_point:
            qs = qs.filter(pickup_point_id=pickup_point)
            
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(product_name__icontains=search)
            
        category_name = self.request.query_params.get('category_name')
        if category_name:
            qs = qs.filter(category_name__iexact=category_name)
            
        max_price = self.request.query_params.get('max_price')
        if max_price:
            try:
                qs = qs.filter(unit_price__lte=float(max_price))
            except ValueError:
                pass
        return qs

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        return OrderResponseSerializer

    def get_queryset(self):
        qs = Order.objects.select_related('pickup_point').prefetch_related('items__product')
        if self.request.user.role == 'consumer':
            return qs.filter(consumer_user=self.request.user)
        return qs

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
        )

        # 2. Insérer les items (déclenche vos triggers PostgreSQL de stock et de total)
        for item_data in data['items']:
            OrderItem.objects.create(
                order=order,
                product=item_data['product'],
                producer=item_data['producer'],
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price']
            )

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
        
        method = serializer.validated_data['method']
        Payment.objects.create(
            order=order,
            method=method,
            proof_file_path=serializer.validated_data['proof_file_path']
        )
        
        # Automatisation Stripe : passe directement à confirmé (sans validation manuelle du manager)
        if method == 'stripe':
            order.status = 'confirmed'
        else:
            order.status = 'payment_submitted'
            
        order.save(update_fields=['status', 'updated_at'])
        return Response({"message": "Preuve envoyée avec succès.", "status": order.status}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='handover')
    def confirm_handover(self, request, pk=None):
        order = self.get_object()
        if request.user.role != 'manager':
            return Response({'detail': 'Accès réservé aux managers.'}, status=status.HTTP_403_FORBIDDEN)

        managed = PickupPoint.objects.filter(id=order.pickup_point_id, manager_user=request.user).exists()
        if not managed:
            return Response({'detail': 'Commande hors de votre point de retrait.'}, status=status.HTTP_403_FORBIDDEN)

        if order.status not in ('ready', 'confirmed'):
            return Response({'detail': 'Statut incompatible pour la remise.'}, status=status.HTTP_400_BAD_REQUEST)

        if HandoverConfirmation.objects.filter(order=order).exists():
            return Response({'detail': 'Commande déjà remise.'}, status=status.HTTP_400_BAD_REQUEST)

        HandoverConfirmation.objects.create(order=order, manager_user=request.user)
        order.refresh_from_db()
        return Response({'status': order.status, 'transaction_code': order.transaction_code})

    @action(detail=True, methods=['post'], url_path='validate-payment')
    def validate_payment_by_manager(self, request, pk=None):
        """Le manager valide la preuve de paiement → commande passe à 'confirmed'."""
        if request.user.role != 'manager':
            return Response({'detail': 'Accès réservé aux managers.'}, status=status.HTTP_403_FORBIDDEN)

        order = self.get_object()

        if order.status != 'payment_submitted':
            return Response(
                {'detail': f'Statut incompatible pour la validation ({order.status}). La commande doit être en attente de validation paiement.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'confirmed'
        order.save(update_fields=['status', 'updated_at'])

        # Mettre à jour le paiement associé si présent
        try:
            payment = order.payment
            payment.verification_status = 'accepted'
            payment.verified_by_user = request.user
            from django.utils import timezone
            payment.verified_at = timezone.now()
            payment.save(update_fields=['verification_status', 'verified_by_user', 'verified_at'])
        except Exception:
            pass

        return Response({
            'status': order.status,
            'transaction_code': order.transaction_code,
            'message': 'Paiement validé. Commande confirmée.'
        })

    @action(detail=True, methods=['post'], url_path='start-delivery')
    def start_delivery(self, request, pk=None):
        if request.user.role != 'manager':
            return Response({'detail': 'Accès refusé.'}, status=403)
        order = self.get_object()
        if order.status != 'confirmed':
            return Response({'detail': 'La commande doit être payée (confirmée).'}, status=400)
        order.status = 'delivering'
        order.save()
        return Response({'status': order.status})

    @action(detail=True, methods=['post'], url_path='validate-reception')
    def validate_reception(self, request, pk=None):
        if request.user.role != 'consumer':
            return Response({'detail': 'Accès refusé.'}, status=403)
        order = self.get_object()
        if order.status not in ['confirmed', 'delivering']:
            return Response({'detail': 'Statut invalide.'}, status=400)
        order.reception_validated_by_consumer = True
        if order.transfer_validated_by_manager:
            order.status = 'closed'
        order.save()
        return Response({'status': order.status})

    @action(detail=True, methods=['post'], url_path='validate-transfer')
    def validate_transfer(self, request, pk=None):
        if request.user.role != 'manager':
            return Response({'detail': 'Accès refusé.'}, status=403)
        order = self.get_object()
        order.transfer_validated_by_manager = True
        if order.reception_validated_by_consumer:
            order.status = 'closed'
        order.save()
        return Response({'status': order.status})

class PickupPointViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PickupPointSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated:
            if user.role == 'manager':
                return PickupPoint.objects.filter(manager_user=user)
            if user.role == 'producer':
                try:
                    producer = user.producer
                    return PickupPoint.objects.filter(
                        producerpickuppoint__producer=producer
                    ).distinct()
                except Exception:
                    return PickupPoint.objects.none()
        return PickupPoint.objects.all()

class ProducerMeView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'producer':
            return Response({'detail': 'Accès réservé aux producteurs.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            producer = request.user.producer
        except Exception:
            return Response({'detail': 'Profil producteur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProducerProfileSerializer(producer).data)

#  AJOUT STRATÉGIQUE : La feuille de récolte pour le Dashboard du Tantsaha Angular
class HarvestSheetViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = HarvestSheetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != 'producer':
            return HarvestSheetView.objects.none()
        # Filtre les lignes de récolte de la vue SQL pour le producteur connecté uniquement
        return HarvestSheetView.objects.filter(producer_id=self.request.user.id)

#  AJOUT STRATÉGIQUE : Intercepter l'action de l'interrupteur (Toggle visibility) d'Angular
class ProductStockViewSet(viewsets.ModelViewSet):
    serializer_class = ProductStockSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ProductStock.objects.select_related(
            'product',
            'product__producer',
            'sale_session',
            'sale_session__pickup_point',
        )
        if self.request.user.role == 'manager':
            return qs.filter(sale_session__pickup_point__manager_user=self.request.user)
        if self.request.user.role != 'producer':
            return qs.none()

        return qs.filter(product__producer__user=self.request.user)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        if request.user.role != 'manager':
            return Response({'detail': 'Accès interdit'}, status=403)
        try:
            stock = self.get_object()
            stock.approval_status = 'published'
            stock.is_promoted = True
            stock.save(update_fields=['approval_status', 'is_promoted', 'updated_at'])
            return Response({
                'status': 'Approved',
                'approval_status': 'published',
                'is_promoted': True,
            })
        except Exception as e:
            return Response({'detail': str(e)}, status=400)

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'], url_path='toggle-visibility')
    def toggle_visibility(self, request, pk=None):
        if request.user.role != 'manager':
            return Response({'detail': 'Seul le Mpandrindra peut mettre un produit en vitrine.'}, status=403)

        try:
            stock = self.get_object()
            if stock.approval_status != 'published':
                return Response(
                    {'detail': 'Le produit doit d\'abord être approuvé avant d\'être mis en vitrine.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            stock.is_promoted = not stock.is_promoted
            stock.save(update_fields=['is_promoted', 'updated_at'])
            return Response({
                'status': 'success',
                'is_promoted': stock.is_promoted,
            })
        except ProductStock.DoesNotExist:
            return Response(
                {'detail': 'Stock introuvable ou non autorisé.'},
                status=status.HTTP_404_NOT_FOUND,
            )

class ManagerDeliveriesView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'manager':
            return Response({'detail': 'Accès réservé aux managers.'}, status=status.HTTP_403_FORBIDDEN)

        pickup_points = PickupPoint.objects.filter(manager_user=request.user)
        orders = Order.objects.filter(
            pickup_point__in=pickup_points,
            status__in=['payment_submitted', 'ready', 'confirmed', 'delivering', 'picked_up', 'closed'],
        ).select_related('consumer_user').prefetch_related('items__product')

        data = []
        for order in orders:
            items = [
                {
                    'product_name': item.product.name,
                    'quantity': item.quantity,
                    'unit': item.product.unit,
                }
                for item in order.items.all()
            ]
            data.append({
                'id': order.id,
                'transaction_code': order.transaction_code,
                'status': order.status,
                'total_amount': str(order.total_amount),
                'consumer_name': order.consumer_user.full_name,
                'consumer_phone': order.consumer_user.phone,
                'items': items,
            })

        serializer = ManagerDeliverySerializer(data, many=True)
        return Response(serializer.data)

class AdminPaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentValidateSerializer
    permission_classes = [IsAuthenticated]

    #  CORRECTION : Fin de la méthode tronquée et enregistrement de validation
    @action(detail=True, methods=['put'], url_path='validate')
    def validate_payment(self, request, pk=None):
        payment = self.get_object()
        serializer = self.get_serializer(payment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Enregistre la validation et l'admin qui a validé
        serializer.save(verified_by=request.user)
        return Response({"status": "Payment verified successfully.", "data": serializer.data})


class ProducerHarvestCreateView(views.APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        if request.user.role != 'producer':
            return Response(
                {'detail': 'Accès réservé aux producteurs.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ProducerHarvestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            producer = request.user.producer
        except Exception:
            return Response(
                {'detail': 'Profil producteur introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        sale_session_id = data.get('sale_session_id')
        sale_session = SaleSession.objects.filter(
            id=sale_session_id,
            status='open'
        ).first()

        if not sale_session:
            return Response(
                {'detail': 'Session de vente invalide ou déjà clôturée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_path = ''
        image = request.FILES.get('image')

        if image:
           

            saved_path = default_storage.save(f'products/{image.name}', image)
            image_path = settings.MEDIA_URL + saved_path

        product = Product.objects.create(
            producer=producer,
            category_id=data['category_id'],
            name=data['name'],
            description=data.get('description', ''),
            unit=data['unit'],
            unit_price=data['unit_price'],
            image_path=image_path,
            is_active=True,
        )

        stock = ProductStock.objects.create(
            product=product,
            sale_session=sale_session,
            available_quantity=data['quantity'],
            approval_status='pending',
            is_promoted=False,
        )

        return Response(
            {
                'id': str(product.id),
                'stock_id': str(stock.id),
                'name': product.name,
                'image_path': product.image_path,
                'sale_session': str(sale_session.id),
                'available_quantity': str(stock.available_quantity),
            },
            status=status.HTTP_201_CREATED
        )

class SaleSessionViewSet(viewsets.ModelViewSet):
    serializer_class = SaleSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsManager()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'manager':
            return SaleSession.objects.filter(
                pickup_point__manager_user=user
            ).order_by('-opens_at')
        elif user.role == 'producer':
            # Les producteurs peuvent voir toutes les sessions ouvertes (MVP)
            return SaleSession.objects.filter(
                status='open'
            ).order_by('closes_at')
        
        return SaleSession.objects.none()

    def perform_create(self, serializer):
        pickup_point = serializer.validated_data['pickup_point']
        user = self.request.user

        if not PickupPoint.objects.filter(id=pickup_point.id, manager_user=user).exists():
            raise serializers.ValidationError({
                'pickup_point': 'Vous ne gérez pas ce point de retrait.'
            })

        serializer.save()

    def perform_update(self, serializer):
        pickup_point = serializer.validated_data.get('pickup_point', serializer.instance.pickup_point)
        user = self.request.user

        if not PickupPoint.objects.filter(id=pickup_point.id, manager_user=user).exists():
            raise serializers.ValidationError({
                'pickup_point': 'Vous ne gérez pas ce point de retrait.'
            })

        serializer.save()