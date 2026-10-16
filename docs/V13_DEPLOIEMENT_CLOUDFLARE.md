# Déploiement de EURACONNECT V1.3 — mise à jour depuis V1.2

1. Conserver une sauvegarde du dépôt GitHub actuel et vérifier que la V1.2 fonctionne déjà sur `euraconnect.gaston-achille.workers.dev`.
2. Télécharger `EURACONNECT_V13_MISE_A_JOUR_GITHUB.zip` et le décompresser.
3. Ouvrir `https://github.dev/gastonachille-wq/euraconnect`.
4. Glisser les fichiers depuis le ZIP dans la **racine du dépôt** en conservant les répertoires `src`, `public`, `tests`, `scripts`, `docs` et en acceptant le remplacement. Ne pas supprimer les fichiers existants qui ne figurent pas dans le ZIP.
5. Commit & Push sur `main`.
6. Dans Cloudflare → Workers & Pages → euraconnect → Deployments, attendre un nouveau déploiement vert. Les commandes `npm run check` et `npx wrangler deploy` sont inchangées.
7. Vérifier que les deux variables de **build** `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` restent configurées. Ne jamais renseigner une clé Supabase secrète.
8. Vérifier en premier la connexion, la publication guidée, l'affichage des propositions, la messagerie mobile, les accès manager et admin. Si les données ne s'affichent pas, conserver les logs et revenir au commit GitHub précédent.

**Aucune migration SQL en V1.3 Lot 1** : la V1.2 et ses migrations doivent déjà être installées. Les options non livrées sont décrites dans `docs/V13_CHANGELOG_ET_PERIMETRE.md`.

**Aperçu** : version sans clés Supabase, mode démonstration à ouvrir via `?demo=1` après déploiement. Le code de production ne simule jamais des écritures dans ce mode.
