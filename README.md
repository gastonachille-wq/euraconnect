# EURASANTÉ CRM — Restauration de l'interface V5 sur Cloudflare

> **Mise a jour 21/10/2026 — deploiement Workers `crm-light`** : lire en premier [`DEPLOIEMENT_WORKERS.md`](DEPLOIEMENT_WORKERS.md). Le journal fourni utilise `npx wrangler deploy` (Workers Static Assets) et **non Pages**. La redirection `/* /index.html 200` a ete neutralisee et remplacee par la configuration SPA dans `wrangler.jsonc`. Le code HTML/CSS/JS de la V5 reste identique.

## Objectif

Cette version est **une restauration conservatrice du CRM V5 initialement transmis** (archive `Eurasante_CRM_V5_Partenariats_Kanban_JSON_ICS.zip`). Ce n'est pas une V10 redessinée.

- `public/index.html` = structure de l'interface historique `app.html`, avec 6 KPI changés en boutons navigables et ajout d'un adaptateur de données.
- `public/styles.css` = feuille de style historique, complétée de styles de clic, focus et mobile.
- `public/ui_config.js` = dictionnaire de navigation et d'apparence historique, avec rafraîchissement à 60 s.
- `public/app.js` = moteur d'interface V5 et ses formulaires, avec les gestionnaires HTML inline remplacés par des événements JS compatibles CSP.
- `public/cloudflare-bridge.js` = nouvelle passerelle native vers **Supabase Auth et PostgREST**, sans dépendance CDN et sans serveur Python.

Aucune table Supabase n'est créée, déplacée ou purgée par le déploiement. Le même projet Supabase est utilisé.

## Déploiement Cloudflare Pages (alternative à Workers)

1. Sauvegarder la branche/les fichiers actuellement en production.
2. Décompresser ce ZIP dans un dépôt GitHub privé (moins de 100 fichiers).
3. Cloudflare Pages : créer une publication Git, racine du dépôt, framework **None**, build `exit 0`, répertoire de sortie `public`.
4. Faire d'abord un **déploiement Preview**. Vérifier la connexion avec un compte existant, puis les listes, les fiches et les droits RLS.
5. Promouvoir le déploiement quand la recette métier est terminée.

`public/config.json` utilise la même URL et la même clé *publishable* que la V9.1 fournie. Une clé Supabase publishable est publique par conception. Ne jamais ajouter `service_role`, `sb_secret` ou d'autres secrets au dépôt.

## Interactions restaurées

- Menu horizontal V5 : les neuf modules restent accessibles, en cliquant aussi sur les icônes.
- Les six KPI du cockpit sont **entièrement cliquables**.
- Toutes les étapes de l'entonnoir ouvrent le pipeline filtré.
- Cartes de prospects, de projets et de partenaires : la vignette entière ouvre la fiche.
- Favoris : l'icône étoile fonctionne sans déclencher l'ouverture de la vignette.
- Cartes et boutons accessibles à la touche Entrée/Espace ; retour visuel au survol et au focus.
- Formulaires prospect/projet/convention/engagement/action/réalisation conservés et connectés aux écritures Supabase REST, selon les droits RLS existants.
- Les vues liste/cartes/Kanban/relations et les filtres de la V5 sont conservés.
- Import de conventions JSON avec prévisualisation et protection par `source_key`, export ICS ciblé et export HTML autonome.
- Chargement facultatif du référentiel historique `partnership_seed.json`, après confirmation, en mode additif basé sur `source_key`.

## Limitations connues (transfert serveur Python vers Cloudflare)

Les actions suivantes avaient une dépendance au serveur Python et ne sont **pas encore disponibles** dans la version Cloudflare. Un message explicite est affiché si l'utilisateur tente de les utiliser :

- Import Excel XLSX/XLSM avec prévisualisation et fusion/remplacement.
- Export XLSX de reporting ODJ.
- Import massif et dédoublonnage des historiques RDV depuis les fichiers ICS/JSON locaux.
- Historique d'audit écrit automatiquement par le serveur Python (la journalisation DB/RLS existante, le cas échéant, demeure inchangée).

**Les autres fonctions métier n'ont pas été validées contre votre base de production** ; les tests de ce lot sont effectués avec des réponses Supabase simulées. Pour les imports/écritures significatives, réaliser la recette sur un environnement de test avant production.

## Tests d'interface effectués

Tests Playwright/Chromium avec données fictives et routes Supabase simulées :

- chargement authentifié et KPI ; navigation via KPI ; recherche de module par bouton du menu ;
- ouverture des cartes prospects, projets, partenaires ;
- gestion du favori sans ouvrir la carte ;
- sélection d'une étape de l'entonnoir ;
- création d'un prospect et insertion simulée via PostgREST ;
- création d'une tâche rattachée à un partenariat et insertion simulée via PostgREST ;
- vérification du rendu mobile à 390 px sans débordement horizontal ;
- aucune erreur JavaScript pendant la séquence de recette automatisée.

Les aperçus `docs/apercus` proviennent de ces tests **avec données fictives** et ne représentent pas votre Supabase réel.

Voir `docs/RECETTE_MISE_EN_PRODUCTION.md` pour les tests à effectuer sur votre site.
