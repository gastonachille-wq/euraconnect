# EURACONNECT V3.1 - stabilisation ergonomique

Cette release est une première étape ciblée sur le document de préconisations reçu le 19 octobre 2026. Elle ne prétend pas satisfaire l'ensemble des 175 lignes du cahier de correction.

## Modifications effectives
- Ajout d'une feuille de style de stabilisation `public/design-v31.css` chargée en dernier : tokens communs, alignement de page, protection contre les débordements, pieds de cartes Demandes, badges, états focus, mise en page responsive.
- Cartes Demandes : suppression du doublon du compteur de propositions dans l'en-tête, suppression du nom de l'entreprise pour ses propres demandes, cœur comme unique icône de favori, raccourcissement du bouton de consultation, correction de la zone pied de carte.
- Suppression du sélecteur de statut redondant dans la barre de recherche des demandes (les pastilles de statut restent disponibles).
- Suppression du message superflu sur la synchronisation des favoris.
- Suppression du raccourci Messages en double dans l'en-tête (navigation latérale conservée).
- Mise à jour de la version 3.1.0.

## Validations réellement effectuées
- `tsc --noEmit` : succès.
- `node scripts/build.mjs` : succès.
- `node --test tests/*.test.mjs` : 92 tests réussis.
- Aucune validation navigateur réelle, aucune recette Supabase authentifiée, aucune validation WCAG automatisée dans cette livraison.

## Restant à faire, non inclus
- Design system intégral sans aucune valeur codée en dur dans les anciens styles.
- Grille Agenda 48 px/heure : une règle de densité est ajoutée, mais le calcul de positionnement historique des événements est toujours en 60 px/heure ; ce point nécessite une refonte couplée CSS/TS avant validation visuelle. **Ne pas considérer la hauteur 48 px comme validée.**
- États loading/error sur toutes les listes, regroupement des résultats de recherche globale, complétude profil, données de démo réécrites, vues liste des demandes, contraste AA exhaustif, tests Playwright à 1280/1440/1920.
- Fonctionnalités nécessitant un changement de modèle de données : unités tarifaires, pièces jointes réelles.

## Déploiement
Importer le contenu de l'archive à la racine du dépôt GitHub. Conserver les variables Supabase. Build `npm run check`, déploiement `npx wrangler deploy`. Aucune migration SQL nouvelle.
