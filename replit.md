# Banque Or — Plateforme Financière

Plateforme financière en ligne professionnelle avec inscription, portefeuille 5 000 FCFA, consentement cookies, tracking analytics et dashboard PDG secret (7 clics sur le logo).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API Express (port 8080)
- `pnpm --filter @workspace/site-principal run dev` — Frontend React/Vite
- `pnpm run typecheck` — typecheck complet
- `pnpm --filter @workspace/api-spec run codegen` — régénérer les hooks API depuis OpenAPI
- `pnpm --filter @workspace/db run push` — pousser le schéma DB
- Requis: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + Wouter (routing)
- API: Express 5 + pino logging
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcryptjs
- Validation: Zod (v4), drizzle-zod
- API codegen: Orval (OpenAPI → React Query hooks + Zod schemas)

## Where things live

- `lib/api-spec/openapi.yaml` — contrat API (source de vérité)
- `lib/db/src/schema/users.ts` — tables users, wallets, visits
- `artifacts/api-server/src/routes/` — routes Express (auth, user, analytics, admin)
- `artifacts/site-principal/src/` — frontend React
  - `pages/` — Home, Inscription, Connexion, Dashboard, Admin
  - `components/` — CookieBanner, Navbar, etc.

## Architecture decisions

- JWT stocké en localStorage ("authToken"), user dans "currentUser"
- Admin dashboard accessible via 7 clics rapides (<3s) sur le logo dans la navbar → navigation vers /admin
- Tracking analytics silencieux: chaque changement de page appelle POST /api/analytics/track (IP capturée côté serveur via x-forwarded-for)
- Portefeuille initialisé à 5 000 FCFA à la création du compte (table wallets)
- Auth admin côté backend: header x-admin-key ou token JWT valide

## Product

- **Accueil** : page institutionnelle blanche/jaune, 4-6 sections, CTA inscription
- **Inscription** : nom, prénom, email, indicatif + téléphone, pays, mot de passe
- **Connexion** : email + mot de passe
- **Dashboard utilisateur** : portefeuille 5 000 FCFA mis en valeur, profil
- **Dashboard PDG** (secret 7 clics logo) : stats globales, liste utilisateurs, visites trackées

## User preferences

_Populate as you build_

## Gotchas

- Ne pas changer `info.title` dans openapi.yaml (contrôle les noms de fichiers générés)
- Après modif de `lib/*`, relancer `pnpm run typecheck:libs` avant les leaf checks
- Le cookie consent bloque la navigation jusqu'à acceptation
- Le tracking IP se fait côté serveur (x-forwarded-for → req.socket.remoteAddress)
