# EURACONNECT V3.2 — Parcours Demandes, Messages, Agenda

## Livré
- Accueil incubé : suppression de la bannière générique lorsqu'aucune action urgente n'est identifiée ; KPI « Demandes en cours » et « Propositions à examiner » sans compteur doublonné.
- Agenda : 4 vues (Jour, Semaine, Mois, Liste), ancienne URL `view=table` redirigée fonctionnellement vers Liste ; filtres repliables avec compteur actif ; hauteur horaire de 48 px ; amplitude calculée à partir des événements y compris tardifs ; positionnement initial du défilement près des événements.
- Messages : amélioration de la densité, des bulles et du panneau de contexte ; conservation des fonctions métier existantes.
- CSS : nouvelle feuille ux-v32.css chargée en dernier, corrections sans migration SQL.

## Validation
- `npm run check` : 94 tests réussis, TypeScript et build validés.
- Pas de recette Playwright ni de tests authentifiés Supabase/Cloudflare dans cette livraison.
- Le projet garde les feuilles CSS historiques ; la consolidation totale en un fichier et les états de chargement/erreur par page restent à réaliser.
- Pas de nouveau mécanisme de pièce jointe ajouté : le backend existant n'a pas été modifié.

## Déploiement
Archive GitHub contenant les sources, sans `dist/` ni `node_modules/` : à extraire à la racine du dépôt. Cloudflare : `npm run check` puis `npx wrangler deploy`. Ne pas relancer les anciennes migrations SQL.
