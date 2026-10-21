# Validation locale - correctif 3.6.1

- Contrôle TypeScript strict : OK (`npm run check`).
- Compilation complète du frontend : OK (`npm run build`).
- Tests automatisés Node : **105/105 passés**.
- Test Chromium/Playwright avec transport Supabase simulé : une erreur HTTP 403,
  SQLSTATE `42501`, remonte désormais « Accès refusé par Supabase » dans
  le portefeuille Startup Manager, au lieu de « migration 07 nécessaire ».
- La migration 07 historique n'a pas été modifiée par ce correctif.
- Le SQL de diagnostic 10 est non destructif (SELECT et NOTIFY) ; il n'a pas
  pu être testé dans un projet Supabase réel.
- Pas de test d'authentification avec les comptes réels, ni d'accès à Netlify.
