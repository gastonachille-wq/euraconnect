# EURACONNECT 2.9.0 - Navigation continue et interactions fiabilisées

## Ce qui est livré

Version cumulative reconstruite a partir de l'archive V2.8 allegee fournie dans
la conversation. Ce n'est ni une nouvelle installation Supabase ni un changement
de framework. Le depot GitHub en ligne n'a pas ete modifie ou relu pour cette livraison.
Les eventuels changements apportes directement a ce depot apres V2.8 sont a comparer
avant remplacement.

### Navigation

- Une seule liste d'entrees, sans groupes ni accordeons. Toutes les destinations
  autorisees au role sont presentes sans devoir ouvrir une section.
- Incube : Accueil, Mes demandes, Messages, Agenda, Annuaire, Services, Ateliers,
  Entreprise & profil. Le prestataire voit Opportunites a la place de Mes demandes.
- Le manager dispose de Mes startups. L'administration est ajoutee seulement pour
  l'administrateur. Les regles d'autorisation restent du ressort de Supabase.
- Icones distinctes et couleur par univers. Les textes et les info-bulles expliquent
  chaque action : la couleur n'est jamais le seul repere.
- Commande reduire/agrandir en bas de la barre, icone seule, libelle accessible,
  etat annonce, repere clavier visible. Largeurs : 216 px ouverte, 68 px reduite.
- Le logo reste seul en haut, sans encart role/entreprise ni slogan encombrant.
  Le choix d'entreprise reste dans l'en-tete uniquement pour les multi-rattachements.
- Preference de largeur conservee dans le navigateur. Les entrees ne sont pas
  masquees en mode compact. Sur un petit ecran, Plus ouvre un panneau complet ;
  la commande du bas le ferme. Le fond n'est pas accessible au clavier lorsqu'il est ouvert.

### Contenu plus direct

- Un en-tete unique de 60 px sur ordinateur, sans barre intermediaire de raccourcis.
- Titres courts, controles de recherche/tri/affichage rapproches des resultats.
- Cartes d'annuaire plus denses, type et statut Premium lisibles. Les autres
  appartenances sont comptees et accessibles en info-bulle et dans la fiche detaillee.
- Logo et nom d'entreprise cliquables ; une action principale Voir la fiche et une
  action secondaire Creneaux. Les etiquettes de disponibilite ne sont plus nommees RDV.
- Filtres actifs retirables, remise a zero sans perdre l'onglet Contacts/Entreprises
  ni le mode d'affichage. Le panneau reste ouvert pendant une modification et se
  ferme par son bouton, Echap ou un clic hors du panneau.
- Recherche sans perte de focus ou de curseur. Conservation de la position lors
  d'un filtrage, retour dans la navigation et prevention des resultats tardifs d'une autre page.

### Corrections applicatives ciblees

| Probleme constate dans V2.8 | Correction 2.9 | Validation locale |
| --- | --- | --- |
| Formulaire d'invitation manager absent de la liste des formulaires traites | Envoi intercepte, dates controlees, appel ec23_manager_meeting | Interaction navigateur avec transport simule |
| Actions de consultation/archivage/suppression envoyees a ec1_api | Appels directs ec22_view, ec22_archive, ec22_delete, avec p_need/p_company | Contrats et appels navigateur simules |
| Filtre de conversations perdant l'identifiant de conversation | Hash et conversation conserves | Interaction navigateur |
| Brouillon de message perdu au rafraichissement | Brouillon en memoire, par compte/entreprise/conversation | Interaction navigateur |
| Reinitialisation de filtres revenant au mauvais onglet | Conservation des parametres de presentation | Test pur et navigateur |
| Fermeture d'une modale inexistante retirant le focus | Fermeture sans effet si aucune modale ouverte | Recherche clavier testee |
| Annulation transmettant une traduction au lieu du code SQL | Valeur technique annule, libelle francais conserve | Test de contrat |
| Ouverture d'une offre depuis la recherche globale sans detail | Cache contextualise et ouverture du detail existant | Verification de code et tests de rendu |
| Favoris avec libelles d'etat incoherents | Boutons synchronises, aria-pressed et infobulles mis a jour | Verification de code |
| Tests dependant d'un dist absent sur un depot neuf | Generation du build avant les tests | Execution depuis archive extraite |

Les boutons d'action asynchrones sont neutralises pendant leur traitement.
Cela limite les doubles clics dans l'interface ; cela ne remplace pas l'idempotence
serveur et ne constitue pas une garantie contre deux requetes de deux navigateurs.

## Installation sur votre infrastructure actuelle

1. Conserver une sauvegarde du depot.
2. Decompresser le ZIP et deposer **tout son contenu** a la racine GitHub, en
   conservant src/, public/, scripts/, tests/ et supabase/. Remplacer les fichiers
   existants sans effacer les autres fichiers du depot.
3. Verifier notamment `src/navigation.ts`, `src/client-state.ts`,
   `src/directory-v12.ts`, `src/agenda-v12.ts` et `public/ux-v29.css`.
4. Commit unique. Dans Cloudflare, conserver `npm run check` pour construire et
   tester ; `npx wrangler deploy` pour publier. Le dossier genere est `dist`.
5. Conserver les deux variables publiques Supabase au BUILD, pas seulement au runtime.
6. Apres publication, recharger l'application et verifier la version 2.9 en bas du menu.

Aucune nouvelle variable ni migration. Pour les consultations et l'archivage,
la migration historique 08 doit deja exister ; pour les invitations manager,
la migration 09 doit deja exister. Cette livraison corrige leur appel, pas leur
installation. Ne pas rejouer les SQL 00 a 09 deja appliques.

### Commandes locales facultatives

```sh
npm ci
npm run check
npm run preview
```

`npm run check` effectue le typage strict, genere dist puis execute les tests.
TypeScript 5.8.3 demeure l'unique dependance npm de developpement. Aucun nouveau
service, abonnement, framework ou bibliotheque de production n'est ajoute.

## Recette de dix minutes apres deploiement

1. Incube : ouvrir Annuaire, reduire le menu par l'icone du bas, consulter une fiche,
   rechercher puis effacer un filtre. Verifier onglet, focus et retour.
2. Messages : saisir un brouillon, filtrer la liste, actualiser. Le texte et la
   conversation restent selectionnes. Le brouillon n'est pas envoye automatiquement.
3. Manager : ouvrir une startup affectee, proposer un rendez-vous avec fin avant
   debut (refus explicite), corriger puis envoyer. Verifier sa reception cote incube.
4. Demande de test : consulter les statistiques, archiver une demande jetable puis
   verifier le resultat. Ne tester une suppression que sur une demande sans reponse.
5. Prestataire : verifier le masquage de l'identite de la startup dans les memes
   ecrans que precedemment. Cette livraison ne modifie pas les autorisations.
6. Mobile : Plus, choix d'une destination, fermeture du panneau ; verifier qu'aucun
   element du menu ne devient inaccessible au clavier.

## Limites conservees et non revendiquees comme resolues

- Les tests navigateur utilisent des donnees fictives et, pour les ecritures, un
  transport HTTP simule. Aucun test authentifie sur votre Supabase n'a ete execute.
- Les SQL historiques, la securite multi-compte et la concurrence de reservation
  restent a tester sur la base. Le correctif ne certifie pas toute la plateforme.
- Les brouillons de messages restent en memoire de la page : un rechargement complet
  du navigateur ou sa fermeture les perd. Aucun brouillon serveur n'est ajoute.
- Le catalogue conserve la limite historique des offres chargees pour certaines
  facettes et certains tris. Aucun nouveau moteur de recherche serveur n'est livre.
- Les rendez-vous manager conservent leur affichage dedie ; aucune unification
  supplementaire de calendrier ni synchronisation externe n'est annoncee.
- Les feuilles historiques restent presentes pour compatibilite avec les modules.
  La navigation et sa mise en page sont regroupees dans les composants V2.9, sans
  changement destructif du reste de l'application.
- Les incubateurs administrables, les invitations email et les autres demandes
  serveur precedentes non realisees ne deviennent pas disponibles par cette livraison.

Le fichier d'apercu HTML fourni separement est autonome, en lecture seule et sans
cle Supabase. Les noms et chiffres affiches sont fictifs. Il n'est pas necessaire
pour le deploiement GitHub.
