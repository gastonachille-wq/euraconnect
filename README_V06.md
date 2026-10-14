# EURACONNECT V0.6 - Experience et annuaire multi-entreprises

**Point de depart** : EURACONNECT V0.5, deja connectee aux comptes Supabase et Netlify.

## Livraison

- Dashboard par defaut, indicateurs en base et actions directes.
- Nouvelle ergonomie : navigation, cartes, recherche, vues entreprises / personnes.
- Distinction nette `organisations` (incubateur) / `entreprises_ec` (entreprises utilisatrices).
- Plusieurs utilisateurs par entreprise : proprietaire, gestionnaire, collaborateur.
- Historique preserve : backfill automatique des prestataires existants.
- Annuaire unifie des entreprises et des personnes, filtre sur competences normalisees.
- Rich text WYSIWYG pour profils, entreprises, offres et besoins.
- Images (logos, portraits, visuels d'offres) via Supabase Storage, maximum 2 Mo.
- RLS sur les nouvelles tables, RPC pour toutes les modifications sensibles.

## Installation

Lire `docs/INSTALLATION_V06.md` **avant** le deploiement.
Executer seulement `supabase/migrations/202610140005_entreprises_annuaire.sql`.
Puis verifier `supabase/tests/v06_diagnostics.sql`, et mettre le code a jour sur GitHub / Netlify.

## Etat des tests

- Syntaxe des fichiers TS/TSX analysee avec le parseur TypeScript local.
- Controle statique de structure / presence des composants fourni.
- Compilation npm/Next.js, execution PostgreSQL et recette navigateur : **non effectuees** ici.

## Compatibilite

La V0.5 et les migrations precedentes restent dans le depot.
Les utilisateurs, prestataires, offres, besoins, candidats et conversations historiques ne sont pas effaces.
Les limites multi-collaborateurs sur les conversations/candidatures historiques sont documentees dans `docs/INSTALLATION_V06.md`.
