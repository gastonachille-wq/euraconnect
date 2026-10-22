# EURASANTÉ CRM — V5.2 sécurisée (Cloudflare Workers)

**Base unique : V5 initiale**, et non la série V7/V8/V9. Les 9 modules, le menu horizontal, les vignettes et les fiches partenaires restent en place. Cette édition restaure et corrige les interactions sans changer les tables Supabase.

## Déployer

1. Sauvegarder le dépôt et la version Cloudflare actuellement en production.
2. Remplacer le contenu du dépôt GitHub par ce paquet complet (attention : **supprimer** les anciens fichiers absents du paquet, en particulier `public/data/partnership_seed.json`).
3. Conserver le Worker Cloudflare `crm-light` et `npx wrangler deploy` ; la configuration de routage est dans `wrangler.jsonc`, **pas de redirection SPA** dans `public/_redirects`.
4. Exécuter `npm run check` si possible avant la publication. Tester dans une URL Preview isolée sans modifier de données de production.
5. Vérifier **sans connexion** que `/data/partnership_seed.json` ne renvoie plus le JSON. Un HTML de repli SPA est acceptable ; des données contractuelles ne le sont pas. Tester aussi les parcours listés dans `docs/RECETTE_V5_2.md`.

## Corrections V5.2

- Retrait du fichier seed contractuel public, de son bouton et de ses fonctions JS / bridge ; les données Supabase restent inchangées.
- Tableau de bord « Ma journée » (présenté comme **vue équipe** tant qu'aucun compte n'est rattaché de façon certaine à un référent) : tâches en retard, 7 jours, RDV à 7 jours, prospects sans mouvement depuis 30 jours, conventions finissant sous 90 jours. Boutons pour ouvrir les fiches et clôturer une action.
- Un sélecteur accessible au doigt ou clavier sur les cartes Kanban prospects et tâches partenariats, sans supprimer le glisser-déposer souris.
- Résolution d'un bogue métier réel : les modifications **partielles** de statut prospect, action et engagement étaient refusées si `nom_sponsor` ou `titre` n'était pas renvoyé dans le PATCH.
- KPI pipeline limité aux dossiers non fermés, recherche insensible aux accents, horodatage de synchronisation.
- Le rafraîchissement automatique ne se lance pas lorsque l'onglet est masqué ou qu'un formulaire est ouvert ; il conserve la fréquence de 60 secondes dans les autres cas.
- En-têtes noindex/COOP et script de contrôle qui refuse les fichiers contractuels dans `public`.

## À faire impérativement côté infrastructure

**Le retrait du fichier public ne remplace pas une politique RLS.** Exécuter d'abord le diagnostic `supabase/00_DIAGNOSTIC_LECTURE_SEULE.sql` (lecture seule) puis contrôler les droits des tables en conservant un export des politiques d'origine. Ne pas exécuter de script qui supprime les politiques en production sans test préalable et plan de retour arrière. Dans Supabase Auth, désactiver les inscriptions publiques si elles sont ouvertes ; attribuer les comptes par invitation. Dans Cloudflare Access, restreindre l'accès à l'application aux utilisateurs autorisés. Considérer les versions historiques du site et l'historique Git si le seed a déjà été publié.

## Hors périmètre de cette édition

- Rôles `lecteur/contributeur/admin` RLS, journal d'audit et corbeille, anti-concurrence et mises à jour incrémentales des 13 tables : à traiter **après diagnostic du schéma réel**, sur une copie Supabase.
- Import Excel et export XLSX ODJ, import massif des RDV : encore non portés depuis le serveur Python V5.
- Les tests navigateur de cette livraison utilisent une simulation locale de réponses Supabase, **pas** de validation des droits réels en production. La vérification de publication Cloudflare ne peut être garantie avant déploiement.

## Tests et compatibilité

`npm run check` vérifie la syntaxe JavaScript et l'absence de fichiers contractuels publics. `tests/smoke_dom.py` (hors build) exerce la connexion fictive, le cockpit, le Kanban, deux écritures PATCH simulées et le rendu mobile. Les vignettes et les parcours existants demeurent en place. Déploiement sans migration SQL.
