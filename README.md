# EURACONNECT — Première livraison technique (socle + parcours fondamentaux)

Application Next.js 15 / React 19 / TypeScript + Supabase Auth/PostgreSQL/RLS/RPC, déploiement Netlify.

**Périmètre réellement codé** : Auth email/password, gestion des rôles, bootstrap admin SQL, validation des prestataires, catalogue, publication de besoins ouverts, candidature spontanée sous alias, quota Free transactionnel, demandes et acceptation de mise en relation, tableau de bord simple.

**Périmètre non livré** : paiements Stripe, moteur de recherche avancé, abonnements payants, offres préférentielles, prise de rendez-vous, événementiel, messagerie, emailing automatique, MFA imposée, protection complète de l'anonymisation, tests E2E.

L'application **ne doit pas être considérée comme prête pour une ouverture commerciale**. Les fonctionnalités sont des flux de recette qui demandent encore vérification sur votre propre instance Supabase.

Voir [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) pour l'installation guidée, ainsi que [docs/RECETTE.md](docs/RECETTE.md) et [docs/HYPOTHESES.md](docs/HYPOTHESES.md).

## Démarrage rapide
```bash
cp .env.example .env.local
npm install
npm run dev
```

## Important
La migration vise une base Supabase vierge. N'exécutez pas ce SQL directement sur une base EURACONNECT existante sans sauvegarde, comparaison du schéma et plan de migration. Le nom des tables correspond à un sous-ensemble du cahier V2, sans prétendre livrer toute la V2.
