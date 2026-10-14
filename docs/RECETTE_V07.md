# EURACONNECT V0.7 - Plan de recette

Environnement : recette / preproduction seulement.
Distinguer le statut d'execution `non teste`, `passe` et `echoue`.

## Jeux de comptes conseilles

- A : administrateur historique ;
- B : startup 1, proprietaire ;
- C : startup 1, gestionnaire ;
- D : entreprise prestataire 1, proprietaire ;
- E : entreprise prestataire 1, gestionnaire ;
- F : entreprise prestataire 1, collaborateur ;
- G : entreprise prestataire 2, gestionnaire sans acces a prestataire 1.

Rattacher les comptes existants via Administration > Entreprises et collaborateurs.
Ne pas inscrire de comptes avec une adresse ne vous appartenant pas.

| ID | Contexte / operation | Attendu | Statut initial |
|---|---|---|---|
| V07-01 | B ouvre Dossiers partages | startup selectionnee, dossiers startup seulement | non teste |
| V07-02 | B publie un besoin | besoin attribue a startup 1, visible par C | non teste |
| V07-03 | D consulte les besoins disponibles | besoins publies, tri par correspondance | non teste |
| V07-04 | E envoie une candidature | candidature rattachee au meme prestataire que D; quota consomme | non teste |
| V07-05 | B/C consultent la proposition | texte visible, alias visible, identite cachee | non teste |
| V07-06 | C demande la relation | statut demande; E peut y repondre | non teste |
| V07-07 | E accepte | identite revelee, conversation accessible pour B/C/D/E | non teste |
| V07-08 | F consulte le fil non attribue | lecture oui, envoi refuse cote serveur | non teste |
| V07-09 | E attribue a F | F peut envoyer et mettre a jour l'etape commerciale | non teste |
| V07-10 | E attribue a G | refus : G n'appartient pas a entreprise 1 | non teste |
| V07-11 | G tente ouvrir relation entreprise 1 | refus; aucune information commerciale | non teste |
| V07-12 | Admin desactive F via base de recette | F ne peut plus lire ni ecrire dans son ancien fil | non teste |
| V07-13 | B/C publient simultanement | 2 besoins distincts de la meme startup, auteurs traces | non teste |
| V07-14 | D et E utilisent dernier quota simultanement | 1 candidature acceptee, l'autre refusee | non teste |
| V07-15 | Proprietaire d'un ancien besoin sans entreprise | rattachement possible a sa startup uniquement | non teste |
| V07-16 | Role simple collaborateur cree un besoin ou une candidature | refus serveur | non teste |
| V07-17 | Un compte non connecte appelle les nouvelles RPC | permission refusee | non teste |
| V07-18 | Messages entre 2 entreprises distinctes | aucun acces croise par URL ou RPC | non teste |
| V07-19 | Tests SQL de diagnostic + smoke | tous les controles passent | non teste |
| V07-20 | npm run typecheck puis npm run build | aucune erreur | non teste |

## Controle additionnel

- Tester en navigation privee les 2 roles, puis en mobile >= 360 px.
- Rechercher un besoin par mot cle et constater le changement de resultats.
- Verifier les caracteres accentues et les textes longs dans le fil.
- Verifier que les modifications de responsable et de statut ecrivent une ligne
  dans `audit_log` (administrateur seulement).
- Aucun statut `passe` n'est presume avant la recette de l'environnement reel.
