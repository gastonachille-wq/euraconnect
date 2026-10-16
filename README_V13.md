# EURACONNECT V1.3 — Lot 1

Mise à jour ergonomique et parcours prioritaires sur le socle existant TypeScript statique + Supabase + Cloudflare. Consultez `docs/V13_CHANGELOG_ET_PERIMETRE.md` pour le détail précis et les limites, puis `docs/V13_DEPLOIEMENT_CLOUDFLARE.md`.

## Tester localement

```sh
npm ci
npm run check
npm run preview
```

La configuration Supabase est injectée **à la compilation** par variables d'environnement. Le site de démonstration reste disponible avec `?demo=1`.
