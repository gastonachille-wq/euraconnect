# EURACONNECT V2.5 — Navigation latérale épurée

## Modifications
- Suppression du bloc permanent « rôle / entreprise » de la barre latérale.
- Sélecteur de structure déplacé dans la barre supérieure **uniquement pour les comptes ayant plusieurs structures**.
- Bouton « Réduire le menu » remplacé par une icône de panneau latéral placée en haut, à droite du logo ; l’icône change selon l’état.
- Resserrement des espaces entre sections et entrées.
- Maintien des sections repliables, du mode compact et de la préférence mémorisée localement.

## Déploiement
Décompresser l'archive et remplacer les sources du dépôt GitHub ; effectuer un commit pour reconstruire sur Cloudflare. Aucune migration SQL nouvelle.

## Validation
Tests Node, compilation TypeScript et génération dist exécutés localement. Pas de recette authentifiée Supabase ou Cloudflare.
