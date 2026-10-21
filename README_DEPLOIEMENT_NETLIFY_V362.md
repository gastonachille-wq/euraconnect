# EURACONNECT V3.6.2 — Correctif Netlify / Supabase

## Pourquoi V3.6.1 pouvait ne pas fonctionner

L'ancienne archive GitHub contenait `dist/config.js` avec `supabaseUrl:""` et `supabaseKey:""`. Ces valeurs vides sont normales en compilation locale, mais elles rendent **un deploiement direct du dossier `dist` inutilisable**. L'application et plusieurs notices faisaient encore reference a Cloudflare, alors que la cible est ici Netlify.

Le correctif **ne permet pas de certifier la cause du message de recommandations** sans la reponse reelle de l'API du projet Supabase. Cette version permet d'obtenir cette reponse.

## Procedure unique : GitHub vers Netlify

1. Decompresser l'archive source a la **racine du depot GitHub** suivi par Netlify (fichiers `package.json`, `netlify.toml`, dossiers `src`, `public`, `scripts`, `supabase` a la racine).
2. Dans **Netlify > Site configuration > Environment variables**, configurer les deux variables suivantes pour le contexte production (les recuperer depuis **Supabase > Project Settings > API**) :
   - `NEXT_PUBLIC_SUPABASE_URL` : URL HTTPS du projet Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : cle publique/anon/publishable du meme projet (jamais la `service_role`, ni `sb_secret_`)
3. Netlify doit executer : **Build command** `npm run check` et **Publish directory** `dist` (deja presents dans `netlify.toml`). Declencher un **nouveau deploy avec reconstruction** apres avoir change les variables.
4. Ouvrir `https://VOTRE-DOMAINE/diagnostic.html` dans le **meme navigateur** que l'application ; si demande, se reconnecter au site puis revenir au diagnostic.
5. Lire `Version compilée`, `Projet Supabase`, `RPC de base ec1_api`, `RPC recommandations V20`. Utiliser **Copier le diagnostic**. Ce rapport ne contient aucun jeton ni cle.
6. Si le RPC V20 manque, executer `supabase/11_DIAGNOSTIC_MANAGER_V362.sql` dans le SQL Editor du projet indique sur cette page. Si le RPC est present, executer `NOTIFY pgrst, 'reload schema';` puis reessayer.

## Protection contre les faux deploys reussis

A partir de V3.6.2, si Netlify construit sans les deux variables obligatoires, `npm run check` **echoue explicitement** : un site non configure ne doit plus etre publie comme valide.

L'archive **source GitHub** ne contient aucun dossier `dist` precompile ni secret. **Ne pas la glisser directement** dans le mode de deploiement manuel de fichiers statiques Netlify : ce mode ne lance pas le build et ne peut pas injecter les deux variables.

### Interpretation rapide

- V20 HTTP 200 : la migration est joignable avec le compte courant ; investiguer le frontend s'il affiche encore une erreur.
- V20 `PGRST202`/`42883` : fonction introuvable dans le projet interroge ou cache PostgREST obsolete.
- V20 `42501`/HTTP 403 : permissions, role, profil inactif ou affectations au portefeuille.
- V20 `42P01` : fonction disponible mais table absente dans le schema.
- RPC de base en echec : probleme general de configuration, d'authentification ou d'infrastructure.

La reponse SQL seule ne valide pas les habilitations de la **session JWT du compte**. La page `diagnostic.html`, elle, realise la veritable requete avec la session du navigateur (lecture seule).
