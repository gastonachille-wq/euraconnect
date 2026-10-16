# EURACONNECT 1.1 — Parcours prioritaires & ergonomie

**Version Cloudflare Workers / Supabase — application TypeScript statique.**

Cette version ameliore les parcours utilisateur et les composants visuels de la version 1.0 **sans aucune nouvelle table Supabase, aucune nouvelle API et aucune dependance npm**. Les autorisations et les regles Premium restent appliquees par la base Supabase existante.

## Pour mettre a jour la version deja deployee

**Lire d'abord `docs/V11_DEPLOIEMENT_CLOUDFLARE.md`.**

- Conserver le meme depot GitHub `gastonachille-wq/euraconnect` et le meme Cloudflare Worker `euraconnect`.
- Importer les fichiers de cette version dans le depot, en respectant les sous-dossiers. Un ZIP leger de mise a jour est fourni separement.
- Cloudflare reconstruit le site avec `npm run check`, puis `npx wrangler deploy`.
- Les deux variables de **compilation** Cloudflare doivent rester presentes : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **AUCUN SCRIPT SQL a executer pour passer de 1.0 a 1.1.** Ne pas relancer les migrations initiales.

L'URL existante est conservee : https://euraconnect.gaston-achille.workers.dev

## Changements principaux

1. Tableau de bord par profil avec une action prioritaire et des indicateurs navigables.
2. Fiches besoins avec les quatre etapes du parcours, propositions bien visibles, boutons de decision explicites, historique replie.
3. Formulaires de besoin et de reponse restructures en blocs hierarchises et lisibles.
4. Navigation de messagerie qui ouvre automatiquement une conversation existante ; actualisation manuelle protegee contre la perte de brouillon.
5. Portefeuille Startup Manager qui selectionne directement la premiere startup accompagnee.
6. Agenda mobile avec une vue liste par defaut ; ateliers et inscriptions plus explicites.
7. Annuaire et fiches societes/contacts avec visuels harmonises, actions et filtres coherents.
8. Menus, cartes, etats, espaces et couleurs repenses, y compris sur petits ecrans.

Le service est toujours **sans paiement en ligne**. Le Premium ne revele les identites des startups qu'aux prestataires autorises, selon les fonctions serveur historiques ; le front ne peut pas accorder ces droits.

## Ce que cette mise a jour ne fait pas

Pas de push temps reel des messages, pas d'envoi email ajoute, pas de synchronisation Google/Outlook, pas de nouveaux objets Supabase ni de modification des politiques SQL. Voir `docs/V11_VALIDATION_ET_LIMITES.md`.

## Tester le design sans Supabase

Ouvrir `docs/previews/APERCU_INTERACTIF.html` dans le navigateur. Toutes les donnees sont **fictives, en lecture seule**. Cet apercu n'est pas une preuve de fonctionnement sur votre propre base.

## Verifications techniques

```sh
npm ci
npm run check
```

L'archive complete conserve, pour archivage uniquement, la documentation et les SQL de migration **1.0**. **Ne pas les executer lors de cette mise a jour 1.1.**
