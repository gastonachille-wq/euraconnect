# EURACONNECT - Refonte UX/UI V4 sur moteur 3.6.2

## Perimetre de cette livraison

Cette archive contient le **code source compilable** d'Euraconnect 3.6.2 avec une refonte UX/UI appliquee a l'application reelle, et non une simple maquette HTML.

Elements modifies :
- `public/euraconnect-v4.css` : nouveau systeme visuel responsive (navigation, tableaux de bord, cartes, vues, listes et formulaires). Feuille chargee apres les styles historiques afin de faciliter le retour arriere.
- `public/index.html` : inclusion de la feuille de style V4.
- `src/views.ts` : navigation contextualisee selon le role, actions principales, amelioration du shell.
- `src/experience-v3.ts` : hierarchie des titres du tableau de bord.
- `src/agenda-v12.ts` : classes visuelles de la legende des evenements.
- `scripts/build.mjs` : enumeration recursive des assets, notamment des repertoires `public/data/` et `public/templates/`.
- `tests/v4-design.test.mjs` : verification de contrats de la refonte.

Les roles (incube, prestataire, Startup Manager, admin), les parcours existants et les regles d'acces Supabase sont conserves. **Le numero du moteur applicatif reste 3.6.2 ; UX V4 designe le design.** Aucune migration SQL supplementaire n'a ete introduite.

## Installer et executer localement

Prerequis : Node.js 22 ou superieur et acces a npm.

```bash
npm ci
npm run check
npm run preview
```

Ouvrir l'adresse localhost affichee par le serveur et ajouter `?demo=1` pour parcourir le jeu de demonstration fictif, sans connexion a une base de donnees de production. Le jeu de demonstration ne doit pas etre interprete comme des donnees reelles.

## Deploiement Netlify

1. Sauvegarder le depot / deploiement existant avant tout remplacement.
2. Decompresser l'archive a la racine du depot GitHub connecte a Netlify (`package.json` et `netlify.toml` doivent etre a la racine).
3. Dans Netlify, verifier `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` **publiques** pour le bon projet Supabase. Ne jamais fournir de `service_role` ou de cle `sb_secret_`.
4. La configuration `netlify.toml` utilise `npm run check` comme commande de build et `dist` comme dossier de publication.
5. Effectuer d'abord un deploiement de preproduction et la recette de chaque role authentifie.

Voir `README_DEPLOIEMENT_NETLIFY_V362.md` pour la procedure de diagnostic et les erreurs Supabase connues.

## Verifications realisees

- TypeScript + build + tests automatises : 116 tests reussis, 0 echec dans l'environnement d'audit.
- Captures visuelles sur les vues accueil (quatre roles), demandes, annuaire, messagerie, agenda et offres.
- Controle visuel sur formats desktop, tablette et mobile, sans debordement horizontal detecte.
- Les tests visuels ont utilise des captures du HTML/CSS compile avec donnees de demonstration. **Aucune authentification ni ecriture reelle dans Supabase n'a ete executee** et le deploiement Netlify de production n'a pas ete teste.

## Limites et prochaines etapes

Cette livraison est une refonte **visuelle et de navigation** sur le moteur existant. Elle ne realise pas encore les pistes futures detaillees dans le dossier de refonte : moteur de recommandations, automatisations commerciales avancees, analytics partnership, refonte des workflows back-end ou nouveau schema de donnees.

Recette recommande avant production : connexions/authentifications, regles RLS, profils et permissions, opportunites, reponses/propositions, messages, invitations/recommandations managers, planning et paiements Premium si applicables, avec plusieurs comptes de test.

## Retour arriere

Restaurer le commit / l'archive precedente. Pour ne desactiver que la peau visuelle, retirer le chargement `euraconnect-v4.css` dans `public/index.html`, puis retablir les fichiers TypeScript d'origine au besoin. Une sauvegarde est indispensable.
