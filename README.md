# EURACONNECT 1.0 — Refonte des parcours

**Release candidate : code compilé et interfaces testées ; migration Supabase et droits à valider en recette.**

Une demande, des propositions identifiées, une décision de la startup, puis un dossier de discussion et des rendez-vous. Le Premium concerne exclusivement les entreprises prestataires et reste activé manuellement par l'administrateur. Aucun paiement.

## Ce qui est livré

- Quatre espaces : Incubé, Prestataire, Startup Manager, Administrateur.
- Dashboard, besoins contextualisés, propositions, décisions et messagerie par dossier.
- Annuaire entreprises/contacts, typologies distinctes, favoris filtrés côté base, tags suggérés et personnalisés.
- Agenda individuel et collectif, propositions de créneaux depuis les dossiers, permanences hebdomadaires, ateliers et listes d'attente.
- Supervision des startups affectées, notes internes et actions de suivi pour les managers.
- Administration des comptes, entreprises, membres, portefeuilles et activations Premium avec expiration.
- Photos et logos privés, redimensionnement, éditeur enrichi contrôlé.

## Changement d'architecture explicite

Le frontal Next.js/React historique est **remplacé par une application TypeScript statique**, compilée sur Netlify. Les données, l'authentification et les opérations transactionnelles restent dans Supabase. Ce n'est ni une page HTML locale avec de fausses sauvegardes, ni une mise à jour cosmétique de `app/page.tsx`.

**Le site Netlify doit publier `dist`, plus `.next`. Supprimer l'extension `@netlify/plugin-nextjs` configurée dans l'interface Netlify.** Le nouveau `netlify.toml` remplace l'ancien.

Le choix réduit les dépendances de compilation et supprime les anciennes interfaces concurrentes. En contrepartie, cette release n'offre pas le rendu serveur SEO des fiches publiques envisagé dans le cahier initial. L'application est centrée sur l'espace authentifié.

## Commencer

1. Lire `docs/INSTALLATION.md` et `docs/MIGRATION_ET_RETOUR.md` avant toute manipulation.
2. Conserver une sauvegarde de la base, des fichiers Storage et du déploiement V0.9.1.
3. Dans une copie de recette : `00_DIAGNOSTIC.sql`, puis `01_INSTALL_V1.sql`.
4. Déployer ce projet sur un site Netlify de recette, avec les deux variables publiques existantes.
5. Exécuter `02_ACTIVER_V1.sql`, `04_TESTS_METIER_RECETTE.sql`, puis `05_VERIFIER_BASCULE.sql`.
6. Faire la recette multi-comptes. Ne basculer la production qu'après réussite.

Commandes locales :

```sh
npm ci
npm run check
npm run preview
```

Configuration conservée : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique anon ou publishable). Aucune clé `service_role`, aucun secret de paiement.

## Aperçu sans installation

Ouvrir `docs/previews/APERCU_INTERACTIF.html` dans un navigateur. Le sélecteur de rôle montre les quatre espaces sur des **données fictives en lecture seule**. Cet aperçu n'utilise pas votre Supabase.

## Validation et périmètre

Voir `docs/VALIDATION.md`. Les tests PostgreSQL livrés n'ont pas été exécutés ici. La vérification sur votre configuration de recette reste une condition de bascule. L'ancien code est fourni dans `archives/V091_ORIGINALE.zip` uniquement pour analyse/retour contrôlé.
