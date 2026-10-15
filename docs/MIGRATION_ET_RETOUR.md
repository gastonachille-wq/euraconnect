# Reprise des données et retour contrôlé

## Conservé sans recréation

Comptes Supabase Auth, mots de passe, profils applicatifs, entreprises, membres, activations Premium administratives, portefeuilles de managers et offres existantes. Les tables historiques ne sont pas supprimées.

## Repris dans le schéma V1

| Données | Traitement |
|---|---|
| Besoins | Même UUID ; description historique nettoyée du balisage HTML, contexte utile repris. Les champs objectifs/livrables restent vides s'ils n'existaient pas. |
| Besoins orphelins | Brouillons à rattacher par leur auteur ou l'administrateur. |
| Candidatures | Même UUID si une entreprise prestataire est identifiée ; anciennes mises en relation acceptées deviennent discussions ouvertes. |
| Messages | Repris lorsque le fil peut être relié à une candidature importée. |
| Créneaux et réservations | Reprise des horaires et participants. Une réservation par couple personne/créneau ; les doublons restent archivés dans les anciennes tables. |
| Tags et compétences | Référentiel normalisé par structure, associations aux personnes, entreprises, besoins et offres. |
| Favoris | Associations personnelles reprises. |
| Notifications | Notification historique générique ; les anciens liens ne sont pas rejoués vers des routes supprimées. |
| Images | Références Storage locales reprises ; bucket rendu privé à la bascule. Les images externes par URL ne sont pas téléchargées automatiquement. |

Les assignations commerciales internes V07, les anciens journaux et certains commentaires de suivi historique restent dans leurs tables d'origine ; ils ne sont pas tous fusionnés dans le nouveau journal. Il ne s'agit pas d'une reprise silencieusement exhaustive.

**Contrôler `ec1.import_report`.** Un écart de volume doit être expliqué avant la bascule. Les longues descriptions historiques au-delà des limites V1 peuvent bloquer la transaction : ne pas les tronquer automatiquement, traiter le cas en recette.

## Fenêtre de migration

Arrêter les saisies V0.x avant `01_INSTALL_V1.sql`, garder cet arrêt jusqu'à l'activation V1 et la vérification du nouveau site. `ON CONFLICT DO NOTHING` protège les lignes déjà importées ; cela n'effectue pas une synchronisation des modifications historiques tardives.

La migration d'installation refuse d'être rejouée après activation. Une nouvelle correction devra être une migration ciblée, versionnée et testée.

## Retour arrière

`03_RETOUR_ARRIERE.sql` restaure les privilèges historiques sauvegardés et désactive les écritures V1. Il **ne recopie pas les données créées en V1 vers V0.9.1**. Après des saisies V1, un retour complet nécessite une réconciliation des données, pas seulement le redéploiement d'un ancien ZIP.

Les images restent privées par précaution. Restaurer les anciens privilèges réouvre aussi leurs anciennes règles : utiliser ce retour uniquement en recette ou dans une fenêtre de maintenance maîtrisée.

Les comptes et mots de passe ne sont pas réinitialisés. Les données V1 restent dans `ec1` pour analyse et réconciliation.
