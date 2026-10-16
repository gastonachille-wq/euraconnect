# EURACONNECT V2.4 — Navigation croisée et ergonomie

## Évolutions livrées
- Menu latéral regroupé en **Travailler / Réseau / Compte**. Chaque groupe peut être ouvert ou fermé depuis son titre.
- Bouton **Réduire le menu** sur ordinateur : la navigation devient une colonne d'icônes, avec intitulés accessibles par infobulle. La préférence est mémorisée dans ce navigateur.
- Barre contextuelle de raccourcis entre les espaces : demandes → annuaire, services et messages ; annuaire → services et agenda ; catalogue → entreprises et disponibilités ; agenda → messages et experts ; portefeuille → demandes et rendez-vous.
- Navigation mobile inférieure enrichie d'icônes, menu complet accessible par « Plus ».
- Suppression du grand encart Premium latéral redondant pour redonner de la place aux parcours métier. Les fonctions Premium existantes restent disponibles.
- Aucun nouveau framework, aucune migration SQL, aucune modification des permissions Supabase.

## Installation
1. Remplacer le contenu du dépôt GitHub par le contenu du ZIP, en conservant l'arborescence.
2. Commit & Push. Cloudflare compile avec `npm run check` et déploie avec `npx wrangler deploy`.
3. Garder les variables Supabase de compilation déjà configurées dans Cloudflare.

## Validation et limites
- `npm run check` : 57 tests existants réussis, vérification TypeScript et génération `dist` réussies avec le TypeScript global disponible localement.
- Pas de recette navigateur complète ni de test sur la base Supabase réelle.
- Cette release améliore la navigation transversale ; elle **ne livre pas** la gestion administrable des incubateurs ni la refonte métier du catalogue demandées précédemment.
- La navigation mobile utilise les routes existantes ; certaines vues restent limitées par les règles métier et API de la V2.3.
