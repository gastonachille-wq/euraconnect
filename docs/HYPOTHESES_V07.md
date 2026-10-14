# Hypotheses et arbitrages V0.7

H07-1. La V0.6 est le point de depart. Les migrations 001-005 sont deja installees.
H07-2. `organisations` reste la structure d'incubation; `entreprises_ec`
        represente les societes utilisatrices.
H07-3. Une entreprise peut avoir plusieurs comptes, et un compte peut avoir
        plusieurs entreprises. Chaque action V0.7 porte un `p_entreprise` explicite.
H07-4. Les proprietaires et gestionnaires disposent des droits d'ecriture
        commerciale; les collaborateurs peuvent envoyer des messages et faire
        evoluer l'etape commerciale sur les dossiers attribues, mais ne peuvent
        ni publier ni candidater.
H07-5. Tous les collaborateurs actifs peuvent lire les dossiers commerciaux de
        leur entreprise. A valider avec la politique de confidentialite interne
        de chaque entreprise avant ouverture a des partenaires externes.
H07-6. Les profils d'admin ne lisent pas automatiquement les conversations.
H07-7. Les candidatures restent anonymes jusqu'a une relation acceptee; l'acces
        Pro/Premium n'est PAS simule comme un abonnement paye sans integration Stripe.
H07-8. Une seule assignation active par entreprise et candidature.
H07-9. Le statut CRM est commun aux deux entreprises (V0.4), pas propre a chacune.
H07-10. Les nouveaux besoins sont crees au nom d'une startup rattachee et
         l'auteur physique reste enregistre dans `incube_id`.
H07-11. Les donnees d'authentification et les emails ne sont jamais envoyes
         dans l'annuaire ni dans les resultats de listing commercial.
H07-12. L'historique des actions internes est separate entre entreprise startup
         et entreprise prestataire. Les messages restent communs aux deux parties.
H07-13. La V0.7 ne facture pas les prestations et n'envoie pas d'emails.
H07-14. Le WYSIWYG existant est conserve, mais un assainissement serveur HTML
         independant du client est encore requis avant ouverture generale.
H07-15. Une migration additive peut cependant modifier la securite et les RPC;
         sa validation en recette est obligatoire.
