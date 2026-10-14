# Recette V0.8 - Scenarios et criteres d'acceptation

Sur Supabase de recette, creer un administrateur, deux startups A/B, deux prestataires Free/Premium et plusieurs collaborateurs, tous avec des identifiants distincts. Utiliser des donnees fictives et aucun contact prive reel.

| ID | Scenario | Attendu |
|---|---|---|
| UX-01 | Connexion admin/incube/prestataire | Dashboard en page par defaut, indicateurs et rendez-vous visibles selon les droits. |
| UX-02 | Charger logo horizontal puis carre dans deux entreprises | Cadrage harmonise, aucune deformation ni rognage arbitraire, largeur/hauteur uniformes. |
| UX-03 | Charger photo personnelle portrait | Fichier WebP redimensionne a 512 x 512, portrait centre, photo affichee dans l'entete et la fiche. |
| UX-04 | Charger visuel d'offre | Visuel 1200 x 675 centre, rendu uniforme dans le catalogue. |
| DEM-01 | Startup A cree un besoin avec annonce anonyme et competences | Le besoin est publie, l'annonce ne contient pas d'email/telephone/URL/nom startup. |
| DEM-02 | Prestataire Free parcourt la bourse | Alias opaque, titre et description neutres, statut public, pas de nom/UUID personnel de la startup. |
| DEM-03 | Prestataire Premium valide parcourt le meme besoin | Nom de la startup et description detaillee visibles. |
| DEM-04 | Prestataire Free repond au besoin | La startup A voit le nom public du prestataire dans ses dossiers/candidatures. |
| DEM-05 | Membres startup B inspectent besoin prive A | Les informations privees A ne sont jamais retournees. |
| DEM-06 | Startup passe Ouvert => Echanges => Devis recu => En realisation => Termine | Les etapes sont journalisees et partagees dans la bourse. |
| DEM-07 | Startup cloture un besoin comme Sans suite, puis le reouvre | Historique conserve, statut Reouvert et candidature de nouveau autorisee. |
| DEM-08 | Prestataire repond a un besoin termine | La fonction RPC refuse la nouvelle candidature, y compris via appel direct. |
| DEM-09 | Prestataire Free teste un acces direct sur `projets`, `conversations_ec`, `messages_ec`, `opportunites_ec`, `reservations_rdv` | Aucune identite de la startup ni contenu personnel en lecture brute. |
| DEM-10 | Message startup avec email/URL/telephone vers un prestataire Free | Refus; message historique identifiant masque a la lecture. |
| RDV-01 | Prestataire propose un creneau 30 minutes | Creneau visible avec entreprise, intervenant, date et modalite; double chevauchement refuse. |
| RDV-02 | Startup reserve avec un objet + un besoin | Rendez-vous confirme; startup voit prestataire/expert, date, objet; statut du besoin devient RDV planifie. |
| RDV-03 | Prestataire Free consulte son rendez-vous | Date, objet, alias anonyme stable (aucune identite startup). |
| RDV-04 | Prestataire Premium consulte son rendez-vous | Nom du demandeur visible. |
| RDV-05 | Deux collaborateurs de la meme startup consultent l'agenda | Rendez-vous de l'entreprise visibles; les autres startups ne les voient pas. |
| RDV-06 | Deux startups reservent en meme temps le meme creneau | Une seule reservation confirme, l'autre erreur lisible. |
| RDV-07 | Annuler un rendez-vous moins de 24 h avant | Motif obligatoire, notification in-app, possibilite de reserver un creneau libere. |
| RDV-08 | Telecharger un ICS | Debut/fin en UTC, titre et motif conformes a la visibilite du compte. |
| SEC-01 | Collaborateur retire de l'entreprise A | Aucun acces aux anciens dossiers ou rendez-vous d'A via la nouvelle RPC. |
| SEC-02 | Revalidation sur version SQL et Next.js | Tests, typecheck et build passent sur l'environnement de recette avant publication. |

## Verification manuelle des permissions

Les diagnostics SQL executes dans SQL Editor avec `postgres` ne simulent PAS une session utilisateur Supabase : ils valident seulement schema et fonctions. Tester les controles d'acces avec des JWT distincts via l'application et des tests d'integration, jamais avec la seule session superutilisateur du SQL Editor.

## Tests restant a automatiser

- Tests RLS pgTAP pour trois roles et deux entreprises, y compris les chemins de lecture indirects.
- Tests Playwright multi-session sur la prise de rendez-vous concurrente, l'anonymat, le partage interne et la reouverture.
- Tests de charge et accessibilite clavier.

Un deploiement Netlify `Published` ne prouve pas ces tests fonctionnels.
