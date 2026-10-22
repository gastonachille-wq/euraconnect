# Correctif 5.0.1 — Cloudflare Workers Static Assets (21/10/2026)

- Neutralisation du redirect `/* /index.html 200` qui provoquait l'erreur Cloudflare 100324.
- Ajout de `wrangler.jsonc` avec `assets.not_found_handling=single-page-application`.
- Ajout de `package.json` pour figer Wrangler et automatiser la verification de syntaxe.
- Aucune modification des fichiers applicatifs `public/index.html`, `public/styles.css`, `public/app.js`, `public/ui_config.js` ou `public/cloudflare-bridge.js`.

---

# Retour à la V5 — restauration Cloudflare

- Réemploi du **HTML, CSS, configuration visuelle et des parcours JS de l'application initialement remise**.
- Abandon de la refonte de navigation/cockpit V7, V8 et V9 pour cette branche.
- Correction des clics de 32 motifs d'événements inline remplacés par délégation explicite et focus clavier.
- KPI, étapes d'entonnoir, cartes de projets et lignes récentes convertis en surfaces intégralement cliquables.
- Maintien des favoris indépendants de l'ouverture des fiches.
- Remplacement du serveur Python local par une passerelle Supabase GoTrue/PostgREST pour les tables et opérations métier principales.
- Reprise possible des sessions Supabase déjà présentes dans le navigateur, suppression correcte de la session à la déconnexion.
- Chargement conservateur, sans migration ni effacement automatique des données Supabase.
- Exports HTML et ICS depuis le navigateur, import JSON convention avec prévisualisation, seed historique facultatif et non destructif.
- Fonctions de traitement Excel et d'import massif RDV explicitement signalées comme non portées.
- Captures de recette Chromium sous données fictives ; test sur la base Supabase réelle restant à faire.
