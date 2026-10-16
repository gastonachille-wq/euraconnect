# EURACONNECT V2.1 — Parcours & Lisibilité

## Livré et effectivement modifié

- Refonte de la page détail d'une demande, côté incubé et prestataire.
- Bandeau de prochaine action contextualisé (répondre, accéder aux échanges, examiner les propositions, améliorer le besoin).
- Mise en page du brief en sections, meilleure typographie, contraste, gestion des textes longs et responsive.
- Actions secondaires hiérarchisées, rappel de confidentialité moins envahissant.
- Nouveau CSS `public/ux-v21.css` chargé en dernier, pour ne pas modifier les règles métier existantes.
- Version 2.1.0 dans `package.json`, le lockfile et le script de build.

## Non inclus dans ce correctif ciblé

Ce n'est pas encore la refonte fonctionnelle intégrale décrite dans le nouveau cahier des charges. Les brouillons serveur, nouvelles RPC transactionnelles, automatisation de la file manager, frise consolidée, confidentialité par schéma séparé, migrations V2→V1 et nouvelle architecture React nécessitent des lots distincts, avec tests RLS et recette.

## Déploiement

1. Sauvegarder le dépôt actuel et exporter la base avant toute intervention.
2. Décompresser cette archive dans le dépôt existant, en remplaçant les fichiers correspondants.
3. Exécuter `npm ci` puis `npm run check`.
4. Commit/push vers la branche de recette ; laisser Cloudflare déployer selon la configuration existante.
5. Tester les comptes incubé et prestataire : demande avec/sans proposition, accès à la discussion, demande avec description très longue, affichage mobile.
6. Après validation, fusionner sur `main`.

**Aucune migration SQL à exécuter** pour cette release. Les variables Supabase déjà configurées dans Cloudflare restent inchangées. Le build local sans variables affiche « Configuration Supabase à renseigner au déploiement » : il ne vérifie pas la connexion distante.

## Tests

`npm run check` exécuté localement avec succès : TypeScript, 54 tests existants, génération des assets. Aucun test navigateur authentifié ni test PostgreSQL exécuté pour cette release.
