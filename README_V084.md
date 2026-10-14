# EURACONNECT V0.8.4

## Fonctionnalités
- Centre de notifications dans l’en-tête avec compteur de non-lues, liste et marquage lu, rafraîchi toutes les 60 secondes. Utilise la table existante `notifications_ec`.
- Favoris privés par utilisateur pour les fiches entreprise/personne, persistés en Supabase.
- Disponibilités consultables dans les fiches entreprises de l’annuaire et réservation directe pour les utilisateurs autorisés. Correspondance des créneaux par nom public de prestataire (limite connue : entreprises avec nom commercial différent).
- Mise en forme compacte des actions dans les fiches.

## Installation
1. Sauvegarder Supabase et exécuter `supabase/migrations/202610140008_favoris.sql`.
2. Déployer le ZIP complet sur GitHub et Netlify.
3. Vérifier les scénarios : notifications, favoris persistants, créneau disponible, réservation incubé, permissions Free/Premium.

## Limites
La recherche des créneaux par nom public du prestataire ne couvre pas toutes les configurations multi-enseignes ; un identifiant d’entreprise exposé par RPC serait préférable. Les notifications reflètent les événements effectivement insérés par les fonctions SQL existantes, pas tous les changements possibles.
