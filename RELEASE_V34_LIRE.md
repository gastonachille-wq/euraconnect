# EURACONNECT V3.4 - Fondations transverses (livraison technique partielle)

## Contenu
- Migration `supabase/migrations/20261019160000_v34_foundations.sql` : table privee de parametres, table privee d'interactions, fonction RPC de portefeuille et consultation, RLS et droits restreints.
- Retour arriere `supabase/rollback/20261019160000_v34_foundations_rollback.sql`.
- Sources front V3.3 conservees, version technique 3.4.0.

## Conflits identifies
- Le role `startup_manager` existe deja.
- Le portefeuille existe dans `public.ec_manager_portefeuille` : reutilise, sans table parallele.
- L'audit existe via `ec1.audit` et `ec1.history` : reutilise, sans table `audit_log` concurrente.
- Les notifications existent dans `ec1.notifications`.

## Installation
1. Sauvegarder Supabase, deployer les migrations historiques 01 a 09 si elles ne sont pas deja appliquees.
2. Verifier l'existence de `ec1.runtime`, `ec1.actor()`, `ec1.supervises(uuid)` et `public.ec_manager_portefeuille`.
3. Executer la migration V3.4 dans Supabase SQL Editor en environnement de test, puis en production apres recette.
4. Mettre a jour GitHub avec les sources du ZIP.
5. Utiliser `npm install && npm run check` pour les tests TypeScript/Node sur votre machine ou CI.

## Important : non termine
La migration n'a PAS ete executee sur une base Supabase reelle, ni testee par role sur une base vierge et une copie des donnees. Les controles Playwright et captures ne sont pas produits. Les actions de validation de demandes, co-validation, checklist et cockpit enrichi ne sont pas encore implementees. Ne pas deployer en production sans recette SQL et controle RLS. Cette archive n'est pas une V3.4 complete.
