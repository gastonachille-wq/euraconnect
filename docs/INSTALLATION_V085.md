# Déployer EURACONNECT V0.8.5

> **Prérequis** : EURACONNECT V0.8.4 avec les migrations 001 à 008 appliquées. Si la 008 a échoué, l'exécuter avant la 009. Déployer d'abord en environnement de recette.

1. **Sauvegarder la base Supabase** (snapshot/backup avant modification).
2. Dans Supabase → SQL Editor, créer une requête et **coller uniquement** le contenu de `supabase/migrations/202610150009_favoris_tags_intelligents.sql`.
3. Cliquer **Run** ; résultat attendu : `Success`. Ne PAS rejouer le bootstrap, ni les migrations 001–008.
4. Toujours dans Supabase, exécuter `supabase/tests/v085_diagnostics.sql`. Les contrôles affichés doivent retourner `true`, la requête de doublons de clés ne doit renvoyer aucune ligne. Les compteurs informatifs peuvent valoir zéro.
5. Ouvrir une branche `release/v085-favoris-tags` sur GitHub puis y ajouter **le contenu du ZIP complet** à la racine (ne pas inclure de dossier parent).
6. Attendre le résultat du workflow **Verify build** sur GitHub. Il exécute la vérification de structure, `npm run typecheck`, puis `npm run build`.
7. Déployer cette branche en recette Netlify, avec les variables déjà connues `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`, puis suivre `docs/RECETTE_V085.md`.
8. Seulement si la recette est validée, fusionner dans `main` et laisser Netlify déployer en production.

## Si les favoris ne fonctionnent toujours pas

- Vérifier que la migration 008 **et** 009 ont abouti, puis recharger l'application.
- Le navigateur doit être connecté à Supabase avec une session active.
- Lire l'erreur visible sous la barre de recherche de l'annuaire.
- Un utilisateur ne peut pas enregistrer comme favori une fiche qui n'est plus visible selon les droits de l'annuaire.
- L'action est fournie par la RPC `ec09_basculer_favori`. Les données restent dans `public.favoris_ec`, avec isolation RLS utilisateur.
- Dans le cas d'une RPC récemment créée non détectée, vérifier le cache du schéma PostgREST (la migration déclenche `NOTIFY pgrst, 'reload schema'`).

## Si les tags ne fonctionnent pas

- Vérifier les RPC `ec09_suggerer_termes`, `ec09_creer_terme`, `ec09_definir_tags` dans le diagnostic.
- Seul le propriétaire/gestionnaire d'une entreprise peut modifier ses tags ; seule la personne elle-même modifie ceux de sa fiche ; offres et besoins appliquent les droits des entreprises.
- Un tag très proche d'un terme existant doit être confirmé explicitement ou remplacé par la suggestion ; les accents et synonymes exacts ne créent jamais de second terme canonique.
- Une modification de tags sur une fiche déjà créée dispose de son **propre bouton « Enregistrer les tags »**, indépendant de « Enregistrer la fiche ».

## Retour arrière

Le code peut revenir à V0.8.4 sans perdre les tables ni les tags. Les nouvelles tables et colonnes sont additives. Ne pas supprimer manuellement les tables `ec09_*` après usage : elles peuvent contenir des données utilisateurs.
