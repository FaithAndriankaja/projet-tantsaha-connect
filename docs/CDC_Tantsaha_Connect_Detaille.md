# TANTSAHA CONNECT
**Marketplace Web Éphémère en Circuit Court**
*CAHIER DES CHARGES TECHNIQUE ET FONCTIONNEL DÉTAILLÉ*

---

## 1. Présentation du Projet

### 1.1 Contexte
À Madagascar, la filière d'approvisionnement des zones urbaines (notamment Antananarivo) en produits frais repose sur une chaîne d'intermédiaires physiques — les collecteurs (mpanangona) — qui captent l'essentiel de la valeur ajoutée au détriment des petits producteurs ruraux (tantsaha). Ces derniers subissent des prix d'achat dérisoires alors que les consommateurs citadins paient des prix élevés sans transparence ni garantie de fraîcheur.
La plateforme **Tantsaha Connect** vise à lever ces barrières en introduisant un modèle de marché web basé sur la précommande collective, sans intermédiaire physique. 

### 1.2 Objectifs du Projet
* Connecter directement producteurs ruraux et consommateurs urbains sur une plateforme web unique.
* Éliminer les pertes post-récolte grâce au modèle de précommande (objectif : 0 % d'invendus).
* Valoriser équitablement le travail agricole.
* Intégrer nativement le Mobile Money (Mvola, Orange Money, Airtel Money).

### 1.3 Périmètre et Limites
**Inclus dans le périmètre (v1.0)**
* Application web responsive (mobile-first).
* Paiement semi-automatique par Mobile Money avec téléversement de capture d'écran.
* Gestion de 4 rôles : Consommateur, Producteur, Gestionnaire de point de retrait, Administrateur.
* Boutique avec compte à rebours de session de vente.
* Feuille de récolte numérique agrégée.
* **Réservation des stocks et transitions de statuts de commandes gérées automatiquement par des Triggers en base de données.**

---

## 2. Profils Utilisateurs (User Personas)

### 2.1 Mpanjifa — Le Consommateur Urbain
* **Objectif :** Commander des produits frais directement auprès des producteurs à un prix juste.
* **Paiement :** Mobile Money exclusivement.
* **Droits système :** Consultation catalogue, gestion panier (réservation automatique), soumission commande, téléversement preuve de paiement.

### 2.2 Tantsaha — Le Producteur Rural
* **Objectif :** Consulter sa feuille de récolte hebdomadaire et gérer son catalogue.
* **Droits système :** Saisie catalogue, consultation feuille de récolte agrégée (basée sur les commandes confirmées).

### 2.3 Mpandrindra — Le Gestionnaire de Point de Retrait
* **Objectif :** Superviser la distribution physique et valider la remise des commandes.
* **Droits système :** Liste numérique d'émargement avec validation unitaire (déclenche le statut `picked_up`).

### 2.4 Administrateur
* **Objectif :** Vérifier les paiements et gérer la plateforme.
* **Droits système :** Validation ou rejet des preuves de paiement (déclenche les changements de statuts des commandes), gestion des sessions.

---

## 3. Spécification des Fonctionnalités (MoSCoW)

### MUST HAVE
* Inscription et authentification sécurisée (JWT) pour les 4 rôles.
* Boutique consommateur dynamique.
* Panier d'achat multi-vendeurs (la base de données gère les verrous et la réservation de stock de manière asynchrone via Triggers).
* Champ de téléversement (upload) d'image pour la preuve de paiement.
* Panneau d'administration Back-End pour valider/rejeter un paiement après contrôle visuel. **La validation modifie automatiquement le statut de la commande.**
* Liste numérique d'émargement pour le gestionnaire.
* Génération d'un ID unique de transaction (`transaction_code`) par Trigger.

---

## 4. Architecture Technique

### 4.1 Vue d'Ensemble
* **Frontend :** Angular 17+ (Standalone Components, TailwindCSS).
* **Backend :** Django 4.x + Django REST Framework (DRF), Python 3.11+.
* **Base de données :** PostgreSQL 15+ avec **logique métier embarquée (Triggers)** pour la cohérence absolue des stocks et des statuts.

### 4.2 Modèle de Données et Entités Principales
* **users** : id, email, password_hash, role (ENUM), created_at.
* **pickup_points** : id, name, address, manager_user_id.
* **producers** : id, user_id, farm_name.
* **products** : id, producer_id, name, price, stock_qty.
* **sale_sessions** : id, pickup_point_id, status (ENUM : `draft`, `open`, `closed`, `distributed`, `cancelled`).
* **orders** : id, consumer_id, session_id, transaction_uid, status (ENUM : `pending_payment`, `payment_submitted`, `confirmed`, `ready`, `picked_up`, `cancelled`).
* **order_items** : id, order_id, product_id, quantity.
* **payments** : id, order_id, proof_image_url, verification_status (`pending`, `accepted`, `rejected`).
* **product_stocks** : Géré automatiquement (quantité disponible vs réservée).

---

## 5. Contrat d'API REST — Principaux Endpoints

* **POST /api/orders/** : Création de la commande. (Le backend insère, la DB génère le code et réserve le stock).
* **POST /api/orders/{id}/payment/** : Upload de la preuve (La DB passe la commande à `payment_submitted`).
* **PUT /api/orders/{id}/payment/validate/** : Validation Admin (La DB passe la commande à `confirmed` ou `pending_payment`).
* **PUT /api/distribution/deliver/{order_id}/** : Émargement Gestionnaire (La DB passe la commande à `picked_up`).

---

## 6. Critères d'Acceptation et Tests

| Cas de test | Critère d'acceptation |
|---|---|
| **Panier & Stock** | L'ajout d'un produit au panier met instantanément à jour la quantité réservée en base de données. Si le stock est insuffisant, l'erreur est renvoyée proprement. |
| **Paiement (Admin)** | Lorsqu'un administrateur valide une preuve, la commande passe automatiquement au statut `confirmed` sans action supplémentaire. Si rejetée, elle repasse à `pending_payment`. |
| **Annulation** | L'annulation d'une commande libère automatiquement le stock réservé. |
| **Feuille de récolte** | Le producteur voit un tableau agrégé des quantités à récolter, calculé dynamiquement sur la base des commandes `confirmed` ou `ready`. |
| **Remise** | Le gestionnaire valide la livraison, la commande passe à `picked_up`. Une double validation est bloquée par la base de données. |

---
*Fin du document*
