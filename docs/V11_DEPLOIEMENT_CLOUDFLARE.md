# EURACONNECT 1.1 — Mise a jour en 5 gestes

**Objectif : remplacer l'interface sans toucher aux comptes ni aux donnees existantes.**

Application deja en ligne : https://euraconnect.gaston-achille.workers.dev
Depot : https://github.com/gastonachille-wq/euraconnect

## 1. Garder une copie de securite du code

Dans GitHub, ouvrir le depot puis **Code > Download ZIP**. Conserver la copie actuelle sur l'ordinateur. Aucune intervention Supabase necessaire.

## 2. Utiliser le ZIP leger de mise a jour

Decompresser `EURACONNECT_V11_MISE_A_JOUR_GITHUB.zip`. Ce ZIP contient uniquement les fichiers modifies depuis la version 1.0 et les nouveaux fichiers d'interface.

## 3. Remplacer les fichiers sur GitHub

Ouvrir https://github.dev/gastonachille-wq/euraconnect (editeur visuel GitHub). Dans l'explorateur de gauche, remplacer les fichiers de memes noms par ceux du ZIP **dans les memes emplacements** :

- a la racine : `package.json`, `package-lock.json`, `README.md`, `wrangler.jsonc` ;
- dans `src/` : `app.ts`, `views.ts`, `forms.ts`, `api.ts` ;
- dans `public/` : `index.html`, `ux-v11.css` ;
- dans `scripts/` : `build.mjs` ;
- dans `docs/` : les notes de version facultatives.

Dans l'onglet Source Control (icone de branche), inscrire `EURACONNECT V1.1 UX` puis **Commit & Push** ou **Commit** + **Sync Changes** suivant l'editeur. Il ne faut **pas supprimer `src`, `tests` ou `supabase`**.

Si l'import de plusieurs fichiers semble difficile, utiliser GitHub Desktop pour copier les fichiers dans le depot local, puis **Commit to main** et **Push origin**.

## 4. Verifier Cloudflare

Aller dans **Cloudflare > Workers & Pages > euraconnect > Deployments**. Un nouveau deploiement se lance normalement apres le push GitHub.

Conserver les parametres :

- Build command : `npm run check`
- Deploy command : `npx wrangler deploy`
- Root directory : `/`
- `Settings > Builds > Variables and secrets` : les variables **de compilation** `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont deja renseignees. Ne pas les communiquer ni les ecraser.

Attendre **Success**. En cas d'erreur, recuperer la **fin des Build logs**, et ne pas lancer de nouvelle migration SQL.

## 5. Verifier l'application

Ouvrir https://euraconnect.gaston-achille.workers.dev et actualiser en ignorant le cache (Mac : Cmd + Shift + R).

Controles minimum sur des comptes de test existants :

1. Un incube publie une demande et voit ses propositions.
2. Un prestataire valide peut repondre et suivre son dossier ; sans Premium, il ne voit pas l'identite de l'incube.
3. L'incube choisit « Engager la discussion » et accede aux messages.
4. Le Startup Manager ouvre son portefeuille et trouve sa startup affectee.
5. Une inscription a un atelier ou un rendez-vous reste visible dans l'agenda.

**V1.1 ne demande aucun SQL.** Les sauvegardes et migrations de V1.0 sont conservees mais ne doivent pas etre rejouees.

## Si le nouveau site ne s'affiche pas

- Regarder Cloudflare > Deployments > Build logs.
- Verifier que `package.json` est a la racine du depot, pas dans un dossier `EURACONNECT-V1.1`.
- Verifier les deux variables dans `Settings > Builds`, pas `Runtime variables`.
- Actualiser le navigateur sans cache.
- Si l'interface s'affiche mais renvoie une erreur SQL, recuperer le message exact : le souci est distinct du deploiement statique.
