# Correctif du deploiement Cloudflare Workers — 21/10/2026

## Diagnostic du journal communique

Le build a installe les dependances et transfere les assets, mais a ete refuse par l'API Cloudflare avec le code 100324 : une regle de public/_redirects provoquait une boucle infinie.

**Regle precedente (invalide pour ce deploiement)** :

    /* /index.html 200

**Correction livree** : public/_redirects ne contient plus aucune regle, seulement un commentaire. Le repli SPA est desormais declare explicitement dans wrangler.jsonc : `assets.not_found_handling: "single-page-application"`.

## Fichiers modifies

- `public/_redirects` : neutralisation de la redirection fautive.
- `wrangler.jsonc` : configuration statique Workers, nom `crm-light`, dossier `./public`, fallback SPA.
- `package.json` : version fixe de Wrangler et scripts predictibles.
- Documentation de deploiement mise a jour.

**Aucun fichier applicatif HTML, CSS ou JavaScript n'a ete modifie. Aucune migration Supabase.**

## Mise en ligne depuis GitHub / Workers

1. Sauvegarder l'etat actuel du depot GitHub.
2. Remplacer les fichiers du depot par ceux de cette archive, y compris `public/_redirects` : la ligne fautive doit disparaitre dans GitHub. Verifier la presence de `wrangler.jsonc` et `package.json` a la racine du depot.
3. Dans Cloudflare, conserver le projet Worker existant `crm-light` connecte a ce depot.
4. Conserver la commande de deploiement `npx wrangler deploy` ou utiliser `npm run deploy`. La commande de build peut rester vide pour les assets statiques ; si une commande est imposee, utiliser `npm run check`.
5. Relancer le deploiement GitHub et verifier qu'il ne contient plus l'erreur `Invalid _redirects configuration`.
6. Tester la connexion Supabase, la navigation et les vignettes en navigateur avant de considerer la mise en production validee.

## Controle rapide

- `public/_redirects` commence par `#` et n'a aucune regle active.
- `wrangler.jsonc` contient `"directory": "./public"` et `"not_found_handling": "single-page-application"`.
- `package.json` contient `wrangler` en dependance de developpement.
- `npm run check` verifie les syntaxes JS.

Documentation Cloudflare : https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/

## Limites

La correction cible exactement le blocage 100324. Elle ne constitue pas une preuve que le deploiement distant et les acces Supabase fonctionneront : ces verifications restent a faire sur le compte Cloudflare de production.
