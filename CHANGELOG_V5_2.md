# Changelog V5.2 — 22 octobre 2026

## Sécurité (P0)
- Suppression de `public/data/partnership_seed.json` (521 Ko de données contractuelles) : aucune copie embarquée en public.
- Suppression du bouton de chargement et de l'API de seed ; les lignes existantes dans Supabase restent en place.
- Contrôle de build `npm run check` bloquant la réintroduction du fichier ou de clés secrètes et la redirection circulaire.
- En-têtes `X-Robots-Tag` et `Cross-Origin-Opener-Policy`.

## Correctifs d'usage (P1)
- Nouvel espace « Ma journée » dans le dashboard **V5**, sans suppression des indicateurs, du tunnel ni des mises à jour récentes. Il affiche les dossiers de l'équipe, pas encore un filtre par compte.
- Action « Fait » directe pour les tâches, statut Kanban sélectionnable sur mobile et clavier pour prospects et tâches partenaires.
- PATCH partiels prospect, tâche et engagement corrigés (le nom/titre n'est obligatoire qu'à la création ou s'il est modifié).
- Pipeline ouvert calculé hors Gagné/Perdu et recherche normalisée.
- Rafraîchissements automatiques suspendus lors de l'édition et lorsque le site est en arrière-plan.

## Non réalisés
- Sécurisation RLS multi-rôles : accès à auditer et migrations à tester avant déploiement.
- Journal, corbeille, contrôle de concurrence, atomicité des liens N:N, chargement incrémental.
- Excel/Outlook historique et refonte de l'en-tête 9 onglets en 5 rubriques : préserver prioritairement l'IHM originelle.

## Vérification
- `node --check` et audit des actifs statiques OK.
- Essais DOM avec Chromium et données Supabase simulées : connexion, 5 blocs cockpit, clic KPI, PATCH pipeline, clôture de tâche, Kanban partenariats, responsive 390 px OK.
- Pas de test Supabase réel, pas de publication Cloudflare effectuée.
