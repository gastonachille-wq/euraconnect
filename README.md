# EURACONNECT V3.6.2 - Edition compacte pour GitHub / Netlify

Ce depot contient **84 fichiers**, tous necessaires ou utiles au build, aux tests et aux migrations. Les 79 fichiers historiques de la distribution complete ont ete retires **sans modifier le code applicatif** (`src/`, `public/`), les migrations (`supabase/`) ni les tests Node.js.

## Import GitHub avec limite de 100 fichiers

1. Decompresser `EURACONNECT_V362_COMPACT_GITHUB_84_FICHIERS.zip` sur l'ordinateur.
2. Dans GitHub, deposer les **84 fichiers decompressee** en conservant leur arborescence (racine avec `package.json`, `netlify.toml`, `src/`, `public/`, `supabase/`, `scripts/`, `tests/`). **Ne pas deposer le ZIP tel quel** dans le depot.
3. Pour un depot ancien qui contient deja plus de 100 fichiers, supprimer les fichiers obsoletes si tu veux aussi ramener le depot total sous les 100. L'import web ne supprime pas automatiquement les anciens fichiers. Une mise a jour via Git (`git add -A`) permet de synchroniser proprement les suppressions.
4. Verifier dans Netlify les variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cle publique et jamais `service_role` ou `sb_secret_`). Netlify doit executer `npm run check` et publier `dist`.
5. Apres redeploiement, ouvrir `/diagnostic.html` pour diagnostiquer l'erreur de recommandations.

## Tests locaux

```sh
npm ci
npm run check
```

Ne jamais envoyer `node_modules/`, `dist/` ou `.env` sur GitHub. Le build Netlify regenere `dist/` et insere les variables de configuration publiques dans `dist/config.js`.

Lire `README_DEPLOIEMENT_NETLIFY_V362.md` pour la procedure de diagnostic Supabase.
