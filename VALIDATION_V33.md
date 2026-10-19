# Validation V3.3

- `npm run check` : 94/94 tests réussis (tests historiques adaptés au chargement d'une seule feuille CSS).
- `npm run build` : compilation TypeScript et génération du répertoire `dist` réussies.
- `python tests/browser_smoke.py ...` : 91/91 contrôles navigateur réussis sur l'aperçu autonome, données fictives et transport simulé.
- `python tests/browser_v33.py` : 28/28 contrôles de navigation, débordement de page et positionnement d'éléments interactifs, sur 7 écrans et 4 largeurs (390, 1280, 1440, 1920 px).
- Le test ne démontre pas l'absence de tout chevauchement entre éléments internes. Recette visuelle manuelle et tests Supabase authentifiés restent nécessaires.
- `npm ci` n'a pas été disponible via le réseau dans l'environnement de validation. Le TypeScript global version 5.8.3 (identique au `package-lock.json`) a été utilisé via un lien local non inclus dans le ZIP.
- Aucun déploiement Cloudflare, aucune migration SQL et aucune opération sur la base réelle n'ont été effectués.
