# Recette V5.2 — tests de déploiement

## P0 — Ne pas sauter

- Ouvrir, sans connexion, `https://VOTRE-DOMAINE/data/partnership_seed.json` : le fichier ne doit pas être livré (`404` ou réponse HTML SPA **sans JSON métier**). Tester par fenêtre privée / commande HTTP.
- Vérifier Cloudflare Deployments : ancien déploiement et éventuelles versions accessibles. Restreindre la portée avec Cloudflare Access.
- Dans Supabase Auth, contrôler que les inscriptions libres ne sont pas ouvertes.
- Exécuter le SQL **lecture seule** et archiver ses résultats (structures, politiques, clés). Faire analyser ces résultats avant remplacement des RLS.

## Parcours V5 historiques

- Connexion, rafraîchissement, déconnexion ; clic de l'icône et du libellé des 9 modules.
- Clic sur chacune des 6 vignettes KPI, sur les lignes d'entonnoir et sur les cartes prospects/projets/partenaires ; retour depuis les fiches.
- Cliquer une étoile favori, confirmer qu'elle ne provoque pas l'ouverture de la carte.
- Kanban : changer une étape avec le sélecteur sur ordinateur ET téléphone ; utiliser glisser-déposer souris ; vérifier l'écriture Supabase.
- Partenariats / tâches : déplacer le statut depuis une carte ; relire depuis un second compte. Tester la fiche d'un partenaire, engagement et réalisation.
- Cockpit : tâche en retard ouvre la fiche ; clic « Fait » persiste le statut `realise` ; conventions à 90 jours ouvrent les fiches ; RDV renvoie au module Relations.
- 390 px : pas de bouton hors écran ; sélecteurs tactiles accessibles ; clavier (Tab, Entrée, Espace) sur cartes et boutons.
- Import convention JSON avec prévisualisation : créer un dossier de test, réimporter le même fichier (source_key) sans doublon.
- Vérifier les messages explicites sur import Excel / export XLSX non portés.

## Éviter les modifications non désirées

Tester toutes les écritures sur un **projet Supabase de test** si possible, avec des lignes `TEST-...`. En production, préférer d'abord la consultation et les tests de lecture. Les écritures Supabase ne sont pas annulées lorsqu'on fait un rollback d'un Worker Cloudflare.
