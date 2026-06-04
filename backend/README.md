# Guide de Démarrage du Backend (API Django)

Ce document est destiné aux développeurs (notamment l'équipe Frontend) pour lancer l'API de **Tantsaha Connect** sur leur machine locale.

L'API est construite avec **Django 4.2**, **Django REST Framework (DRF)**, et utilise **PostgreSQL** pour la base de données (avec des Triggers qui gèrent automatiquement les stocks et les statuts).

Vous avez deux options pour lancer le projet : avec Docker (recommandé et plus simple) ou manuellement.

---

## Option A : Démarrage avec Docker (Recommandé)

C'est la méthode la plus rapide. Elle configure automatiquement la base de données PostgreSQL, exécute le script `schema.sql` contenant les triggers, et lance le serveur Django.

### 1. Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et en cours d'exécution.

### 2. Lancement
Ouvrez un terminal à la **racine du projet** (le dossier qui contient `docker-compose.yml`) et exécutez :

```bash
docker-compose up --build
```

Laissez le terminal ouvert. La base de données et l'API vont démarrer.
L'API sera disponible sur : **http://localhost:8000**

### 3. Commandes utiles (à exécuter dans un autre terminal)

**Créer un compte administrateur (Superuser Django) :**
```bash
docker-compose exec backend python manage.py createsuperuser
```

**Arrêter les serveurs :**
```bash
docker-compose down
```

**Réinitialiser la base de données (si besoin de tout effacer) :**
```bash
docker-compose down -v
```
*(Attention : cela supprime le volume de données PostgreSQL. Au prochain `docker-compose up`, le fichier `schema.sql` sera réexécuté à zéro).*

---

## Option B : Démarrage Manuel (Sans Docker)

Si vous ne pouvez pas utiliser Docker, vous devez installer PostgreSQL et configurer l'environnement Python vous-même.

### 1. Prérequis
- **Python 3.11** ou supérieur.
- **PostgreSQL 15** ou supérieur installé localement.

### 2. Configuration de la base de données PostgreSQL
1. Ouvrez pgAdmin ou l'outil en ligne de commande `psql`.
2. Créez une nouvelle base de données nommée `tantsaha_db`.
3. Ouvrez le fichier `database/schema.sql` fourni dans le projet.
4. Exécutez tout le contenu de ce fichier SQL sur la base de données `tantsaha_db`. *(C'est indispensable car ce fichier crée les tables, les rôles ENUM, les vues et les Triggers !)*

### 3. Configuration de l'environnement Python
Ouvrez un terminal dans le dossier **`backend/`** et suivez ces étapes :

**Créer un environnement virtuel (recommandé) :**
```bash
python -m venv venv
```

**Activer l'environnement virtuel :**
- Sur Windows : `venv\Scripts\activate`
- Sur Mac/Linux : `source venv/bin/activate`

**Installer les dépendances :**
```bash
pip install -r requirements.txt
```

### 4. Variables d'environnement
Créez un fichier `.env` dans le dossier `backend/` (au même niveau que `manage.py`) avec le contenu suivant :
```env
DEBUG=True
SECRET_KEY=django-insecure-tantsaha-connect-dev-key
# Remplacez "postgres" et "motdepasse" par vos vrais identifiants PostgreSQL locaux
DATABASE_URL=postgres://postgres:motdepasse@127.0.0.1:5432/tantsaha_db
ALLOWED_HOSTS=*
```

### 5. Lancement du serveur Django
Toujours dans le dossier `backend/`, avec l'environnement virtuel activé :
```bash
python manage.py runserver
```
L'API sera disponible sur : **http://localhost:8000**

---

## Points d'Accès Principaux (URLs)

Une fois le serveur lancé (via Docker ou manuellement), voici les URLs utiles pour le développement Frontend :

- **Documentation Swagger (UI)** : [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/) 
  *(Affiche tous les endpoints de l'API de manière interactive)*
- **Authentification (Obtenir JWT)** : `POST http://localhost:8000/api/auth/login/`
- **Rafraîchir le token JWT** : `POST http://localhost:8000/api/auth/token/refresh/`
- **Panel d'Administration Django** : [http://localhost:8000/admin/](http://localhost:8000/admin/) 
  *(Nécessite d'avoir créé un superuser)*

## Notes pour le Frontend
- L'authentification utilise des **Bearer Tokens (JWT)**. N'oubliez pas d'ajouter l'en-tête `Authorization: Bearer <votre_token>` dans vos requêtes.
- La base de données contient des **Triggers**. Par exemple, l'ajout d'une preuve de paiement à l'API changera *automatiquement* le statut de la commande en `payment_submitted` sans que le frontend n'ait besoin de faire une requête supplémentaire pour modifier la commande.
