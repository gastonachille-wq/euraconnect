# Installation EURACONNECT V0.8

## 0 - Prerequis

- Version V0.7 migree dans le meme projet Supabase (fichiers `000001` a `000006`).
- Un environnement Supabase de recette, un site Netlify de recette, et un acces au depot GitHub.
- Votre compte administrateur V0.7 reste conserve.
- La politique V0.8 modifie intentionnellement les droits de lecture : NE PAS lancer directement sans sauvegarde ni test sur le seul projet utilise en production.

## 1 - Sauvegarder

- Conserver un snapshot/restauration du projet Supabase selon votre plan.
- Exporter une copie de chaque table metier si aucun outil de sauvegarde restaure n'est disponible.
- Conserver un commit git / un deploiement Netlify V0.7 reactivable.

## 2 - Supabase

Dans SQL Editor, executer le contenu COMPLET du fichier :

`supabase/migrations/202610140007_experience_confidentialite.sql`

Ceci cree / met a jour : `projets` (annonce publique anonymisee, statut, alias aleatoire), `ec08_historique_besoins`, rendez-vous contextuels, RPC de lecture controlees et politiques RLS. Il n'efface aucune ligne metier. Les annulations historiques sont conservees, et une reservation annulee ne bloque plus definitivement son creneau.

La migration est transactionnelle. En cas d'echec, noter la PREMIERE erreur Supabase et ne pas poursuivre avec le frontend. Ne pas relancer les migrations anciennes.

## 3 - Diagnostic sans modification

Executer `supabase/tests/v08_diagnostics.sql` dans SQL Editor et conserver les resultats. Le diagnostic ne modifie pas les donnees. Un resultat `manquant` signifie que le deploiement SQL n'est pas complet.

## 4 - Frontend Netlify

- Sur une branche `release/v08-ux` de GitHub, remplacer/ajouter les fichiers du ZIP a la racine du projet.
- Verification recommandee : `npm ci` si un `package-lock.json` est present, sinon `npm install`, puis `npm run typecheck`, `npm run verify:v08`, `npm run build`.
- Verifier que Netlify integre les deux variables existantes `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Valider `Published` sur le site de recette et tester les comptes.
- Fusionner vers la production apres validation des scenarii de `RECETTE_V08.md`.

## 5 - Cas metier essentiels

- Compte startup : creer un besoin via **Mes demandes**, ajouter une annonce anonymisee, competences, consulter les candidatures sous le vrai nom du prestataire, modifier un statut et son historique.
- Compte fournisseur Free : consulter la bourse, voir alias et resume neutre, candidater, lire une conversation sans identite startup et sans UUID auteur brut.
- Compte fournisseur Premium de recette : lire le nom startup et details du besoin, sans changer l'identite des prestataires affichee a la startup.
- Rendez-vous : un prestataire propose une disponibilite; une startup reserve avec motif et peut obtenir un ICS; les gestionnaires startup voient les rendez-vous de leur entreprise. Les statuts associes au besoin passent a `rdv_planifie` a la reservation.
- Image : televerser un logo horizontal/vertical et une photo de profil, verifier que chaque rendu utilise la bonne forme et enregistrer la fiche.

## 6 - Cas limites et plan de retour

Une migration RLS ne se traite pas comme une mise a jour purement visuelle. En cas de regression, ne pas revenir simplement au frontend V0.7 en conservant la migration V0.8 : restaurer la base a partir d'une sauvegarde validee, ou appliquer un correctif de politiques prepare et audite. Avant production, definir une fenetre de maintenance et bloquer les nouvelles candidatures/reservations pendant la bascule, si necessaire.

La configuration email reste soumise aux limites Supabase Auth. Cette livraison ne met pas en place SMTP/Stripe.
