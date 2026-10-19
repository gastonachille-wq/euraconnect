# EURACONNECT V3.5 — Startup Manager conseiller, startup décisionnaire

## Ce qui est réellement livré
- Nouvelle migration `supabase/migrations/20261019173000_v35_manager_advice.sql` : avis écrits du SUM liés à une demande, visibles de la startup et du manager affecté, notifications et audit existant.
- Retour arrière `supabase/rollback/20261019173000_v35_manager_advice_rollback.sql` (DESTRUCTIF pour les avis V3.5).
- `src/api.ts` : nouvelle RPC `managerAdviceRpc`.
- `src/manager-v20.ts` : action « Donner un conseil » sur les demandes du portefeuille, et affichage des conseils côté startup.
- `src/app.ts` : formulaire et enregistrement des conseils, lecture sur l'accueil incubé, erreurs si migration absente.
- `public/interface.css` : styles des avis.
- `tests/v35-advisory.test.mjs` : tests statiques d'absence de validation obligatoire, droits et interface.
- `package.json`, `scripts/build.mjs` : version 3.5.0 ; assertions de version ajustées.

## Choix métier
La startup publie, choisit et contractualise seule. Aucun statut « à valider » ou « à co-valider » n'est ajouté. Le SUM peut conseiller et recommander, sans bloquer le parcours.

## Installation
1. Sauvegarder Supabase et tester sur une copie ; installer les migrations historiques 01..09 et la V3.4 si requise.
2. Exécuter `supabase/migrations/20261019173000_v35_manager_advice.sql` dans Supabase SQL Editor sur une base de test.
3. Vérifier les autorisations : SUM affecté crée et lit ; SUM non affecté refusé ; startup propriétaire lit ; autre startup et prestataire refusés ; admin dans son organisation.
4. Déployer le code de cette archive via GitHub/Cloudflare. `npm install && npm run check`.

## Vérifications
- TypeScript et build : réussis.
- Tests Node : 96 réussis / 96.
- Aucun test RLS exécuté contre un Supabase réel ; aucun test navigateur Playwright exécuté pour cette release.
- L'archive est une livraison de code, pas une preuve de déploiement en production.

## Hors périmètre
Fiche « Mon Startup Manager » avec identité/photo/créneaux, fil privé de conseil, cockpit de santé, moteur de compétences, suivi des jalons, statistiques et notifications digest. Ne pas prétendre que ces fonctions sont livrées.
