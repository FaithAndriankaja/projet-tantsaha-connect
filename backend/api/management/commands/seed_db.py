from django.core.management.base import BaseCommand
from api.models import (
    User, PickupPoint, Producer, Category, Product, SaleSession, ProductStock
)
from django.utils import timezone
from datetime import timedelta
import uuid

class Command(BaseCommand):
    help = 'Génère un jeu de données initial (Seed) pour tester Tantsaha Connect.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Génération des données de test...")

        # 1. Utilisateurs (Mots de passe hashés par défaut pour 'password123' dans django)
        # Mais on utilise managed=False, il faut peut-être utiliser make_password si c'est pour se connecter vraiment,
        # Pour les besoins de test on met une valeur factice
        from django.contrib.auth.hashers import make_password
        pwd = make_password('password123')

        admin, _ = User.objects.get_or_create(
            phone='0340000000',
            defaults={
                'full_name': 'Admin Tantsaha',
                'email': 'admin@tantsaha.mg',
                'password_hash': pwd,
                'role': 'admin'
            }
        )

        manager, _ = User.objects.get_or_create(
            phone='0341111111',
            defaults={
                'full_name': 'Manager Pickup Ankorondrano',
                'password_hash': pwd,
                'role': 'manager'
            }
        )

        producer_user, _ = User.objects.get_or_create(
            phone='0342222222',
            defaults={
                'full_name': 'Jean Agriculteur',
                'password_hash': pwd,
                'role': 'producer'
            }
        )

        consumer, _ = User.objects.get_or_create(
            phone='0343333333',
            defaults={
                'full_name': 'Koto Consommateur',
                'password_hash': pwd,
                'role': 'consumer'
            }
        )

        # 2. Pickup Point
        pickup, _ = PickupPoint.objects.get_or_create(
            name='Point Relais Ankorondrano',
            defaults={
                'address': 'Zone Zital, Ankorondrano',
                'city': 'Antananarivo',
                'manager_user': manager
            }
        )
        consumer.default_pickup_point = pickup
        consumer.save()

        # 3. Producer
        producer, _ = Producer.objects.get_or_create(
            user=producer_user,
            defaults={
                'farm_name': 'Ferme Mahatsara',
                'location': 'Ambatomirahavavy'
            }
        )
        from api.models import ProducerPickupPoint
        # Insertion directe dans la table de liaison (sans 'id')
        ProducerPickupPoint.objects.get_or_create(
            producer=producer,
            pickup_point=pickup
        )

        # 4. Category & Product
        cat, _ = Category.objects.get_or_create(name='Légumes Frais')
        prod1, _ = Product.objects.get_or_create(
            producer=producer,
            name='Tomates bio',
            defaults={
                'category': cat,
                'unit': 'kg',
                'unit_price': 3000.00
            }
        )
        prod2, _ = Product.objects.get_or_create(
            producer=producer,
            name='Carottes',
            defaults={
                'category': cat,
                'unit': 'kg',
                'unit_price': 2000.00
            }
        )

        # 5. Sale Session (Open)
        now = timezone.now()
        session, created = SaleSession.objects.get_or_create(
            pickup_point=pickup,
            status='open',
            defaults={
                'opens_at': now - timedelta(days=1),
                'closes_at': now + timedelta(days=2),
                'pickup_date': (now + timedelta(days=4)).date()
            }
        )

        # 6. Product Stocks
        ProductStock.objects.get_or_create(
            product=prod1,
            sale_session=session,
            defaults={'available_quantity': 100.00, 'reserved_quantity': 0}
        )
        ProductStock.objects.get_or_create(
            product=prod2,
            sale_session=session,
            defaults={'available_quantity': 50.00, 'reserved_quantity': 0}
        )

        self.stdout.write(self.style.SUCCESS('Jeu de données inséré avec succès !'))
        self.stdout.write(self.style.SUCCESS(f'Session ouverte ID: {session.id}'))
        self.stdout.write(self.style.SUCCESS(f'Point relais ID: {pickup.id}'))
        self.stdout.write(self.style.SUCCESS('Utilisez ces IDs pour tester la création de commandes depuis le Frontend.'))
