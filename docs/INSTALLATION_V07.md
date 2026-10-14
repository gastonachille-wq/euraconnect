# EURACONNECT V0.7 - Installation incrementalement et sans perte

## Prealables

- La version V0.6 est deja installee et ses migrations 001 a 005 ont reussi.
- Le compte administrateur et au moins deux comptes de test sont disponibles.
- Une sauvegarde de la base et un point de retour arriere du depot Git sont disponibles.
- Preferer un projet Supabase de recette avec une branche Netlify de preproduction.
- Ne JAMAIS publier de cle service_role sur GitHub ou dans les variables publiques Netlify.

## 1. Migration Supabase

Dans Supabase > SQL Editor > New query, coller **uniquement** le contenu de :

`supabase/migrations/202610140006_collaboration_dossiers.sql`

Verifier l'absence d'erreur SQL. Ne relancer ni 001, ni 002, ni 003, ni 004, ni 005.
Le message `Success. No rows returned` est normal, mais ne prouve pas a lui seul
que chaque regle fonctionnelle marche.

La migration :

1. ajoute les tables `ec07_assignations` et `ec07_historique_dossiers` ;
2. active la RLS, refuse les ecritures directes et installe des RPC transactionnelles ;
3. partage les dossiers via les entreprises et leurs memberships actifs ;
4. preserve les conversations historiques mais remplace les anciennes politiques
   de lecture pour retirer l'acces aux personnes detachees ;
5. corrige certaines RPC historiques qui etaient trop liees au createur initial.

## 2. Diagnostics

Dans SQL Editor, executer :

`supabase/tests/v07_diagnostics.sql`

Attendre la notice `EURACONNECT V0.7 : structure, permissions...` et la ligne `v07_ok`.
Ensuite, en environnement de recette :

`supabase/tests/v07_smoke_acces.sql`

Il simule un identifiant d'utilisateur fictif non habilite et verifie le refus de
consulter ou creer un dossier. Il n'insere aucune donnee et termine par ROLLBACK.

## 3. GitHub et Netlify

1. Decompresser `EURACONNECT_V07_DOSSIERS_PARTAGES.zip`.
2. Copier le contenu a la racine de `gastonachille-wq/euraconnect`.
3. Conserver les variables d'environnement deja configurees :
   `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Verifier la configuration `postcss.config.mjs` (`plugins: []`).
5. Commit sur une branche de recette; attendre la verification GitHub Actions.
6. Sur Netlify, verifier le build `npm run build` et les Deploy Previews.
7. Ne fusionner en production qu'apres les tests de la section suivante.

## 4. Recette indispensable

Voir `docs/RECETTE_V07.md`. Scenarios prioritaires :

- Entreprise prestataire avec un proprietaire et un gestionnaire : le gestionnaire
  retrouve les candidatures existantes et peut repondre a une mise en relation.
- Entreprise startup avec fondateur et gestionnaire : les deux voient les memes
  besoins et candidatures, sans afficher l'identite d'un candidat anonyme avant accord.
- Un collaborateur non assigne voit la conversation en lecture seule.
- Apres attribution, il peut envoyer un message et mettre a jour l'opportunite.
- Apres desactivation de son rattachement, ce collaborateur ne peut plus lire
  ni envoyer de message, meme via un ancien URL ou une vieille fonction RPC.
- Une entreprise ne peut ni lire les dossiers ni envoyer des messages de sa voisine.
- Deux reponses concurrentes avec le dernier quota ne doivent pas toutes passer.

## 5. Limites et precautions

- Pas d'envoi d'email : l'envoi transactionnel attend un SMTP dedie.
- Les documents joints et images des candidatures ne sont pas disponibles dans
  la boite de dossiers V0.7; les textes de candidature sont presents.
- Pas de contrat ou paiement de prestation par EURACONNECT.
- Le statut d'opportunite est **partage entre les deux parties**, comme en V0.4.
- Les notes de l'historique de dossier sont internes a chaque entreprise.
- Les pages historiques V0.4/V0.6 restent presentes pour compatibilite;
  l'interface de reference pour les dossiers multi-comptes est `Dossiers partages`.

## Retour arriere

Si l'interface ne fonctionne pas, redeployer le commit V0.6 sur Netlify.
La migration V0.7 ne supprime pas les tables historiques, mais elle modifie les
politiques RLS et les anciennes RPC : **un retour arriere du frontend n'annule
PAS ces modifications**. Ne pas inverser la migration en production sans
sauvegarde, controle des dependances et procedure SQL revue.
