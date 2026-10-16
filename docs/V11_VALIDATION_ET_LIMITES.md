# EURACONNECT 1.1 — Verification et limites

## Architecture conservee

- Frontal TypeScript compile en HTML/CSS/JavaScript statique.
- Cloudflare Worker Static Assets, configuration explicite `wrangler.jsonc`.
- Supabase Auth, RPC et regles de confidentialite heritees de V1.0.
- Aucune nouvelle librairie, table ou fonction SQL. Aucune migration 1.1.

## Controles effectivement executes en local

- `npm run check` : typecheck TypeScript, **44 tests Node**, compilation des fichiers statiques, sans erreur.
- Navigations navigateur automatisées sur donnees fictives : **46 controles**, quatre profils, versions desktop et mobile ; aucune erreur JavaScript et aucun debordement horizontal sur les vues controlees.
- Parcours d'actions navigateur avec API Supabase **simulee** : **8 tests**, notamment favoris, filtrage besoin, creation et conversion du budget, decision incubee, message, brouillon preserve, acces aux disponibilites, menu mobile.
- Parcours additionnels de l'apercu : choix automatique de la startup manager, lien direct vers les propositions, anonymisation apparente des fiches pour un prestataire gratuit.
- Apercu HTML autonome genere depuis les sources TypeScript avec donnees fictives en lecture seule.

Les details sont dans `docs/previews/browser-test-results.json` et `docs/previews/interaction-test-results.json`.

## Limites importantes

Ces tests **ne sont PAS** une recette Supabase reelle : aucune nouvelle requete ou politique SQL n'a ete executee sur la base de l'utilisateur, aucun acces distant a son compte n'est disponible ici. Ils ne prouvent donc ni la reussite de tous les droits Premium dans la base actuelle, ni celle des inscriptions et reservations de bout en bout. Ces points doivent etre testes apres mise en ligne avec des comptes reels de test.

Les 44 tests Node couvrent un melange de logique et de controles de structure, pas 44 parcours complets en base de donnees.

L'aperçu fictif n'enregistre aucune information dans Supabase. Ne pas confondre cet apercu et l'application deployee.

## Hors perimetre intentionnel

Pas d'email transactionnel ajoute, de messagerie WebSocket, de calendrier Google/Microsoft connecte, de paiement, de moteur de recherche tiers, d'infrastructure serveur supplementaire ou de modification du modele de donnees. Il faudra confirmer les futurs besoins a partir des usages reels de V1.1.
