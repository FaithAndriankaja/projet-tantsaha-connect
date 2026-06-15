from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from django.db import transaction
from .models import Product
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import (
    UnifiedShopView, Order, OrderItem, Payment, HarvestSheetView, SaleSession,
    PickupPoint, Producer, HandoverConfirmation, Category, ProductStock
)
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
        #  CORRECTION : Afficher uniquement ce qui est OUVERT et mis en avant (is_promoted) par le Tantsaha
        # Note : Assurez-vous que votre vue matérialisée 'UnifiedShopView' expose le champ 'is_promoted'.
        # Sinon, filtrez via la table ProductStock sous-jacente.
        qs = super().get_queryset().filter(sale_session_status='open')
        
        # Optionnel si le champ est dans la vue SQL : qs = qs.filter(is_promoted=True)

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
        
        Payment.objects.create(
            order=order,
            method=serializer.validated_data['method'],
            proof_file_path=serializer.validated_data['proof_file_path']
        )
        return Response({"message": "Preuve envoyée avec succès."}, status=status.HTTP_201_CREATED)

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

class PickupPointViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PickupPoint.objects.all()
    serializer_class = PickupPointSerializer
    permission_classes = [AllowAny]

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
        if self.request.user.role != 'producer':
            return ProductStock.objects.none()

        return ProductStock.objects.filter(
            product__producer__user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'], url_path='toggle-visibility')
    def toggle_visibility(self, request, pk=None):
        try:
            stock = ProductStock.objects.get(
                id=pk,
                product__producer__user=request.user
            )
            stock.is_promoted = not stock.is_promoted
            stock.save()
            return Response({
                'status': 'success',
                'is_promoted': stock.is_promoted
            })
        except ProductStock.DoesNotExist:
            return Response(
                {'detail': 'Stock introuvable ou non autorisé.'},
                status=status.HTTP_404_NOT_FOUND
            )

class ManagerDeliveriesView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'manager':
            return Response({'detail': 'Accès réservé aux managers.'}, status=status.HTTP_403_FORBIDDEN)

        pickup_points = PickupPoint.objects.filter(manager_user=request.user)
        orders = Order.objects.filter(
            pickup_point__in=pickup_points,
            status__in=['ready', 'confirmed'],
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

        sale_session = SaleSession.objects.filter(
            status='open',
            pickup_point__producerpickuppoint__producer=producer
        ).order_by('closes_at').first()

        if not sale_session:
            return Response(
                {'detail': 'Aucune session de vente ouverte trouvée pour vos points de retrait.'},
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

    def get_queryset(self):
        if self.request.user.role != 'manager':
            return SaleSession.objects.none()

        return SaleSession.objects.filter(
            pickup_point__manager_user=self.request.user
        ).order_by('-opens_at')

    def perform_create(self, serializer):
        pickup_point = serializer.validated_data['pickup_point']

        if pickup_point.manager_user_id != self.request.user.id:
            raise serializers.ValidationError({
                'pickup_point': 'Vous ne gérez pas ce point de retrait.'
            })

        serializer.save()