# Smart Study Assistant

Plateforme web pour étudiants : gestion des cours (avec import de PDF), assistant IA qui travaille à partir de vos documents
(questions, résumés, fiches de révision, explications), quiz générés et corrigés automatiquement, tâches avec échéances,
statistiques en graphiques.

| Couche | Technologies |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, Recharts, React Router |
| Backend | Node.js, Express, TypeScript, Zod, JWT en cookie httpOnly, bcrypt, multer, pdfjs-dist |
| Base de données | PostgreSQL 16 (schéma créé automatiquement au démarrage) |
| IA | API de modèle de langage appelée **uniquement depuis le backend** |

## Prérequis
Node.js 20+, Docker (ou un PostgreSQL 13+), une clé d'API Anthropic.

## Installation et lancement

```bash
# 1. Base de données
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env     # renseigner JWT_SECRET et ANTHROPIC_API_KEY
npm install
npm run dev              # http://localhost:4000

# 3. Frontend (autre terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Ouvrez http://localhost:5173, créez un compte, ajoutez un cours, importez un PDF **contenant du texte**, puis utilisez l'IA.
Sans `ANTHROPIC_API_KEY`, tout fonctionne sauf les appels IA, qui renvoient un message clair (503).
Le frontend appelle `/api/*`, redirigé vers le backend par le proxy Vite : aucune clé n'est envoyée au navigateur.

## Tests
```bash
cd backend  && npm test          # 28 tests : extraction PDF réelle, quiz (validation, mélange, correction), validation, routes protégées
cd frontend && npm test          # dates d'échéance, tailles de fichiers
cd frontend && npm run build     # vérification TypeScript + build de production
```

## Base de données

```
users 1─┬─* courses 1─┬─* documents        (fichier BYTEA + texte extrait)
        │             ├─* study_notes      (résumés, fiches, explications)
        │             ├─* quizzes 1─* questions     quizzes 1─* quiz_results
        │             ├─* tasks            (course_id facultatif, SET NULL à la suppression)
        │             └─* conversations 1─* messages  (course_id facultatif)
        └─ toutes les tables portent user_id : chaque requête filtre dessus
```
Contraintes : clés étrangères avec `ON DELETE CASCADE`, `CHECK` sur les statuts, priorités, difficultés, rôles, `correct_index` (0 à 3)
et `score <= total`, unicité `(quiz_id, position)`, e-mail unique.

## API (préfixe /api ; tout est protégé sauf `auth/register`, `auth/login`, `health`)
- Auth : `POST /auth/register|login|logout|password`, `GET|PATCH /auth/me`
- Cours : `GET|POST /courses`, `GET|PATCH|DELETE /courses/:id`
- Documents : `POST /courses/:id/documents` (multipart, champ `file`), `GET /documents/:id/file`, `DELETE /documents/:id`
- Notes : `DELETE /notes/:id`
- IA : `POST /ai/summary|sheet|explain|chat`
- Quiz : `GET /quizzes`, `POST /quizzes/generate`, `GET /quizzes/:id`, `POST /quizzes/:id/submit`, `GET /quizzes/results`, `DELETE /quizzes/:id`
- Tâches : `GET|POST /tasks`, `GET /tasks/upcoming`, `PATCH|DELETE /tasks/:id`
- Autres : `GET /conversations`, `GET|DELETE /conversations/:id`, `GET /stats`

## Choix de conception et sécurité
- **Les bonnes réponses d'un quiz ne sont jamais envoyées avant la soumission** ; la correction est faite côté serveur. Les options sont mélangées côté serveur.
- Fichiers : type détecté par signature (`%PDF-`), refus des binaires déguisés, 10 Mo maximum, noms nettoyés, texte servi en `text/plain`.
- Le contenu des documents est transmis au modèle comme **données** (balises `<documents>`), avec consigne de ne pas suivre d'instructions qui s'y trouveraient. Cela réduit le risque d'injection sans l'éliminer.
- Mots de passe hachés (bcrypt, coût 12), cookie `httpOnly` + `SameSite=Lax` (+ `Secure` en production), validation Zod partout, SQL paramétré,
  Helmet, CORS restreint, limitation de débit (globale, authentification, IA).
- Contexte IA limité à ~60 000 caractères par requête : au-delà, le texte est tronqué.

## Limites connues
- Les PDF **scannés** (images) n'ont pas de texte extractible : ils sont stockés mais inutilisables par l'IA (un avertissement s'affiche).
- Les migrations sont un simple `CREATE TABLE IF NOT EXISTS` ; prévoir un outil de migration pour faire évoluer le schéma en production.
- Le bundle frontend dépasse 500 Ko (Recharts) ; du code-splitting par route serait une amélioration.

## Production
`NODE_ENV=production`, `JWT_SECRET` long et aléatoire, `CLIENT_ORIGIN`, HTTPS, frontend (`npm run build`) et API sous le même domaine (reverse proxy pour `/api`).
