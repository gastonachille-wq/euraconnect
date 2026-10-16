# EURACONNECT 2.0 — Pilotage, accompagnement, mise en relation

**Socle conservé** : TypeScript statique, Supabase Auth et PostgreSQL, déploiement Cloudflare Worker via Wrangler. Aucun nouveau framework ni service payant.

## Les évolutions livrées

1. **Manager – cockpit** : portefeuille classé par urgence, compteurs de demandes sans proposition et d'actions échues, accès direct aux demandes, journal de suivi et ateliers.
2. **Incubé – demande d'aide** : bouton sur la page de sa demande ; génère une action de suivi à deux jours et notifie les managers réellement affectés à la startup.
3. **Manager – recommandation** : choix d'une demande et d'un prestataire validé, justification, enregistrement dans une table privée, notification des membres actifs de la startup.
4. **Incubé – recommandation reçue** : cartes dédiées sur son tableau de bord, contexte, motif, lien vers la fiche d'entreprise et vers la demande. Le choix du prestataire reste exclusivement celui de l'incubé.
5. **Design métier V2** : hiérarchie visuelle du cockpit, étapes du cycle d'accompagnement, statut nommé + couleur, responsive mobile.

## Prérequis obligatoires

- Avoir appliqué la migration V1.2 `06_V12_PROFILS_AGENDA_ANNUAIRE.sql`.
- Exécuter **une seule fois** `supabase/07_V20_MANAGER_RECOMMANDATIONS.sql` dans SQL Editor, après sauvegarde. **Le fichier n'a pas été exécuté sur la base réelle**.
- Pousser ensuite les sources V2 à la racine GitHub, sans placer de dossier parent supplémentaire.
- Cloudflare : **Build command** `npm run check`, **Deploy command** `npx wrangler deploy`, variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` conservées.

## Recette métier conseillée

- Affecter via l'admin une startup à un manager.
- Connecter l'incubé, ouvrir une demande publiée, cliquer « Solliciter mon Startup Manager » et envoyer un message de 15 caractères ou plus.
- Connecter le manager : vérifier la notification, le compteur d'action à échéance et le journal de la startup.
- Recommander une entreprise prestataire publiée et validée. La même entreprise ne doit pas créer deux recommandations distinctes pour une même demande et un même manager.
- Reconnecter l'incubé : voir la recommandation dans le tableau de bord et dans les notifications ; ouvrir l'entreprise recommandée.
- Tester un autre manager non affecté : il ne doit pouvoir ni lire les recommandations du portefeuille ni en créer.
- Tester un prestataire gratuit : il ne doit obtenir aucun accès au cockpit ni à l'identité protégée de la startup.

## Limites explicitement non résolues

- La migration V2 n'a **pas été exécutée sur une base Supabase PostgreSQL réelle** ici.
- Les contrôles navigateur locaux sont bloqués par la politique de l'environnement, donc pas de validation du rendu visuel final en Chromium.
- Le moteur existant de propositions, réservations, messagerie et annuaire est préservé ; ces modules ne sont pas entièrement refondus dans cette release.
- Une recommandation du manager **n'est pas** une proposition commerciale, un rendez-vous ou une introduction automatique ; l'incubé reste décisionnaire.
- Le référencement de prestataires est limité aux 100 premières fiches renvoyées par la requête annuaire. Une recherche paginée est un axe de version suivante.
