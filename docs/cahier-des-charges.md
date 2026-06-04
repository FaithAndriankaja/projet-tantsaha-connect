# Cahier des charges - Tantsaha Connect

Date: 3 juin 2026

## 1. Presentation du projet et du contexte

### Contexte general

Tantsaha Connect est une marketplace web ephemere en circuit court a Madagascar. Le projet vise a reduire l'ecart entre les petits producteurs ruraux (tantsaha) et les consommateurs urbains, en supprimant les intermediaires physiques et en organisant des precommandes collectives. La logistique est regroupee par point de retrait pour limiter les couts et les invendus.

### Objectifs

- Permettre aux producteurs de vendre directement leurs produits a prix plus justes.
- Donner aux consommateurs urbains un acces transparent aux produits frais.
- Centraliser la logistique via des points de retrait et des sessions de vente.
- Limiter les invendus grace au modele de precommande.

### Cibles

- **Consommateur (Mpanjifa)** : urbain, smartphone ou ordinateur, paiement Mobile Money manuel (MVola, Orange Money, Airtel Money).
- **Producteur (Tantsaha)** : zone rurale, connexion faible, interface legere.
- **Gestionnaire de point de retrait (Mpandrindra)** : supervision et emargement de la distribution.
- **Administrateur** : validation des preuves de paiement et suivi global de la plateforme.

### Analyse marketing

- Proposition de valeur : produits frais a prix juste, achats transparents, paiement Mobile Money, recuperation locale.
- Positionnement : plateforme de precommande locale a impact social, alternative aux circuits traditionnels.
- Segmentation : quartiers urbains avec points relais ; producteurs ruraux organises par zone.
- Canaux d'acquisition : communication communautaire (associations de quartier), reseaux sociaux locaux, relais physiques.
- Messages cles : prix equitables, soutien aux producteurs, reduction des pertes alimentaires.
- Indicateurs a suivre : taux de conversion, repetitivite des commandes, taille moyenne du panier, taux de rupture de stock.

---

## 2. Specifications fonctionnelles

### Besoins metiers

- **Boutique unifiee** par point de retrait et session de vente (vue `unified_shop_view`).
- **Authentification par roles** : `consumer`, `producer`, `manager`, `admin`.
- **Panier multi-producteurs** avec calcul automatique du montant total de la commande.
- **Upload d'une preuve de paiement** Mobile Money (MVola, Orange Money ou Airtel Money).
- **Validation manuelle des paiements** par un administrateur (acceptation ou rejet).
- **Feuille de recolte numerique** pour les producteurs (vue `harvest_sheet_view`).
- **Emargement de remise** par le gestionnaire du point de retrait.

### Parcours utilisateur

**Consommateur :**
1. Inscription et connexion.
2. Consultation de la boutique unifiee pour la session en cours (`status = 'open'`).
3. Ajout au panier (la reservation de stock est effectuee automatiquement par la base de donnees).
4. Validation de la commande (generation automatique d'un `transaction_code` de format `TC-YYYYMMDD-XXXXXXXX`).
5. Upload de la preuve de paiement Mobile Money -> la commande passe a `payment_submitted`.
6. Attente de la validation administrateur.
7. Retrait physique de la commande au point de retrait.

**Producteur :**
1. Connexion.
2. Gestion du catalogue produits et des stocks par session de vente.
3. Consultation de la feuille de recolte (commandes `confirmed`, `ready`, `picked_up`).

**Gestionnaire :**
1. Connexion.
2. Consultation de la liste des commandes confirmees (`status = 'confirmed'` ou `'ready'`).
3. Enregistrement de la remise physique (creation d'un enregistrement dans `handover_confirmations`).
4. La commande passe automatiquement au statut `picked_up` a cette etape.

**Administrateur :**
1. Connexion.
2. Controle des preuves de paiement soumises (`verification_status = 'pending'`).
3. Validation (`verification_status = 'accepted'`) -> la commande passe automatiquement a `confirmed`.
4. Ou rejet (`verification_status = 'rejected'`) -> la commande revient a `pending_payment` pour nouvelle soumission par le consommateur.

### Statuts des commandes

Le cycle de vie d'une commande suit l'ENUM `order_status` :

| Statut | Declencheur |
| --- | --- |
| `pending_payment` | Creation de la commande ou rejet du paiement par l'admin. |
| `payment_submitted` | Upload de la preuve de paiement par le consommateur. |
| `confirmed` | Validation du paiement par l'admin. |
| `ready` | Passage manuel par le gestionnaire (optionnel). |
| `picked_up` | Creation d'un enregistrement dans `handover_confirmations`. |
| `cancelled` | Annulation de la commande (libere le stock automatiquement). |

### Statuts des sessions de vente

| Statut | Signification |
| --- | --- |
| `draft` | Session en cours de preparation, non visible. |
| `open` | Precommandes ouvertes, achat possible. |
| `closed` | Precommandes fermees, achat bloque. |
| `distributed` | Distribution terminee. |
| `cancelled` | Session annulee. |

### Contraintes de gestion

- La cloture d'une session (`status != 'open'`) bloque les achats. Ce controle est effectue cote application.
- La reservation de stock est geree automatiquement par la base de donnees lors de l'ajout d'une ligne de commande.
- L'annulation d'une commande libere automatiquement le stock reserve.
- Une commande ne peut etre remise physiquement qu'une seule fois (`handover_confirmations.order_id` est unique).
- La preuve de paiement est obligatoire avant toute validation par l'admin.
- Un seul enregistrement de paiement est autorise par commande. En cas de rejet, le consommateur met a jour la preuve existante, ce qui reinitialise automatiquement le statut a `pending`.
- Le montant total de la commande (`total_amount`) est calcule automatiquement par la base de donnees a partir des lignes (`order_items`).
- Une ligne de commande lie un produit a son vrai producteur (contrainte d'integrite en base).

---

## 3. Specifications techniques

### Environnement technique

- **Front-end** : Angular.
- **Back-end** : Django + Django REST Framework (DRF).
- **Base de donnees** : PostgreSQL (extension `pgcrypto` requise pour `gen_random_uuid()`).

### Securite

- Authentification par jeton JWT.
- Role-based access control (RBAC) cote API Django.
- Stockage des fichiers de preuve : le chemin est enregistre en base (`proof_file_path`), le fichier est stocke sur disque ou stockage objet.
- Validation du fichier de preuve de paiement obligatoire cote application avant insertion en base.

### Integrations

- Mobile Money : pas d'integration temps reel. Le paiement est confirme par upload manuel d'une preuve.
  - Methodes acceptees : `mvola`, `orange_money`, `airtel_money`.
- Pas d'application mobile native (web uniquement).

### Architecture de la base de donnees

La base de donnees PostgreSQL contient les tables suivantes :
`users`, `pickup_points`, `producers`, `producer_pickup_points`, `categories`, `products`, `sale_sessions`, `product_stocks`, `orders`, `order_items`, `payments`, `handover_confirmations`.

Les automatisations suivantes sont gerees directement en base par des triggers PostgreSQL :
- **`trg_orders_transaction_code`** : generation automatique du `transaction_code` a la creation d'une commande.
- **`trg_order_items_sync_total`** : recalcul automatique de `orders.total_amount` a chaque modification d'une ligne.
- **`trg_order_items_update_stocks`** : mise a jour de `product_stocks.reserved_quantity` a l'ajout ou la suppression d'une ligne de commande.
- **`trg_orders_release_stock_on_cancel`** : liberation automatique du stock reserve lors de l'annulation d'une commande.
- **`trg_payments_update_order_status`** : transition automatique du statut de la commande lors de la soumission ou de la validation/rejet du paiement.
- **`trg_handover_confirmations_mark_picked_up`** : passage automatique de la commande a `picked_up` lors de la confirmation de remise.

Les vues metier disponibles sont :
- **`unified_shop_view`** : boutique unifiee par session et point de retrait.
- **`harvest_sheet_view`** : feuille de recolte par session, point de retrait et producteur.

---

## 4. Specifications graphiques et ergonomiques

### Identite visuelle

- Logo, couleurs et typographie a definir et valider avec l'equipe.

### Maquettes

- Wireframes Figma prevus en phase commune (a fournir).

### Accessibilite

- Interface legere, priorite mobile.
- Pages texte simplifiees pour connexions lentes.
- Langue malgache a prevoir pour les modules producteur.

---

## 5. Calendrier et livrables

### Planning

- **Phase commune** : maquettage, modele de donnees, contrat d'API.
- **Phase specialisee** : Front-end Angular / Back-end Django en parallele.
- **Delai cible** : 2 semaines.

### Livrables attendus

- Code source (Angular + Django).
- Script de base de donnees PostgreSQL (`database/schema.sql`).
- Documentation API (routes, exemples JSON).
- Guide utilisateur (consommateur, producteur, gestionnaire).

---

## 6. Risques et contraintes

- Connectivite faible en milieu rural (impact sur l'interface producteur).
- Cout de transport et instabilite logistique pour les points de retrait.
- Contraintes sur la gestion des flux Mobile Money (pas d'API temps reel disponible).
- Besoin d'interfaces tres simples pour limiter les barrieres numeriques.
- Gestion de la concurrence lors des commandes simultanees (geree par les triggers de stock en base de donnees).
