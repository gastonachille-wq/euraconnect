# EURACONNECT V2.7 — Instructions rapides

**Contenu ZIP :** sources TypeScript `src/`, styles et ressources `public/`, projet compilé `dist/`, tests, scripts, migrations SQL historiques, notes de release.

**Stack inchangée :** frontend TypeScript statique, Cloudflare Workers, API Supabase.

1. Sauvegarder le dépôt actuel et la base.
2. Remplacer le contenu du dépôt Cloudflare/GitHub par les fichiers du ZIP.
3. Vérifier les deux variables **publiques** de build Supabase.
4. Commit & push, attendre la compilation Cloudflare (`npm run build`).
5. Tester avec un compte incubé puis prestataire : catalogue, recherche, favoris, fiche prestataire, détail, créneaux.

La V2.7 ne nécessite **aucune nouvelle exécution SQL** mais suppose les migrations antérieures installées pour les fonctions des V2.2 / V2.3.

Détails et limites : `RELEASE_V27_LIRE.md`.
