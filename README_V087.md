# EURACONNECT V0.8.7 — Matching opérationnel par tags

## Fonctionnalités
- Prestataires : tri « Pour mon entreprise » combinant le score métiers existant et les tags communs.
- Affichage des compétences réellement communes aux offres/entreprises et besoins.
- Tri chronologique alternatif et filtre « Compétences communes uniquement ».
- Conservation des épingles, recherches, confidentialité Free/Premium et statuts des demandes.
- Reprise du correctif SmartTags.tsx reçu, sous `components/v09/`, pour éviter de revenir à une version antérieure du composant.

## Installation
1. Sauvegarder la base.
2. Appliquer `supabase/migrations/202610150011_matching_tags.sql` après la V0.8.6.
3. Déployer le code sur une branche de recette Netlify.
4. Tester avec deux prestataires disposant de tags différents, et une startup possédant plusieurs besoins.

**Important :** ce projet est reconstruit depuis l'archive V0.8.6 disponible localement, avec le correctif SmartTags ultérieur. Si d'autres commits ont été faits depuis sur GitHub, comparer avant de remplacer toute l'application. Le score est indicatif et ne constitue pas une recommandation IA sémantique. Les tags visibles viennent de besoins déjà autorisés par `ec08_fil_besoins`.
