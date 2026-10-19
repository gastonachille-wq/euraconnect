# EURACONNECT V3.3 — Consolidation et stabilité de l’interface

## Contenu livré
- Un seul fichier `public/interface.css` remplace les 18+ feuilles historiques, **en conservant leur ordre de cascade**. Cela réduit les requêtes CSS et rend les conflits plus faciles à auditer. Les règles anciennes restent présentes à l’intérieur : ce n’est pas une réécriture totale du design system.
- Garde-fous de largeur et de coupure de texte pour les cartes Demandes/Annuaire, le panneau de conversation et le profil.
- Ajustements responsive pour la messagerie, navigation clavier visible, préférences de réduction des animations.
- Numérotation version 3.3 dans la compilation et la configuration.

## Déploiement
1. Sauvegarder le dépôt GitHub et les données de production.
2. **Supprimer les anciennes feuilles CSS** de `public/` dans le dépôt, car le nouveau `index.html` n’en charge plus aucune.
3. Importer l’intégralité de cette archive à la racine du dépôt (en conservant les dossiers).
4. Cloudflare : build `npm run check` puis déploiement `npx wrangler deploy`.
5. Aucun SQL à exécuter pour cette release. Les fichiers SQL sont historiques : ne pas les rejouer.

## Limites
- Les anciennes règles CSS ont été regroupées, pas entièrement converties en tokens.
- Les tests locaux ne garantissent pas le fonctionnement sur la base Supabase réelle ni sur toutes les données utilisateurs.
- Ne pas annoncer de fonctionnalité pièce jointe tant qu’un stockage et un parcours métier opérationnels n’existent pas.
