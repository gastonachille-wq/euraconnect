# Installation EURACONNECT V0.4

## Avant tout

- Réaliser une sauvegarde et utiliser un environnement Supabase de recette.
- Vérifier que les migrations `202610140001_core.sql` et `202610140002_modules.sql` ont déjà été appliquées.
- **Ne pas rejouer les migrations précédentes.**

## Supabase

1. Exécuter `supabase/migrations/202610140003_intermediation.sql` dans SQL Editor.
2. Vérifier `select count(*) from public.competences_ec;` (9 compétences de démarrage).
3. Tester avec deux comptes réels de recette, un incubé et un prestataire validé.
4. Activer la publication Realtime de `public.messages_ec` si souhaité : `alter publication supabase_realtime add table public.messages_ec;` (une seule fois). Sans publication, les messages restent consultables après nouvelle sélection de conversation.

## GitHub et Netlify

1. Mettre les fichiers V0.4 dans le dépôt `euraconnect` sur une branche de recette, puis fusionner dans `main` après vérification.
2. Garder les variables Netlify publiques déjà configurées : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Déployer via GitHub sur Netlify. Aucune nouvelle clé secrète.
4. Vérifier la navigation « Intermédiation & messages ».

## Scénario de recette

1. Prestataire validé : sélectionner 2 compétences et enregistrer.
2. Incubé : créer un besoin via « Mes demandes ». Copier l'UUID du projet depuis Table Editor pour la recette, puis affecter les compétences dans « Intermédiation & messages ».
3. Prestataire : chercher ses besoins ; le score correspond aux tags communs et au texte.
4. Répondre au besoin via « Besoins ouverts ». Vérifier que l'identité reste masquée côté incubé.
5. Incubé : demander une mise en relation. Prestataire : accepter dans « Mon activité ».
6. Chaque partie : cliquer « Actualiser mes conversations acceptées », ouvrir la relation et échanger des messages.
7. Déclarer l'opportunité comme « Rendez-vous » puis « Mission concrétisée ». Vérifier les droits d'un troisième compte.

## Périmètre non livré

Le matching V0.4 est à base de tags et de texte littéral, pas un moteur sémantique complet. Pas de campagnes email, invitations automatiques, matching IA, abonnement Stripe, visibilité Pro/Premium complète, stockage des pièces jointes, événements, équipes, calendrier avancé ni antivirus. Un contrôle fonctionnel et sécurité approfondi reste nécessaire avant mise en production.
