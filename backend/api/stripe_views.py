"""
Vues Django REST Framework pour l'intégration Stripe.
- CreatePaymentIntentView : crée un PaymentIntent Stripe pour une commande donnée.
- StripeWebhookView : reçoit les événements Stripe et met à jour l'order en conséquence.
"""
import stripe
import json
import logging

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Order, Payment, PaymentMethod, OrderStatus

logger = logging.getLogger(__name__)

# Initialise la clé secrète Stripe au chargement du module
stripe.api_key = settings.STRIPE_SECRET_KEY


class CreatePaymentIntentView(views.APIView):
    """
    POST /api/stripe/create-payment-intent/
    Corps : { "order_id": "<uuid>" }
    Retour : { "client_secret": "...", "amount": 5000, "currency": "mga", "public_key": "pk_test_..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response(
                {'error': 'order_id est requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Récupère la commande et vérifie qu'elle appartient à l'utilisateur connecté
        try:
            order = Order.objects.get(id=order_id, consumer_user=request.user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Commande introuvable ou non autorisée.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # La commande doit être en attente de paiement
        if order.status != OrderStatus.PENDING_PAYMENT:
            return Response(
                {'error': f"Impossible de payer une commande en statut '{order.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # MGA est une devise "zero-decimal" : le montant est passé directement en Ariary
        # (pas de multiplication par 100 comme pour EUR/USD)
        amount_mga = int(order.total_amount)
        if amount_mga <= 0:
            return Response(
                {'error': 'Le montant de la commande est invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_mga,
                currency='mga',
                metadata={
                    'order_id': str(order.id),
                    'transaction_code': order.transaction_code or '',
                    'user_id': str(request.user.id),
                },
                description=f"Tantsaha Connect — Commande {order.transaction_code or order.id}",
            )
        except stripe.StripeError as e:
            logger.error("Stripe error creating PaymentIntent: %s", str(e))
            return Response(
                {'error': str(e)},
                status=status.HTTP_502_BAD_GATEWAY
            )

        return Response({
            'client_secret': intent.client_secret,
            'amount': amount_mga,
            'currency': 'mga',
            'public_key': settings.STRIPE_PUBLIC_KEY,
        })


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(views.APIView):
    """
    POST /api/stripe/webhook/
    Reçoit les événements Stripe (payment_intent.succeeded, payment_intent.payment_failed).
    Met à jour l'order en base de données.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Bypass JWT : authentification via signature Stripe

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET

        # Vérification de la signature Stripe (si le secret est configuré)
        if webhook_secret and webhook_secret != 'whsec_PLACEHOLDER_TO_FILL_AFTER_STRIPE_CLI':
            try:
                event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
            except stripe.errors.SignatureVerificationError:
                logger.warning("Stripe webhook: signature invalide.")
                return HttpResponse(status=400)
        else:
            # Mode développement sans webhook secret : parse directement le payload
            try:
                event = stripe.Event.construct_from(
                    json.loads(payload), stripe.api_key
                )
            except Exception as e:
                logger.warning("Stripe webhook: payload invalide. %s", str(e))
                return HttpResponse(status=400)

        # Traitement des événements
        if event.type == 'payment_intent.succeeded':
            self._handle_payment_succeeded(event.data.object)
        elif event.type == 'payment_intent.payment_failed':
            self._handle_payment_failed(event.data.object)

        return HttpResponse(status=200)

    def _handle_payment_succeeded(self, payment_intent):
        """Met à jour l'order et crée un enregistrement Payment après succès Stripe."""
        order_id = payment_intent.metadata.get('order_id')
        if not order_id:
            logger.warning("Stripe webhook: payment_intent sans order_id dans metadata.")
            return

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            logger.error("Stripe webhook: order %s introuvable.", order_id)
            return

        # Évite la double création si le webhook est reçu plusieurs fois
        if Payment.objects.filter(order=order).exists():
            logger.info("Stripe webhook: paiement déjà enregistré pour order %s.", order_id)
            return

        # Enregistre le paiement et met à jour le statut de la commande
        Payment.objects.create(
            order=order,
            method=PaymentMethod.STRIPE,
            proof_file_path=f"stripe:{payment_intent.id}",  # Référence Stripe comme preuve
            verification_status='accepted',  # Stripe confirme = accepté automatiquement
        )

        order.status = OrderStatus.PAYMENT_SUBMITTED
        order.save(update_fields=['status', 'updated_at'])
        logger.info("Stripe webhook: order %s passé en payment_submitted.", order_id)

    def _handle_payment_failed(self, payment_intent):
        """Log l'échec de paiement (sans modifier le statut de l'order)."""
        order_id = payment_intent.metadata.get('order_id', 'N/A')
        logger.warning("Stripe webhook: paiement échoué pour order %s.", order_id)
