# Mise en ligne EURACONNECT V2.0 — 2 étapes

1. **Supabase, en premier** : dans SQL Editor, collez le contenu de `supabase/07_V20_MANAGER_RECOMMANDATIONS.sql`, puis exécutez-le. Avant cela, sauvegardez votre base et assurez-vous que la migration `06_V12_PROFILS_AGENDA_ANNUAIRE.sql` a été appliquée. La V2 ajoute une table privée et une API RPC, sans supprimer vos données V1.3.
2. **GitHub, ensuite** : décompressez `EURACONNECT_V20_RELEASE_COMPLETE.zip`, copiez **tous les fichiers et dossiers présents dans le ZIP** à la racine de `gastonachille-wq/euraconnect`, puis `Commit & Push`. Cloudflare reconstruit l'interface automatiquement.

Dans Cloudflare, conservez `npm run check` et `npx wrangler deploy` ainsi que les variables Supabase déjà configurées.

Si le SQL échoue, **ne déployez pas** les fichiers applicatifs avant d'avoir identifié l'erreur. L'hébergement actuellement en ligne reste inchangé tant que vous n'avez pas poussé le nouveau code.

**Important** : les tests de compilation ont été exécutés localement ; la migration PostgreSQL et les interactions sur votre environnement réel ne l'ont pas été. Voir `README_V20.md` pour la recette des différents rôles.
