# EURACONNECT V0.6 - Installation sans perte de donnees

## Ce que change cette version

- L'authentification, la base de donnees et l'administration V0.5 sont conservees.
- Les structures d'incubation (`organisations`) restent distinctes des entreprises utilisatrices (`entreprises_ec`).
- Les prestataires existants sont convertis en entreprises rattachees a leur compte proprietaire.
- Un compte peut appartenir a plusieurs entreprises (table `entreprise_membres_ec`), avec une entreprise principale (`profiles.entreprise_id`).
- Les utilisateurs `incube` peuvent creer une fiche entreprise de type startup.
- Les responsables d'entreprises peuvent modifier leur fiche, ses competences et ses visuels.
- L'administrateur rattache par email un compte **deja cree** a une entreprise.
- Un annuaire unifie permet la recherche d'entreprises et personnes par mots-cles, type, competences.
- Les personnes choisissent si elles apparaissent dans l'annuaire; aucun email n'y est expose.
- Le texte enrichi est disponible pour les offres, besoins, entreprises et personnes.
- Les images sont publiees dans un bucket dedie, limite a 2 Mo et a PNG/JPG/WEBP.

## Ordre d'installation obligatoire

### 0. Preparer

1. Sauvegarder le projet Supabase et les fichiers de la version V0.5.
2. Tester de preference sur un projet Supabase de recette et un deploy preview Netlify.
3. Verifier que les migrations 001, 002, 003 et 004 sont deja appliquees.
4. **Ne pas reexecuter les anciennes migrations et ne pas supprimer les tables existantes.**

### 1. Migration SQL

Dans Supabase > SQL Editor > New Query, executer **uniquement** :

`supabase/migrations/202610140005_entreprises_annuaire.sql`

Attendre `Success. No rows returned`. Attention: ce message ne remplace pas les verifications ci-dessous.
La migration cree les nouvelles tables, les autorisations RLS, les fonctions RPC et le bucket public `euraconnect-media`.

### 2. Verifications SQL

Executer `supabase/tests/v06_diagnostics.sql` dans SQL Editor.
Le diagnostic verifie la presence des tables, du bucket, des politiques RLS et le rattachement des anciens prestataires.
Tous les prestataires existants doivent avoir une `entreprise_id` non nulle.

### 3. GitHub / Netlify

1. Decompresser l'archive V0.6.
2. Copier **le contenu**, pas le ZIP, dans le depot `gastonachille-wq/euraconnect`.
3. Faire un commit sur une branche de recette puis ouvrir une pull request.
4. Sur Netlify, garder `npm run build` et le dossier `.next`.
5. Garder les variables d'environnement publiques existantes :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Verifier le `postcss.config.mjs` incluant `plugins: []`.
7. Attendre le statut `Published`.

### 4. Premiere recette UI

1. Se connecter avec le compte admin existant : arriver automatiquement sur le **tableau de bord**.
2. Ouvrir **Administration** : verifier la liste historique des utilisateurs.
3. Ouvrir **Administration > Entreprises et collaborateurs** : les prestataires existants doivent etre visibles.
4. Se connecter avec un prestataire deja valide et ouvrir **Entreprise & profil** : fiche existante visible.
5. Enregistrer sa presentation enrichie et ajouter des competences dans le referentiel.
6. Ajouter un logo PNG/JPG/WEBP; enregistrer la fiche et publier dans l'annuaire.
7. Creer un second compte Auth prestataire via Supabase Auth; depuis Administration, le rattacher a la meme entreprise en `gestionnaire`.
8. Se connecter avec ce gestionnaire : il retrouve la fiche entreprise et peut publier une nouvelle offre (quota du plan applicable).
9. Publier une fiche personnelle opt-in et la retrouver dans l'annuaire.
10. Tester une offre enrichie et y ajouter une image depuis **Mon activite**.
11. Refaire un test de besoin et de candidature avec le compte proprietaire, verifier l'absence de regression V0.4.

## Regles de gestion de la V0.6

- **Entreprise et personne sont deux fiches distinctes** : les competences ne sont pas automatiquement identiques.
- Une entreprise publiee apparait dans l'annuaire. La personne doit aussi activer `visible` et etre rattachee a une entreprise publiee.
- Une entreprise prestataire ne peut etre publiee avant validation administrative de son prestataire.
- Une startup creee par un incube commence en brouillon, puis est publiee par son proprietaire.
- Les collaborateurs ayant le role `gestionnaire` peuvent modifier la fiche et creer des offres.
- Le `collaborateur` simple voit la fiche et son equipe, sans gerer les donnees d'entreprise.
- L'administration peut rattacher un compte existant et actif par email, sans exposer les emails dans l'annuaire.
- Les candidatures, conversations et reservations historiques **restent attribuees au proprietaire historique** du prestataire. La delegation multi-utilisateurs de ces flux est a programmer avant le deploiement multi-collaborateurs complet.
- Les images televersees sont **publiques**; ne pas utiliser pour des documents confidentiels.

## Limites techniques a connaitre

- Le projet n'a pas ete compile sur ce poste car l'installation npm est bloque par l'acces reseau. Executer `npm install`, `npm run typecheck` et `npm run build` avec Netlify ou en local.
- Le WYSIWYG utilise un editeur natif `contentEditable` sans nouvelle dependance npm, avec une liste blanche HTML a l'affichage. Il ne remplace pas encore un editeur collaboratif complet ni une sanitation independante cote serveur.
- Aucune analyse antivirus des images; le bucket limite taille et types MIME, mais un controle serveur supplementaire est conseille avant ouverture a grande echelle.
- Les invitations automatiques et les emails transactionnels restent suspendus tant qu'aucun service SMTP adapte n'est configure.
- Le rattachement admin d'un utilisateur par email est reserve aux comptes existants; ce n'est pas un parcours d'invitation/acceptation.
- Pas de suppression/cascade d'entreprises depuis l'interface; le support de transfert des comptes proprietaires reste a implementer.
- Stripe, les evenements et la conformite RGPD approfondie demeurent hors de cette V0.6.

## Retour arriere

Si le frontend rencontre une erreur, redeployer le commit V0.5 sur Netlify.
La migration V0.6 etant additive, le code V0.5 continuera a lire ses anciennes tables.
**Ne pas supprimer les tables V0.6 ni chercher a reexecuter l'ancienne migration en sens inverse** sans sauvegarde et analyse de dependances.
