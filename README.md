# TANTSAHA CONNECT — Projet TWA M1

**Marketplace éphémère en circuit court**
*Application web de mise en relation entre producteurs ruraux et consommateurs urbains, avec paiement intégré et gestion logistique optimisée.*

![Django Logo](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django)
![PostgreSQL Logo](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql)
![Angular Logo](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular)

---

## 1. Présentation du Projet

**Tantsaha Connect** est une plateforme web conçue pour révolutionner la chaîne d'approvisionnement alimentaire entre les zones rurales et urbaines de Madagascar. En éliminant les intermédiaires traditionnels, le projet vise à garantir aux producteurs un revenu plus juste et aux consommateurs des produits frais à meilleur prix.

### 1.1 Contexte

À Madagascar, le circuit court est entravé par des barrières logistiques et informationnelles. Les producteurs touchent des prix bas tandis que les consommateurs paient cher sans visibilité sur l'origine des produits. Cette solution propose un modèle de **précommande collective** pour optimiser les récoltes et réduire les pertes post-récolte.

### 1.2 Objectifs Clés

* **Connectivité directe :** Mettre en relation directe producteurs et consommateurs.
* **Économie circulaire :** Zéro invendu grâce au modèle de précommande.
* **Valorisation agricole :** Prix équitable pour le travail des agriculteurs.
* **Intégration Mobile Money :** Paiement natif avec Mvola, Orange Money et Airtel Money.
* **Logistique optimisée :** Gestion des points de retrait physiques et feuilles de récolte agrégées.

---

## 2. Spécifications Techniques

### 2.1 Architecture

* **Frontend :** [Angular 17+](https://angular.io/) — Single Page Application avec Standalone Components et TailwindCSS.
* **Backend :** [Django 4.2+ / 5.0+](https://www.djangoproject.com/) — API RESTful avec Django REST Framework.
* **Base de données :** [PostgreSQL 15+](https://www.postgresql.org/) — Modèle de données relationnel avec logique métier embarquée (Triggers).
* **Authentification :** JWT (JSON Web Tokens) via `djangorestframework-simplejwt`.

### 2.2 Modèle de Données (Triggers & Contraintes)

La base de données intègre des contraintes et triggers pour garantir la cohérence des données :

| Entité | Rôle | Contraintes / Triggers Notables |
|--------|------|--------------------------------|
| **`orders`** | Commande du consommateur | **Trigger :** Génération automatique de `transaction_code` (format : `TC-YYYYMMDD-XXXXXXXX`). |
| **`order_items`** | Détail des articles | **Triggers :** Synchronisation automatique de `orders.total_amount` ; gestion automatique de `product_stocks.reserved_quantity`. |
| **`payments`** | Preuves de paiement | **Trigger :** Synchronisation automatique de `orders.status` selon le cycle de validation (pending → accepted → confirmed). |
| **`product_stocks`** | Gestion des stocks | **Triggers :** Mise à jour automatique des quantités réservées ; libération du stock en cas d'annulation. |
| **`handover_confirmations`** | Remise physique | **Trigger :** Passage automatique de la commande à `picked_up` ; contrainte d'unicité (`order_id`) pour éviter double remise. |

### 2.3 Triggers PostgreSQL

* **`trg_orders_transaction_code`** : Génère un identifiant unique lors de la création de la commande.
* **`trg_order_items_sync_total`** : Recalcule le montant total de la commande après chaque modification des articles.
* **`trg_order_items_update_stocks`** : Incrémente/décrémente le stock réservé en fonction des insertions/mises à jour/suppressions.
* **`trg_orders_release_stock_on_cancel`** : Libère le stock réservé lorsque la commande est annulée.
* **`trg_payments_update_order_status`** : Gère les transitions de statut de la commande basées sur la validation des paiements.
* **`trg_handover_confirmations_mark_picked_up`** : Marque la commande comme récupérée lors de la confirmation de remise.

---

## 3. Fonctionnalités Principales

### 3.1 Rôles Utilisateurs

1. **Consommateur (`mpanjifa`)** : Navigation dans le catalogue, gestion du panier, soumission de commande avec upload de preuve de paiement.
2. **Producteur (`tantsaha`)** : Gestion du catalogue et consultation de la feuille de récolte agrégée.
3. **Gestionnaire de point de retrait (`mpandrindra`)** : Supervision de la distribution et validation des remises.
4. **Administrateur** : Validation des paiements, gestion des sessions et supervision générale.

### 3.2 Flux de Commande

1. **Création** : Le consommateur ajoute des produits au panier.
2. **Réservation** : Le système réserve automatiquement les stocks disponibles (trigger `trg_order_items_update_stocks`).
3. **Paiement** : Soumission d'une preuve de paiement (image) et passage du statut à `payment_submitted`.
4. **Validation** : L'administrateur valide ou rejette le paiement (triggers `trg_payments_update_order_status`).
5. **Distribution** : Le gestionnaire confirme la remise physique (trigger `trg_handover_confirmations_mark_picked_up`).

---

## 4. Points d'Intégration (API REST)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/orders/` | Création d'une commande. |
| `POST` | `/api/orders/{id}/payment/` | Upload de la preuve de paiement. |
| `PUT` | `/api/orders/{id}/payment/validate/` | Validation du paiement par l'administrateur. |
| `PUT` | `/api/distribution/deliver/{order_id}/` | Confirmation de remise par le gestionnaire. |
| `GET` | `/api/unified-shop/` | Vue unifiée du catalogue pour les consommateurs. |
| `GET` | `/api/harvest-sheet/` | Feuille de récolte agrégée pour les producteurs. |

---

## 5. Installation & Démarrage

### 5.1 Prérequis

* Docker
* Docker Compose

### 5.2 Démarrage

```bash
# Lancer les conteneurs (PostgreSQL, Django, Frontend)
docker-compose up --build
```

### 5.3 Configuration Post-Démarrage

1. **Créer l'administrateur** :

   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

2. **Appliquer les migrations** :

   ```bash
   docker-compose exec backend python manage.py migrate
   ```

3. **Créer un superuser** :

   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

### 5.4 Accès à l'Application

* **Frontend** : <http://localhost:4200>
* **API Backend** : <http://localhost:8000>
* **Documentation Swagger** : <http://localhost:8000/api/docs/>

---

## 6. Développeurs

* **RADAFINIAINA Mamitiana Jedidia**
* *Groupe : Tantsaha Connect*
* *M1 Technologies Web Avancées*

---

## 7. Licence

Ce projet est réalisé dans le cadre du module **Technologies Web Avancées (TWA)** de la filière Informatique à l'Université d'Antananarivo. Tous droits réservés.
