# EURACONNECT v0.3 — Mise à jour sans réinitialisation

## Pré-requis
- Le déploiement v0.2.1 fonctionne (connexion et Administration opérationnelles).
- L'archive doit être utilisée comme **racine du dépôt GitHub**.
- La migration initiale `202610140001_core.sql` est **déjà installée**.

## Ordre d'installation
1. Dans Supabase > SQL Editor, lancer **uniquement** `supabase/migrations/202610140002_modules.sql`.
2. Vérifier l'absence d'erreurs. Ne relancez PAS la migration initiale en production.
3. Sauvegarder les changements dans la branche `main` du dépôt GitHub utilisé par Netlify, sans charger `.env` ni secret.
4. Sur Netlify, vérifier `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (valeur publique legacy anon correspondant au même projet Supabase).
5. Attendre `Published`, puis se déconnecter et reconnecter.
6. Ouvrir le menu **Services & rendez-vous**.

## Test de recette
- Admin : chiffres du cockpit issus de `indicateurs_admin()` ; consulter les notifications.
- Prestataire **validé** : publier une offre via « Mon activité », créer un avantage incubé sur cette offre ; proposer un rendez-vous à J+1 minimum.
- Incubé : vérifier la présence de l'avantage, réserver un rendez-vous. Une deuxième réservation du même créneau doit échouer.
- Vérifier le rôle : prestataire ne réserve pas un rendez-vous incubé ; incubé ne publie pas un avantage.
- La révélation d'identité Free continue de passer exclusivement par la mise en relation existante.

## Portée / limites
Modules effectivement codés : avantages réservés aux incubés, rendez-vous individuels ponctuels avec réservation atomique, notifications in-app basiques, indicateurs administrateur agrégés. Aucune modification destructive des tables antérieures.

Non livrés dans cette étape : Stripe, emailing transactionnel, .ics, rappels automatiques, créneaux récurrents, événements et leurs QR codes, messagerie temps réel, rôles projet multiples, contrôle antivirus, invitations automatisées, fichiers d'export RGPD, MFA obligatoire, tests automatisés RLS et Playwright complets. **Ne pas considérer cette livraison comme une V2 intégralement opérationnelle ou prête pour des données personnelles de production.**

Le SQL a été écrit pour le schéma v0.2 ; exécuter d'abord sur un clone de recette. Tester les politiques RLS avec des comptes de chaque rôle.
