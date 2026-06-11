<!--
  Guide d'intégration API pour le frontend.
  Explique les endpoints principaux, le format des payloads et comment utiliser le service Angular fourni.
-->

# API Integration Guide

## Accès en développement

| Contexte | URL API |
|----------|---------|
| Frontend dans Docker (proxy `/api`) | Relatif — `http://localhost:4200/api/...` |
| Backend Docker depuis l'hôte (Windows) | `http://localhost:18080/api/...` |
| Backend sans Docker (local) | `npm run start:local` → proxy vers `localhost:18080` |

## Endpoints principaux

### Authentification

- `POST /api/auth/login/` — Auth via `phone` + `password`.
  - Request: `{ "phone": "0343333333", "password": "password123" }`
  - Response: `{ "access", "refresh", "user": { "id", "phone", "full_name", "email", "role" } }`

- `POST /api/auth/register/` — Inscription.
  - Request: `{ "phone", "password", "full_name", "email?", "role": "mpanjifa|tantsaha|mpandrindra" }`
  - Response: même format que login (201)

- `POST /api/auth/token/refresh/` — Renouveler l'access token.
  - Request: `{ "refresh": "<jwt>" }`
  - Response: `{ "access": "<jwt>" }`

### Catalogue

- `GET /api/shop/unified/` — Produits disponibles (session ouverte, sans auth).

### Commandes (JWT requis)

- `GET /api/orders/` — Liste des commandes de l'utilisateur connecté (consommateur).

- `POST /api/orders/` — Créer une commande.
  ```json
  {
    "pickup_point_id": "<uuid>",
    "sale_session_id": "<uuid>",
    "items": [{ "product": "<uuid>", "producer": "<uuid>", "quantity": 1, "unit_price": 3000 }]
  }
  ```

- `POST /api/orders/{id}/payment/` — Soumettre une preuve de paiement.
  - Request: `{ "method": "mvola", "proof_file_path": "/media/proofs/..." }`

### Médias (JWT requis)

- `POST /api/media/proof/` — Upload multipart d'une capture de paiement.
  - Form field: `file`
  - Response: `{ "proof_file_path": "/media/proofs/<uuid>_nom.jpg" }`

### Producteur (JWT requis, rôle producer)

- `GET /api/producers/me/` — Profil producteur connecté (`farm_name`, `location`, `description`, `user`).

- `GET /api/harvest-sheet/` — Feuille de récolte agrégée pour le producteur connecté.

### Points de retrait (public)

- `GET /api/pickup-points/` — Liste des points de retrait (`id`, `name`, `address`, `city`).

### Manager (JWT requis, rôle manager)

- `GET /api/manager/deliveries/` — Commandes à remettre au point de retrait géré.
- `POST /api/orders/{id}/handover/` — Confirmer la remise d'une commande (passe en `picked_up`).

## Service Angular (`ApiService`)

Fichier : `Frontend/tantsaha-frontend/src/app/services/api.service.ts`

| Méthode | Endpoint |
|---------|----------|
| `loginPhone(phone, password)` | POST `/api/auth/login/` |
| `register(payload)` | POST `/api/auth/register/` |
| `refreshToken(refresh)` | POST `/api/auth/token/refresh/` |
| `getShop(params?)` | GET `/api/shop/unified/` |
| `getOrders()` | GET `/api/orders/` |
| `createOrder(payload)` | POST `/api/orders/` |
| `uploadProof(file)` | POST `/api/media/proof/` |
| `uploadPayment(orderId, payload)` | POST `/api/orders/{id}/payment/` |
| `getHarvestSheet()` | GET `/api/harvest-sheet/` |
| `getProducerProfile()` | GET `/api/producers/me/` |
| `getPickupPoints()` | GET `/api/pickup-points/` |
| `getManagerDeliveries()` | GET `/api/manager/deliveries/` |
| `confirmHandover(orderId)` | POST `/api/orders/{id}/handover/` |

### Auth interceptor

L'intercepteur `AuthInterceptor` ajoute `Authorization: Bearer <access_token>` et renouvelle automatiquement le token sur 401 via `/api/auth/token/refresh/`.

### Guards de routes

- `authGuard` — panier, paiement, profil acheteur, succès commande
- `producerGuard` — dashboard et profil producteur (`tantsaha-recolte`, `tantsaha-ferme`)

## Comptes de test (seed_db)

| Rôle | Téléphone | Mot de passe |
|------|-----------|--------------|
| Consommateur | 0343333333 | password123 |
| Producteur | 0342222222 | password123 |
| Manager | 0341111111 | password123 |
| Admin | 0340000000 | password123 |

## Remarques techniques

- Les modèles Django utilisent `managed = False` ; le schéma SQL et les triggers sous `database/schema.sql` font autorité.
- En dev, `CORS_ALLOW_ALL_ORIGINS = True`. Restreindre en production.
