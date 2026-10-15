# EURACONNECT V0.9.0 — Premium administré (sans paiement)

## Portée
- Aucun Stripe, aucune facturation, aucun portail de paiement.
- Dans Administration : liste des entreprises prestataires, activation, désactivation, dates de fin facultatives, justification.
- Le droit Premium est contrôlé à chaque requête par Supabase et expire automatiquement à l'échéance.
- Les anciens plans Premium sont repris dans la table de contrôle sans perte. Lors d’une désactivation, le plan Free/Pro antérieur est rétabli si connu.
- Historique via `public.audit_log` avec acteur, entreprise, statut, expiration.
- Les startups/incubés n'ont aucun Premium.

## Installation
1. Sauvegarder la base et tester en environnement de recette.
2. Après la migration `202610150013_premium_prestataires.sql`, exécuter une seule fois `supabase/migrations/202610150014_admin_premium.sql`.
3. Déployer l'intégralité du code V0.9.0 sur la branche de recette GitHub / Netlify.
4. Connecter un administrateur ; ouvrir Administration > Abonnements Premium ; activer un prestataire **validé**.
5. Tester les mêmes besoins depuis le prestataire Free puis Premium ; vérifier les contacts autorisés ; désactiver et vérifier que les accès disparaissent.
6. Tester une date d'expiration courte sur une entreprise de test.

## Limites et vigilance
- Le système ne facture et ne renouvelle rien : l'administrateur décide des activations.
- Une échéance coupe les droits automatiquement, mais le champ `plan_code` peut rester `premium` dans la table historique. Toujours utiliser `ec08_premium_entreprise` pour les vérifications d'accès.
- Certains chemins hérités interrogent directement `plan_code` (notamment les quotas et une politique RLS ancienne). **Un audit d'autorisation de ces chemins reste nécessaire avant déploiement production**, particulièrement pour garantir la révocation complète à l'expiration.
- La migration n'est pas testée sur ta base et le build Next.js complet reste à valider.
