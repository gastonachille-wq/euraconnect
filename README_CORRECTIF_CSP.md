# Correctif connexion Supabase / CSP

Cause confirmee par la console Edge : la directive CSP `connect-src` autorisait un ancien projet Supabase, bloquant les appels `auth/v1/token`.

Le build genere maintenant `dist/_headers` a partir de `NEXT_PUBLIC_SUPABASE_URL`, et autorise egalement la connexion WebSocket du meme projet.

Deploiement GitHub -> Cloudflare Workers : conserver `npm run build`, configurer les variables de build `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`, puis redeployer. Ne pas mettre de cle `service_role` ou `sb_secret_` dans le build.

Verification : dans l'onglet Reseau, la requete vers Supabase Auth ne doit plus etre bloquee par la CSP. Le bon fonctionnement des identifiants et des droits n'est pas garanti par ce correctif.
