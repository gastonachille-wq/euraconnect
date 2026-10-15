# EURACONNECT V0.8.8 - Correctif besoins et opérations commerciales

## Cause vérifiée dans le SQL de V0.8.7
Dans `ec08_fil_besoins`, `RETURNS TABLE(id uuid, ...)` met `id` dans l’espace des variables PL/pgSQL. La condition `from public.entreprises_ec where id=p_entreprise` rend `id` ambigu (42702). La fonction est redéfinie avec l’alias explicite `ec.id`.

## Mise en place
1. Sauvegarder Supabase et tester sur une copie.
2. Exécuter **uniquement** `supabase/migrations/202610150012_correctif_besoins.sql` après les migrations précédentes.
3. Déployer les fichiers du ZIP sur une branche GitHub de recette et lancer le build Netlify.
4. Vérifier les pages Dossiers commerciaux et Bourse des besoins avec deux comptes, startup et prestataire Free/Pro.

## Visibilité
Les champs `titre_anonyme` / `annonce_anonyme`, validés à la publication, sont accessibles à tous les prestataires autorisés, sans que leur compte ait besoin d’être Premium. Les tags de chaque besoin sont affichés via une fonction RPC qui s’appuie sur la liste des besoins visibles. L’identité réelle de la startup reste réservée aux prestataires Premium. Cela ne garantit pas l’anonymat si l’incubé se nomme dans sa description.

## Fonctionnalités
- Correction ciblée de l’ambiguïté SQL dans la RPC de la bourse, utilisée aussi dans les opérations commerciales.
- Conversion robuste des erreurs Supabase ; plus d’affichage `[object Object]` dans la bourse.
- Compétences/tags de chaque demande visibles, même si aucune correspondance n’existe avec le prestataire.
- Résumé lisible et volet « Comprendre le besoin » avec conseils pour rédiger une réponse.
- Bouton « Proposer mes services » et conservation de la réponse construite existante.

## Validation
Archive, références et contrôle de cohérence statique. **Build Next.js et migration réelle non exécutés dans cet environnement** ; aucune certification de production.
