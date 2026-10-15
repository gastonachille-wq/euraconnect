# EURACONNECT 0.8.5 — Favoris et taxonomie collaborative

## Objectifs
- Corriger les favoris. Le précédent formulaire omettait `utilisateur_id`, pourtant obligatoire et contrôlé par RLS.
- Ajouter des tags libres et réutilisables aux entreprises, profils personnels, offres et besoins existants.
- Favoriser la réutilisation : recherche et suggestions immédiates, comparaison insensible aux accents, casse et ponctuation, unicité SQL sur une clé normalisée.
- Enregistrer les sélections dès le clic, sans attendre l'enregistrement d'autres champs.

## Installation (ordre recommandé)
1. Sauvegarder Supabase et tester sur une copie de recette.
2. Exécuter **uniquement** `supabase/migrations/202610150009_favoris_tags.sql` après la migration 008.
3. Mettre en ligne **tout le projet** sur une branche GitHub de recette et construire sur Netlify.
4. Valider la recette ci-dessous avant de remplacer `main`.

## Recette
- Compte A : ouvrir l'annuaire, ajouter une entreprise en favori, fermer et rouvrir sa fiche : coeur actif. Actualiser, se reconnecter : favori conservé. Cliquer de nouveau : favori supprimé.
- Compte B : vérifier qu'il ne voit pas les favoris privés du compte A.
- Entreprise propriétaire : ajouter le tag « Intelligence artificielle », vérifier qu'il apparaît immédiatement.
- Profil personnel : taper « intelligence artificielle », choisir le tag suggéré et ne pas créer un doublon.
- Vérifier « Économie circulaire », « economie-circulaire », « ECONOMIE CIRCULAIRE » : un seul ID de tag.
- Modifier les tags d'une offre et d'un besoin existants depuis leurs écrans métier.
- Collaborateur simple : vérifier que l'édition des tags d'entreprise et d'offre est refusée côté base.
- Utilisateur non connecté : vérifier l'absence de droit d'écriture.

## Limites explicites
- La recherche de tags propose une correspondance par mots/normalisation, pas de fusion sémantique IA (ex. « RH » et « Ressources humaines » restent distincts). Une gouvernance/modération et les synonymes pourront être ajoutés ultérieurement.
- Le filtre « Mes favoris » agit sur la page de résultats courante, non sur la totalité des pages du répertoire.
- Tags d'offre et de besoin éditables **après** la création de la fiche ; pas avant la publication initiale.
- Les tags ne modifient pas encore les algorithmes de matching et les filtres de recherche de l'annuaire.
- La compilation Next.js n'a pas pu être exécutée localement : `npm install --offline` échoue car les dépendances ne sont pas en cache.
