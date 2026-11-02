# Euraconnect V4 - Cloudflare Workers

## Prerequis
- Node.js 22 ou plus
- Compte Cloudflare lie au depot Git
- Supabase existant

## Parametres du build Cloudflare
- Build command : `npm run build`
- Deploy command : `npx wrangler deploy` (si Cloudflare Workers Builds)
- Root directory : racine du depot
- Variables de build : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `EURACONNECT_REQUIRE_CONFIG=1`
- La cle anon/publishable est publique; ne jamais utiliser la cle service_role ni sb_secret_.

`wrangler.jsonc` pointe vers `./dist` (et non `./public`). Le build genere `dist/config.js`.

## Installation via Git
Decompresser le ZIP, placer les fichiers a la racine du depot, committer et pousser. Verifier que Cloudflare lance le build puis le deploy. Le nom du Worker dans wrangler.jsonc est `euraconnect` : l'adapter uniquement si votre Worker existant a un nom different.

## Verification
Tester `/config.js` (JavaScript avec URL et cle publiques), `/index.html`, et le chargement du tableau de bord. Un `config.js` vide indique que les variables n'etaient pas presentes au build.

## Limites
Pas de deploiement effectue sur votre compte. Les autorisations Supabase et la connexion reelle restent a tester.
