# EURACONNECT V0.8 - Experience utilisateur et confidentialite

Cette livraison met a jour V0.7, sans reinitialiser les comptes, les entreprises ou les dossiers.

## Fonctions ajoutees et corrigees

- Tableau de bord d'accueil avec indicateurs et rendez-vous, navigation plus compacte.
- Logos des entreprises uniformises : apercu a proportions constantes et `object-fit: contain`.
- Photo personnelle : rendu carre `object-fit: cover`, recadrage centre et televersement WebP.
- Visuels des offres : format 16:9 normalise.
- Calendrier : interlocuteur prestataire, intervenant, date, heure, objet, mode, lieu/lien apres reservation, statut, annulation et export ICS.
- Gestion des rendez-vous de l'entreprise : acces partage aux membres autorises de la startup et du prestataire.
- Confidentialite ASYMETRIQUE : la startup voit le nom du prestataire dans sa candidature ; le prestataire Free/Pro ne voit pas l'identite du demandeur, meme apres acceptation ; Premium la voit.
- Le fournisseur Free/Pro voit un alias opaque et aleatoire pour distinguer les besoins et les rendez-vous.
- Statuts de suivi du besoin : ouvert, en_echanges, rdv_planifie, devis_recu, en_realisation, termine, en_pause, sans_suite, reouvert.
- Historique detaille des changements de statut pour la startup ; statut visible dans la bourse pour les membres connectes.
- Les anciens besoins conservent leurs donnees privees et affichent par defaut une annonce generee neutre aux non Premium. L'incube peut remplacer l'annonce anonyme.

## Important

1. La migration V0.8 change les droits RLS sur `projets`, `messages_ec`, `conversations_ec`, `opportunites_ec`, `reservations_rdv` et `disponibilites_rdv` : tester en recette avant production.
2. La valeur Premium provient du champ `prestataires.plan_code`; aucun paiement Stripe n'est active, ne pas promouvoir manuellement des utilisateurs sur une base de production sans controle.
3. Le filtrage automatique de noms et coordonnees dans le texte reste imparfait : relecture/moderation recommandee pour les contenus publics.
4. Les images `euraconnect-media` sont accessibles par URL publique. Utiliser des images pour lesquelles une publication est autorisee.
5. Le fichier ICS est telechargeable, mais les invitations par email et synchronisations Google/Outlook ne sont pas implementees dans cette livraison.
6. Les changements SQL et le nouveau frontend doivent etre deployes de maniere coordonnee : l'ancien frontend V0.7 ne fonctionne pas integralement avec les nouvelles RLS.
7. L'analyse syntaxique des fichiers TypeScript a ete executee. Le build Next.js complet et les tests sur la base du client doivent etre valides en recette.

## Ordre de deploiement

1. Sauvegarder les donnees et conserver le commit V0.7 comme point de retour.
2. Appliquer `supabase/migrations/202610140007_experience_confidentialite.sql` sur un projet Supabase de recette apres V0.7.
3. Executer `supabase/tests/v08_diagnostics.sql`, puis suivre `docs/RECETTE_V08.md`.
4. Deployer ce repertoire sur Netlify avec les variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY existantes.
5. Tester 3 comptes (incube, prestataire Free, prestataire Premium de recette) et 2 entreprises pour verifier l'absence de fuite d'identite.
6. Valider seulement ensuite un deploiement en production, avec plan de retour arriere si necessaire.

Voir `docs/INSTALLATION_V08.md`, `docs/HYPOTHESES_V08.md`, `docs/RECETTE_V08.md`.
