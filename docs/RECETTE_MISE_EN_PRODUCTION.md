# Recette Cloudflare Workers — restauration CRM V5

## Avant mise en production

- [ ] Sauvegarder les versions déployées et les données Supabase importantes.
- [ ] Prévisualiser le déploiement Cloudflare sous une URL de prévisualisation Workers ; vérifier que l'URL Supabase de la Preview est celle attendue (attention, config.json utilise votre projet habituel).
- [ ] Confirmer la présence et la compatibilité du schéma `prospects`, `projets`, `prospect_projets`, `partenariats` et des tables liées.
- [ ] Vérifier que l'authentification Supabase et les politiques RLS protègent bien les données ; ne pas se fier seulement à la présence de l'écran de login.

## Interactions prioritaires

- [ ] Authentification, session restaurée après actualisation, déconnexion réelle et nouvelle connexion.
- [ ] Cliquer sur le pictogramme ET le libellé des neuf onglets.
- [ ] Cliquer sur toute la surface de chacune des six vignettes KPI.
- [ ] Cliquer sur une ligne de l'entonnoir : pipeline avec filtre prérempli.
- [ ] Dans Prospects, basculer Tableau / Cartes / Compact et ouvrir la fiche en cliquant sur la vignette.
- [ ] Cliquer sur une étoile Favoris : la fiche ne doit PAS s'ouvrir.
- [ ] Dans Projets, cliquer sur la carte, puis sur la case de sélection ; ne pas confondre les actions.
- [ ] Dans Partenariats, cliquer sur une carte, ouvrir le détail, changer d'onglet, voir engagement et action liés.
- [ ] Dans Tâches/Kanban, changer le statut d'une tâche puis recharger : valeur réellement conservée.
- [ ] Tester une création et une modification sur des fiches nommées `TEST-...` ; contrôler Supabase.
- [ ] Tester l'export ICS dans Outlook et le HTML autonome sur un navigateur local.
- [ ] Tester les droits avec un compte lecteur et un compte contributeur lorsque ceux-ci sont gérés par Supabase.
- [ ] Vérifier le rendu sur téléphone : bande de navigation horizontale, tuiles et drawer.

## Fonctions temporairement non portées

Import Excel complet, export Excel ODJ, import massif de RDV historiques. Ne pas considérer ces fonctions comme finalisées.

## Retour arrière

Cloudflare Workers > Deployments : revenir au déploiement précédent si nécessaire. Les données Supabase restent conservées, mais les écritures réalisées depuis la nouvelle version ne sont PAS annulées par un rollback Cloudflare.
