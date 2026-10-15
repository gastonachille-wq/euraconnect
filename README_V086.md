# EURACONNECT V0.8.6 — Favoris, besoins, messages, compétences

Livraison incrémentale sur V0.8.5. Appliquer **uniquement** `supabase/migrations/202610150010_favoris_besoins.sql` après sauvegarde de la base. Déployer ensuite l’intégralité du code sur GitHub/Netlify.

- Annuaire : coeur directement sur la vignette et bouton « Mes favoris ». Ce dernier filtre les résultats déjà chargés sur la page courante : la recherche transversale de tous les favoris reste à développer.
- Bourse des besoins : épingle individuelle, « Mes besoins épinglés », données privées dans `favoris_ec`.
- Création de besoin : tags suggérés ou créés librement, associés à la nouvelle demande à la publication. Les droits d’accès sont contrôlés par les RPC existantes.
- Publication : un seul formulaire complet dans « Mes demandes », lien direct depuis « Dossiers ».
- Messagerie : raccourci dans le header vers les dossiers et conversations, sans refonte des règles d’autorisation.
- Premium : communication spécifique prestataire, sans proposition de Premium aux incubés.
- Erreurs Supabase : rendu des messages métiers plutôt que `[object Object]`.

## Recette minimale
1. Compte incubé : publier une demande avec un tag existant et un tag nouveau; vérifier la liaison des deux après publication.
2. Prestataire : épingler un besoin, basculer sur « Mes besoins épinglés », recharger; désépingler.
3. Annuaire : enregistrer une fiche par l’icône en vignette, ouvrir la fiche, supprimer le favori, recharger.
4. Messagerie : vérifier le raccourci en header et les droits des membres.
5. Dossiers : vérifier l’absence de `[object Object]` et le lien vers la publication.
6. Tester au moins un prestataire Free, Premium et un incubé; l’incubé ne reçoit aucune incitation Premium.

**Important :** le bouton « Mes favoris » de l’annuaire reste limité à la page de résultats déjà chargée. Le build Next.js et l’exécution SQL sur la base distante doivent être confirmés avant production.
