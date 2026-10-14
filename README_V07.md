# EURACONNECT V0.7 - Dossiers commerciaux collaboratifs

## Objectif

Passer de parcours commerciaux detenus par un seul utilisateur a des dossiers partages
par entreprise, en preservant les besoins, candidatures, conversations et comptes existants.

## Nouveaux modules

- Espace **Dossiers partages** pour les startups et les entreprises prestataires.
- Selection de l'entreprise lorsque l'utilisateur appartient a plusieurs structures.
- Boite commerciale avec dossiers, propositions anonymisees, relations et suivi.
- Publication de besoins au nom de l'entreprise startup selectionnee.
- Recherche des besoins disponibles et candidature au nom du prestataire selectionne.
- Responsable interne assignable sur chaque dossier (un par entreprise et candidature).
- Gestionnaires et proprietaires : gestion commerciale complete pour leur entreprise.
- Collaborateurs : lecture des dossiers; ecriture des messages et du suivi seulement
  lorsque le dossier leur est attribue.
- Messages et etapes de l'opportunite conserves au niveau de la relation existante.
- Journal d'actions internes, distinct pour chaque entreprise concernee.
- Parcours de rattachement des besoins historiques sans entreprise.
- Blocage des acces historiques apres retrait d'une entreprise.

## Droits fonctionnels

| Action | Proprietaire | Gestionnaire | Collaborateur |
|---|---|---|---|
| Lire les dossiers de l'entreprise | oui | oui | oui |
| Creer besoin / candidature | oui | oui | non |
| Demander / accepter une mise en relation | oui | oui | non |
| Attribuer un responsable | oui | oui | non |
| Voir les messages apres accord | oui | oui | oui |
| Envoyer des messages | oui | oui | si attribue |
| Actualiser les etapes commerciales | oui | oui | si attribue |

L'administrateur global n'obtient pas automatiquement acces aux conversations privees.

## Contenu

- `supabase/migrations/202610140006_collaboration_dossiers.sql`: migration V0.7.
- `components/v07/WorkspaceCommercialV07.tsx`: nouveau module React.
- `app/page.tsx`: entree de navigation et chargement du composant.
- `app/globals.css`: styles responsive.
- `supabase/tests/v07_diagnostics.sql`: diagnostics non destructifs de schema et privileges.
- `supabase/tests/v07_smoke_acces.sql`: test de refus d'acces fictif.
- `docs/INSTALLATION_V07.md`: ordre d'installation avec retour arriere frontend.
- `docs/RECETTE_V07.md`: scenarios de recette multi-comptes et RLS.
- `docs/HYPOTHESES_V07.md`: arbitrages et limites.

## Mise en production

Cette archive n'a pas ete deployee sur vos comptes. **Recette necessaire**.
La migration modifie des politiques RLS et certaines fonctions historiques. Sauvegarder
et appliquer en preproduction **avant** toute mise en production.

## Etat de verification

- Verification du contenu et du format de l'archive : voir `scripts/verify-v07.mjs`.
- Syntaxe des composants TS/TSX : parseur TypeScript global.
- Compilation complete Next.js, integration Supabase et tests d'acces avec de vrais
  utilisateurs : **non verifies ici**. Les fichiers de recette sont fournis.

Les emails transactionnels, Stripe, les projets multi-roles et les evenements complets
restent a livrer dans les lots suivants.
