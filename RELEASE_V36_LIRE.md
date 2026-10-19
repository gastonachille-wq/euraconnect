# EURACONNECT V3.6 — Conseil SUM, annuaire et agenda

## Évolutions
- Correction importante : dans le cockpit SUM, la liste des demandes est désormais filtrée sur la startup sélectionnée, au lieu de présenter les demandes de tout le portefeuille.
- Libellés d’accompagnement clarifiés : aucun rôle décisionnaire du SUM.
- Annuaire : recherche plus lisible, meilleure hiérarchie, textes longs, cartes de hauteur stable, état d’expertise absent explicite, disponibilité non inventée.
- Agenda : intitulés simplifiés, navigation et périmètre mieux identifiés, liste chronologique, libellés corrigés, protections responsive.
- Styles additionnels dans interface.css, sans changement de stack ni de schéma SQL.

## Déploiement
Archive à la racine du dépôt GitHub. Aucun nouveau script SQL nécessaire. Conserver les migrations V3.4 et V3.5 déjà présentes, et appliquer ces migrations sur une base de test si ce n’est pas fait.

## Vérifications
Exécuter `npm install`, `npm run check`, `npm run build`. La validation en environnement Supabase authentifié et les tests visuels manuels restent à réaliser.

## Limites
Ce lot améliore les écrans existants, mais n’ajoute pas encore le référentiel de compétences à trois niveaux, le moteur de recherche SQL avancé, ni les parcours de rendez-vous SUM entièrement repensés. Les indicateurs de portefeuille dépendent des données déjà fournies par le backend.
