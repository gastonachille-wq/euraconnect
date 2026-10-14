# Déployer EURACONNECT sur tes comptes Supabase et Netlify

## Prérequis
- Un projet Supabase et un site Netlify (à créer dans tes comptes existants).
- Node.js 22 et npm, un dépôt Git (GitHub recommandé).
- Ne jamais transmettre de mot de passe, clé `service_role` ni secret Stripe.

## 1. Créer/configurer Supabase
1. Créer un projet Supabase dans une région UE et noter `Project URL` et la clé publique `anon` ou publishable key.
2. Dans **SQL Editor**, exécuter `supabase/migrations/202610140001_core.sql` en une seule fois. Si un message d'erreur apparaît, ne pas enchaîner les étapes : noter l'erreur exacte.
3. Dans **Authentication > Providers > Email**, activer email/password, confirmation email et SMTP adapté avant lancement public.
4. Dans **Authentication > URL Configuration**, configurer l'URL du site Netlify sous **Site URL**, et ajouter `https://TON-SITE.netlify.app/**` dans Redirect URLs, ainsi que l'URL de développement `http://localhost:3000/**`.
5. Créer ou inviter votre utilisateur dans **Authentication > Users**. Confirmer son email.
6. Modifier `supabase/BOOTSTRAP_ADMIN.sql` en remplaçant `ADMIN_EMAIL@EXEMPLE.FR` par votre adresse ; exécuter le script dans SQL Editor. **Ne pas créer un admin en modifiant le rôle depuis le navigateur.**
7. La MFA est prévue dans le cahier des charges mais **n'est pas encore imposée dans cette livraison**. Restreindre le déploiement aux utilisateurs de recette jusqu'à son implémentation.

## 2. Préparer localement
```bash
cp .env.example .env.local
npm install
npm run dev
```
Renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` avec les valeurs **publiques** de Supabase. Les deux variables sont destinées au navigateur ; la sécurité repose sur RLS/RPC. Ne pas mettre la clé `service_role` dans Netlify.

## 3. Mettre en ligne Netlify
1. Placer ce projet dans un dépôt GitHub privé.
2. Dans Netlify : **Add new project > Import an existing project** puis sélectionner le dépôt.
3. Build `npm run build` ; publish `.next` ; utiliser le runtime Next.js de Netlify.
4. Définir les mêmes variables `NEXT_PUBLIC_*` dans les **Environment variables** Netlify.
5. Lancer le déploiement, ouvrir l'URL générée, puis répercuter cette URL dans Supabase Auth (étape 1.4).
6. Après mise à jour d'une variable publique, relancer le build Netlify.

## 4. Vérifier les premiers parcours
1. Administrateur : se connecter, ouvrir **Administration**, voir la file de validation.
2. Prestataire : inscription, confirmation email, création d'une organisation prestataire, attente de validation.
3. Administrateur : valider ce prestataire.
4. Prestataire : publier une offre ; vérifier sa visibilité dans **Catalogue de services**.
5. Incubé : créer/inviter un utilisateur dans Auth > Users, puis attribuer le rôle `incube` dans **Administration** ; le connecter et publier un besoin.
6. Prestataire : répondre au besoin avec un message sans coordonnées ; vérifier la limitation de 5 candidatures spontanées Free.
7. Incubé : consulter le dossier sous alias, demander la mise en relation.
8. Prestataire : accepter ; l'incubé voit alors le nom public du prestataire.
9. Essayer de lire la table `candidatures` depuis une session incubé ; l'accès direct doit renvoyer zéro ligne.

## 5. Sécurité et limites de cette livraison
- Livraison **de développement/recette** : pas de commercialisation publique, ni de garantie de conformité RGPD ou de sécurité auditée.
- La vérification du contenu libre anonymisé est rudimentaire (regex email/téléphone/URL) et ne protège pas contre les noms de personnes/sociétés inscrits dans le message ; pas de pièces jointes dans les candidatures.
- Pas de facturation Stripe, de fonction d'invitation automatique par email, de rendez-vous, d'événements, de 2FA forcée, d'envoi d'emails applicatifs, de tests E2E ni de pipeline CI encore opérationnels.
- Pas de compatibilité garantie avec d'éventuelles anciennes tables du projet Supabase : **utiliser un nouveau projet** ou une préproduction vide.
- Les suppressions de compte, archivage, référentiels de compétences, avantages incubés et politiques avancées multi-structures seront développés dans les lots ultérieurs.
- Les montants des plans Pro/Premium figurent en base à titre de **valeurs hypothétiques**, mais aucune souscription payante n'est activée.
