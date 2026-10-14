# EURACONNECT V0.5 — Cockpit comptes utilisateurs

## Inclus
- Consultation de `auth.users` via RPC `SECURITY DEFINER` réservée à l’admin authentifié, sans clé secrète côté client.
- Liste paginée, recherche email/nom, filtres rôle/statut, confirmation email et dates.
- Modification de rôle et suspension/activation avec vérifications SQL, audit, protections anti-auto-rétrogradation et dernier administrateur.
- Réparation explicite des profils manquants.
- Correction du clic inscription V0.4.3 incluse dans `app/page.tsx`.

## Installation
1. Sauvegarder la base et tester en préproduction.
2. SQL Editor : exécuter **seulement** `supabase/migrations/202610140004_admin_utilisateurs.sql`.
3. Déployer le contenu complet de l’archive sur une branche de recette GitHub, puis Netlify.
4. Connexion admin > Administration > Comptes utilisateurs Supabase.
5. Tester lecture, recherche, mise à jour d’un compte de test et refus avec compte non-admin.

## Non inclus
- Invitations automatiques : SMTP dédié et envoi contrôlé à développer.
- Suppression de comptes Auth, impersonation, réinitialisation de mots de passe par admin, modération complète.
- Tests d’intégration Supabase réels : à exécuter dans ton environnement.

## Sécurité
La RPC lit `auth.users` uniquement sous contrôle `est_admin()` ; le `service_role` n’est jamais livré au navigateur. La visibilité des nouveaux statuts dans d’autres onglets peut nécessiter une actualisation.
