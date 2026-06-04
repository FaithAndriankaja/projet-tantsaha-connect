# Contrat d'API - Tantsaha Connect

Ce document est la Source de Vérité pour la communication entre le Frontend Angular et le Backend Django.

## 1. Règles Générales

- **Format des données** : Tous les corps de requête et de réponse sont en `application/json`.
- **Authentification** : Token JWT à inclure dans les headers : `Authorization: Bearer <access_token>`.
- **Identifiants** : Tous les IDs (`id`) sont au format UUIDv4, sauf mention contraire.
- **Dates** : Format ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`).
- **Montants** : Les montants (`total_amount`, `unit_price`) sont des nombres décimaux ou entiers. Le calcul backend fait autorité.

## 2. Format Standard des Erreurs

Toutes les erreurs renvoyées par l'API (400, 401, 403, 404, 500) suivent ce format :

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Erreur de validation des données.",
  "details": {
    "quantity": ["La quantité doit être supérieure à 0."],
    "product_id": ["Ce produit n'existe pas."]
  }
}
```

### Codes d'erreurs fréquents :
- `VALIDATION_ERROR` : Données invalides (HTTP 400).
- `AUTHENTICATION_FAILED` : Token manquant ou expiré (HTTP 401).
- `PERMISSION_DENIED` : Rôle insuffisant pour cette action (HTTP 403).
- `NOT_FOUND` : Ressource introuvable (HTTP 404).
- `SESSION_CLOSED` : Action impossible car la session de vente est fermée (HTTP 403/400).

---

## 3. Endpoints Critiques

### 3.1 Authentification (`/api/auth/`)

#### POST `/api/auth/login/`
Obtenir les tokens JWT.
- **Auth Requise** : Non
- **Requête** :
  ```json
  {
    "phone": "0341234567",
    "password": "password123"
  }
  ```
- **Réponse Succès (200 OK)** :
  ```json
  {
    "access": "eyJ0eX...",
    "refresh": "eyJ0eX...",
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "full_name": "Jean Dupont",
      "role": "consumer"
    }
  }
  ```

---

### 3.2 Catalogue Unifié (`/api/shop/`)

#### GET `/api/shop/unified/?pickup_point_id=<uuid>`
Lister les produits disponibles pour une session ouverte.
- **Auth Requise** : Non (ou Consumer)
- **Règles métier** :
  - Ne retourne que les produits de la vue `unified_shop_view` où `sale_session_status = 'open'`.
  - La quantité affichée est `remaining_quantity`.
- **Réponse Succès (200 OK)** :
  ```json
  [
    {
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "product_name": "Tomates",
      "unit": "kg",
      "unit_price": 2500.00,
      "remaining_quantity": 45.5,
      "producer_id": "...",
      "farm_name": "Ferme Kely",
      "sale_session_id": "..."
    }
  ]
  ```

---

### 3.3 Commandes (`/api/orders/`)

#### POST `/api/orders/`
Créer une nouvelle commande (et réserver le stock).
- **Auth Requise** : Oui (`consumer`)
- **Règles métier** :
  - L'ID de la commande est généré en base.
  - La base de données gère la réservation de stock automatiquement. Si le stock est insuffisant, l'API renvoie un `VALIDATION_ERROR`.
  - La session DOIT être ouverte.
- **Requête** :
  ```json
  {
    "pickup_point_id": "123e4567-...",
    "sale_session_id": "123e4567-...",
    "items": [
      {
        "product_id": "...",
        "producer_id": "...",
        "quantity": 2.5,
        "unit_price": 2500.00
      }
    ]
  }
  ```
- **Réponse Succès (201 Created)** :
  ```json
  {
    "id": "abc12345-...",
    "transaction_code": "TC-20260604-ABCDEF12",
    "status": "pending_payment",
    "total_amount": 6250.00
  }
  ```

---

### 3.4 Preuve de Paiement (`/api/orders/{id}/payment/`)

#### POST `/api/orders/{id}/payment/`
Uploader la preuve Mobile Money.
- **Auth Requise** : Oui (`consumer` propriétaire de la commande)
- **Règles métier** :
  - `method` doit être parmi `mvola`, `orange_money`, `airtel_money`.
  - Ce POST déclenche automatiquement le passage de la commande au statut `payment_submitted`.
- **Requête (multipart/form-data)** :
  - `method`: "mvola"
  - `proof_file`: (Fichier image)
- **Réponse Succès (201 Created)** :
  ```json
  {
    "id": "...",
    "order_id": "abc12345-...",
    "method": "mvola",
    "verification_status": "pending"
  }
  ```

---

### 3.5 Validation Admin (`/api/admin/payments/{id}/validate/`)

#### PUT `/api/admin/payments/{id}/validate/`
Validation de la preuve par l'administrateur.
- **Auth Requise** : Oui (`admin`)
- **Règles métier** :
  - Mettre à jour le `verification_status` à `accepted` ou `rejected`.
  - Ce changement de statut met automatiquement à jour le statut de la commande en `confirmed` ou `pending_payment` via les Triggers de la DB.
- **Requête** :
  ```json
  {
    "verification_status": "accepted"
  }
  ```
- **Réponse Succès (200 OK)** :
  ```json
  {
    "verification_status": "accepted",
    "order_status_updated_to": "confirmed" 
  }
  ```

---

### 3.6 Feuille de Récolte (`/api/harvest-sheet/`)

#### GET `/api/harvest-sheet/?sale_session_id=<uuid>`
- **Auth Requise** : Oui (`producer`)
- **Règles métier** :
  - Uniquement les données appartenant au `producer` authentifié.
  - Basé sur la vue `harvest_sheet_view` (cumul des commandes confirmées).
- **Réponse Succès (200 OK)** :
  ```json
  [
    {
      "product_id": "...",
      "product_name": "Tomates",
      "unit": "kg",
      "total_quantity_to_prepare": 12.5,
      "order_count": 5
    }
  ]
  ```
