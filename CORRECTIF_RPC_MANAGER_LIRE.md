# EURACONNECT 3.6.1 - Correctif de diagnostic du module Startup Manager

## Constats sur les sources fournies

Dans `src/app.ts`, le traitement `catch` du RPC `ec20_manager_api` affichait toujours
« migration 07 ... nécessaire », quelle que soit l'erreur (HTTP 401/403, réseau,
PostgREST, PostgreSQL). Il était donc **impossible de conclure** que la migration
était absente uniquement à partir du message affiché.

Le tableau de bord incubé masquait également les erreurs V2 et V3.5 sous un conseil
de migration générique, et les conseils V3.5 n'étaient pas sollicités si le RPC V2
échouait.

## Changements

- Affichage des erreurs catégorisées (RPC introuvable, table absente, session,
  autorisation, réseau, autre erreur), avec code HTTP/PostgREST et message technique
  affichables sans interprétation abusive.
- Chargement indépendant des recommandations V2 et des conseils V3.5.
- Correction du message générique `PGRST202` qui affirmait à tort « V1 manquante ».
- Ajout de `supabase/10_DIAGNOSTIC_MANAGER_RPC.sql` : lecture des objets et des droits
  et rafraîchissement du cache de schéma. **Aucune modification de table ou de donnée.**
- Tests de non-régression.

## Procédure

1. Dans le navigateur sur EURACONNECT : menu développeur, exécuter
   `window.EC_CONFIG?.supabaseUrl` (ne jamais copier la clé `supabaseKey`).
   Comparer le domaine au Project URL de **Supabase > Settings > API**.
2. Dans le SQL Editor de ce projet, exécuter `supabase/10_DIAGNOSTIC_MANAGER_RPC.sql`
   et conserver la ligne de résultat (les booléens et la conclusion).
3. Si la table ou la fonction V20 manque, vérifier pourquoi le script 07 n'a pas été
   appliqué complètement à **ce projet**, puis relancer 07 après sauvegarde et correction
   de tout message d'erreur SQL. Si la fonction est présente et `EXECUTE` est vrai,
   ne pas réexécuter 07 à l'aveugle : récupérer le nouveau diagnostic affiché.
4. Pousser cette version à la racine du dépôt GitHub puis déclencher un nouveau build
   Netlify (`npm run check`, publication `dist/`). Attendre le déploiement EFFECTIF.
5. Fermer/réouvrir la PWA le cas échéant ; ouvrir d'abord le site dans une fenêtre
   privée ou sur un navigateur classique. Dans **Mes startups**, déplier « Afficher
   le diagnostic technique ». Communiquer le code et le message si le problème persiste.

**Limites :** aucun accès au Supabase distant ni à la configuration Netlify réelle
n'était disponible ; la cause d'origine au niveau de la base ne peut être confirmée
qu'après exécution du diagnostic et contrôle de la session.

Remarque : `SHA256SUMS.txt` et `MANIFEST_SHA256.json` du dépôt sont des
archives historiques, non des attestations du correctif 3.6.1. Le manifest
`dist/manifest.json` est régénéré à chaque compilation.
