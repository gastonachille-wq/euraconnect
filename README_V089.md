# EURACONNECT 0.8.9 — Modèle Premium prestataire

## Principe commercial
- **Incubés/startups : aucun abonnement Premium.** Ils publient des demandes, reçoivent les réponses et identifient les entreprises prestataires.
- **Prestataires Free/Pro :** consultent les annonces anonymisées (titre, résumé détaillé, budget, compétences, statut), répondent via la plateforme ; le nom et les coordonnées de l'incubé sont masqués.
- **Prestataires Premium :** peuvent découvrir l'identité de la startup, ainsi que le contact commercial qu'elle a **explicitement autorisé** pour le besoin. Sans autorisation, aucune coordonnée n'est donnée.
- L'abonnement est porté par **l'entreprise prestataire**, pas par l'utilisateur individuel. Le Premium n'est pas une condition pour répondre.

## Installation
1. Sauvegarder la base, tester sur un clone de recette.
2. Exécuter **uniquement** `supabase/migrations/202610150013_premium_prestataires.sql` après les migrations jusqu'à V0.8.8.
3. Déployer les fichiers Next.js du ZIP sur une branche GitHub de recette, puis Netlify.
4. Test : compte startup -> « Mes demandes » -> « Gérer le contact Premium » -> saisir un email de contact puis cocher l'accord. Compte prestataire Free -> annonce visible, aucune coordonnée. Compte prestataire Premium valide -> « Voir les coordonnées autorisées ».
5. Refuser le partage depuis le compte startup et vérifier que le Premium n'obtient plus les coordonnées.

## Commercialisation : restant à développer
- Stripe Checkout + webhooks **serveur** validant les abonnements (ne jamais laisser le navigateur s'auto-promouvoir).
- Tarifs réels, justificatifs, CGV, facturation, annulations, essai et renouvellements.
- Dashboard de conversion et quotas applicables selon offre commerciale finale.
- Audit dynamique des RPC historiques pour éliminer d'éventuels autres accès à l'identité hors de `ec08_fil_besoins` : cette migration ne suffit pas à certifier l'ensemble de la confidentialité sur la base existante.

## Validation
- Transpilation syntaxique TypeScript effectuée, vérifications structurelles exécutées.
- La compilation `next build`, l'exécution réelle SQL, les permissions de toutes les anciennes RPC et la recette multi-comptes nécessitent validation sur une installation de recette.
- Aucune activation de paiement n'est présentée comme fonctionnelle.
