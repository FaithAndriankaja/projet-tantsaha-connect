<!--
  Documentation développeur : setup local et docker, commandes utiles.
  Ce fichier doit contenir des instructions claires et reproductibles
  pour un développeur qui rejoint le projet.
-->

# Developer Setup — Tantsaha Connect

## Objectif
Fournir des instructions pas-à-pas pour démarrer le projet en local (avec ou sans Docker), initialiser la base de données de test et lancer le frontend en mode développement.

## Prérequis
- Docker & Docker Compose
- Node 18+ / npm
- Python 3.10+

## Démarrage rapide avec Docker (recommandé pour dev)

1. Construire et démarrer tous les services : PostgreSQL, backend, frontend (dev):

```bash
docker compose up --build
```

2. Vérifier les services :

 - Backend: http://localhost:18080
 - Frontend: http://localhost:4200
 - Swagger: http://localhost:18080/api/docs/

3. Exécuter la commande de seed (si nécessaire) :

```bash
docker compose exec backend python manage.py seed_db
```

## Démarrage sans Docker (développement)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
# ATTENTION: n'exécutez migrate que si votre schema PostgreSQL local est compatible
python manage.py migrate
python manage.py seed_db
python manage.py runserver 0.0.0.0:8000
```

### Frontend

```bash
cd Frontend/tantsaha-frontend
npm install
npm start -- --proxy-config proxy.conf.json
```

Le `proxy.conf.json` redirige les appels `/api` vers `http://backend:8000` (utile si vous exécutez backend dans Docker).

## Variables d'environnement importantes

- `DATABASE_URL` : chaîne de connexion PostgreSQL (ex: `postgres://user:pass@db:5432/dbname`).
- `SECRET_KEY` : clé Django.
- `DEBUG` : 1/0.
- `API_BASE_URL` (frontend) : URL de l'API (en container `http://backend:8000/api/`).

## Notes de sécurité pour les devs

- `CORS_ALLOW_ALL_ORIGINS` est activé en dev. En production, restreindre aux origines frontend.
- Les mots de passe doivent être hachés avec Django (`make_password`) ; `seed_db` gère cela.
