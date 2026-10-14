# Recette EURACONNECT V0.6

| ID | Role | Action | Resultat attendu |
|---|---|---|---|
| V06-01 | Admin | Connexion reussie | Arrivee sur le dashboard et indicateurs issus de Supabase. |
| V06-02 | Admin | Ouvrir la gestion des comptes | Tous les comptes Auth restent visibles. |
| V06-03 | Admin | Rechercher un prestataire historique dans Entreprises | Fiche entreprise creee par migration, utilisateur proprietaire rattache. |
| V06-04 | Admin | Rattacher un compte prestataire existant comme gestionnaire | Membre ajoute, sans remplacer le proprietaire. |
| V06-05 | Admin | Tenter de rattacher un compte incube a une entreprise prestataire | Operation refusee. |
| V06-06 | Prestataire | Se connecter avec un gestionnaire | Fiche entreprise accessible et publication d'offres autorisee si prestataire valide. |
| V06-07 | Collaborateur | Tenter d'enregistrer une modification entreprise | Refus RPC, aucun changement en base. |
| V06-08 | Incube | Creer sa startup | Entreprise brouillon creee, proprietaire rattache, pas de compte supprime. |
| V06-09 | Incube | Publier la fiche startup | Visible dans Annuaire. |
| V06-10 | Utilisateur | Renseigner une fiche personne sans activer visible | Fiche absente de la recherche d'autres comptes. |
| V06-11 | Utilisateur | Activer visible et publier son entreprise | Fiche personne visible sans email ni telephone. |
| V06-12 | Responsable | Ajouter et retirer des tags de competences | Tags affiches sur l'annuaire et persistants au rechargement. |
| V06-13 | Utilisateur | Rechercher par nom, type et competence | Resultats filtres, fiches navigables. |
| V06-14 | Prestataire | Publier une offre avec titre, listes, gras et liens | Mise en forme affichee sans script embarque. |
| V06-15 | Incube | Publier un besoin avec mise en forme | Besoin persistant et lisible. |
| V06-16 | Responsable | Televerser image png/jpg/webp inferieure a 2 Mo | Fichier stocke et affichage du visuel apres enregistrement. |
| V06-17 | Responsable | Televerser un fichier non-image ou superieur a 2 Mo | Refus explicite. |
| V06-18 | Autre utilisateur | Tenter de televerser dans le dossier entreprise d'autrui | Refus Storage RLS. |
| V06-19 | Prestataire | Tester le parcours V0.4 de candidature comme proprietaire | Flux precedent non regressif. |
| V06-20 | Incube | Tenter d'acceder aux entretiens/messages d'autres personnes | Lecture refusee par RLS. |

## Non inclus dans la recette automatisee

La presente livraison comporte des tests structurels et un protocole manuel. Elle n'inclut pas de tests Playwright reels ni de tests pgTAP executes sur une instance PostgreSQL. Effectuer ces tests en recette avant d'ouvrir la plateforme a des utilisateurs tiers.
