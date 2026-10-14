# EURACONNECT - Plateforme de services et d'intermediation

**Version du projet : V0.7** (migrations 001 a 006, Next.js + Supabase + Netlify).

EURACONNECT rapproche des startups incubees et des prestataires de services.
Les comptes utilisateurs sont rattaches a des entreprises, qui peuvent accueillir
plusieurs collaborateurs. Leurs dossiers commerciaux sont partages sous permissions.

## Avant tout deploiement

1. Lire **[README_V07.md](README_V07.md)** pour comprendre les fonctions livrees.
2. Lire **[docs/INSTALLATION_V07.md](docs/INSTALLATION_V07.md)** pour la migration 006.
3. Executer les diagnostics V0.7 en recette, puis tester les parcours de
   **[docs/RECETTE_V07.md](docs/RECETTE_V07.md)**.
4. Deployer les fichiers sur GitHub/Netlify sans changer les cles Supabase.

Pour initialiser un projet depuis zero, consulter les historiques README et les
migrations versionnees dans `supabase/migrations/`, a appliquer une seule fois
et **dans l'ordre**. Ne pas rejouer les migrations sur une base deja installee.

## Commandes utiles

```bash
npm install
npm run verify:structure
npm run verify:v07
npm run typecheck
npm run build
```

L'archive ne contient aucun mot de passe ni cle de service. Fournir uniquement
les variables publiques NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
sur Netlify. Les fonctions serveur sensibles n'acceptent aucun identifiant libre
comme preuve d'autorisation : l'identite est issue de Supabase Auth.

## Etat

Cette V0.7 est un livrable de developpement avec tests de recette fournis.
L'archive a ete verifiee structurellement; **le build complet Next.js et
les tests en ligne Supabase n'ont pas ete executes dans cet environnement**.
