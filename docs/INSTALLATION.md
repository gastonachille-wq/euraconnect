# Installation — EURACONNECT 1.0

## 1. Précautions et hypothèse de compatibilité

La migration cible les tables et colonnes de **l'archive V0.9.1 fournie dans cette conversation**. Le dépôt GitHub et la base en ligne n'ont pas été inspectés en direct. Toute modification réalisée depuis cette archive doit être comparée avant installation.

Sauvegarder PostgreSQL et les fichiers Storage : une sauvegarde SQL ne remplace pas une copie des images. Conserver le commit et le déploiement Netlify fonctionnels. Utiliser d'abord un projet Supabase et un site Netlify de **recette**, distincts de la production.

**Arrêter les saisies dans l'ancien site avant l'import**. La reprise est un instantané, pas une synchronisation continue. Des saisies effectuées entre l'import et la bascule ne seraient pas recopiées automatiquement.

## 2. Contrôler puis installer la base

Dans le SQL Editor du projet de recette :

| Ordre | Fichier | Effet |
|---|---|---|
| 1 | `supabase/00_DIAGNOSTIC.sql` | Lecture seule : prérequis, volumes et cas orphelins. |
| 2 | `supabase/01_INSTALL_V1.sql` | Nouveau schéma privé `ec1`, import, fonctions, médias. Aucune table historique supprimée. |
| 3 | Contrôle de `ec1.import_report` | Comparer volumes historiques et repris ; traiter chaque écart. |
| 4 | `supabase/02_ACTIVER_V1.sql` | Autorise les écritures V1 et ferme les anciennes API aux navigateurs. |
| 5 | `supabase/04_TESTS_METIER_RECETTE.sql` | Tests fonctionnels transactionnels, données fictives annulées par ROLLBACK. |
| 6 | `supabase/05_VERIFIER_BASCULE.sql` | Vérification des privilèges, images privées et anciennes fonctions. |

`01_INSTALL_V1.sql` est une transaction. En cas d'erreur, arrêter, exécuter `ROLLBACK;` si nécessaire et conserver le message exact. Ne pas poursuivre par des créations manuelles de tables vides.

Ne pas ajouter `ec1` aux schémas exposés de la Data API. Le navigateur appelle uniquement `public.ec1_api`. Le contrôle d'accès aux images passe par `public.ec1_media_allowed`.

**Après activation, l'ancien frontal ne doit plus être utilisé.** Ne rejouer aucune ancienne migration V0.x : elle pourrait rouvrir des chemins d'accès fermés par la V1.

## 3. Remplacer le projet GitHub

Créer une branche `release/euraconnect-v1`. Remplacer le contenu applicatif du dépôt par cette release. Ne pas simplement ajouter `src` à côté des anciens fichiers.

Retirer du projet actif : `app/`, `components/`, `lib/` historiques, `next.config.*`, `next-env.d.ts`, `postcss.config.*`, les anciennes configurations Next et l'ancien `package-lock.json`. Le ZIP fournit le nouveau manifeste et son lockfile. L'archive historique reste un fichier ZIP, elle ne participe pas au build.

La racine doit contenir `package.json`, `package-lock.json`, `tsconfig.json`, `netlify.toml`, `src/`, `public/`, `scripts/` et `tests/`.

Ne jamais envoyer `node_modules`, `.env` avec secrets ou des mots de passe sur GitHub.

## 4. Reconfigurer Netlify

| Paramètre | Valeur V1 |
|---|---|
| Build command | `npm run check` |
| Publish directory | `dist` |
| Base directory | Racine du dépôt |
| Node | 22, défini dans `netlify.toml` |
| Next.js Runtime / plugin | **Supprimer `@netlify/plugin-nextjs` s'il est installé dans l'interface Netlify** |

Les variables publiques existantes sont conservées et doivent être disponibles au build :

```env
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=VOTRE_CLE_PUBLIQUE
```

Le code de build refuse une clé `sb_secret_` et un JWT indiquant `service_role`. Utiliser uniquement la clé publique du projet. La version finale est construite au déploiement ; un simple dépôt du HTML d'aperçu ne déploie pas l'application.

Conserver la configuration d'URL de Supabase Auth ; ajouter l'URL du site de recette pour les retours d'authentification. Les comptes et mots de passe existants sont conservés, mais une reconnexion est attendue : le nouveau frontal n'utilise pas le même stockage local de session que l'ancien.

## 5. Recette dans le navigateur

Avec des comptes de recette existants et confirmés : administrateur, incubé, prestataire Free, prestataire Premium, manager affecté et manager non affecté. Suivre `RECETTE.md`. Les limites d'envoi d'emails Supabase restent celles de votre projet ; cette release ne configure pas de SMTP.

Ne pas réactiver publiquement l'ancien bucket pour corriger une image manquante. Contrôler plutôt le chemin dans `ec1.media` et l'accès autorisé.
