# Notes de version — EURACONNECT V0.8.5

Date : 15 octobre 2026. Base : V0.8.4.

## Correctif bloquant

Écriture des favoris : la V0.8.4 n'envoyait pas `utilisateur_id` et n'avait pas configuré sa valeur par défaut. Cette version ajoute la valeur par défaut **et** utilise une nouvelle RPC atomique vérifiant les droits. La vue « Mes favoris » utilise une pagination SQL et non un simple filtrage du premier écran.

## Nouvelle capacité

- Tags et catégories collaboratifs sur la fiche entreprise, la fiche personne, les offres et les besoins.
- Création libre de compétences depuis les champs existants.
- Index canonique d'alias et synonymes, suggestions fuzzy et normalisation accents/casse/ponctuation.
- Historique de compétences existantes conservé ; pas de suppression ni réattribution implicite.
- Confidentialité des tags de besoins respectée côté SQL.
- Publication de besoins et offres transactionnelle avec leurs tags.
- Mots-clés entreprises et personnes cherchables dans l'annuaire.

## Dépendances techniques

Nécessite les migrations précédentes, notamment `202610140008_favoris.sql`.
Exécuter ensuite **uniquement** `202610150009_favoris_tags_intelligents.sql`.

## Vérification

Tests statiques V0.6-V0.8.5 et contrôles de types avec stubs : OK.
Tests Supabase réels, tests E2E et build Next.js officiel : à exécuter en recette.
