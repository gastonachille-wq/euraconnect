# EURACONNECT V2.2 — Lot applicatif utilisable

Cette archive contient un projet complet Cloudflare/TypeScript et une migration SQL **08_V22_SUIVI_DEMANDES.sql**.

## Livré dans cette archive
- Annuaire : facettes repliables, tri indépendant, 3 vues existantes, mise en évidence Premium, recherche dynamique sur plusieurs champs.
- Fiche contact : affichage d'un message explicite si la fiche est inaccessible au lieu d'une erreur bloquante.
- Avatar : chargement des photos du profil également dans la barre supérieure après rendu.
- Demande : archivage et suppression conditionnelle côté serveur, avec confirmation. Suppression refusée si une réponse existe.
- Consultations : comptage unique par entreprise prestataire et nombre de propositions via RPC sécurisé ; détails par prestataire pour le manager du portefeuille et l'incubé autorisé.
- Agenda : libellés distincts « Mes rendez-vous » et « Créneaux disponibles ».
- Barre supérieure : suppression du libellé « Mon espace » redondant.

## À savoir : périmètre incomplet
- La gestion administrable des incubateurs (nom/logo/couleur, multi-rattachement) **n'est pas livrée** dans ce lot.
- Le catalogue n'a pas encore été reconstruit en profondeur : sa refonte complète reste à faire.
- Les consultations passées ne peuvent pas être reconstituées rétroactivement ; le compteur commence après activation SQL.
- La suppression d'une demande sans réponse peut être refusée par une autre contrainte relationnelle (historique, rendez-vous, favoris, tags). La base conserve alors la demande ; l'archivage est le recours.
- Les vues et réponses sont comptées dans la fiche détaillée, pas lors d'un survol ou de l'affichage des cartes.
- Les tests Node/TypeScript ne constituent pas une validation de la migration sur Supabase réel.

## Installation
1. Sauvegarder la base Supabase et les sources GitHub.
2. Exécuter dans l'éditeur SQL Supabase `supabase/08_V22_SUIVI_DEMANDES.sql` après les migrations V2 existantes.
3. Importer à la racine du dépôt GitHub **tout le contenu de cette archive** (sauf `dist/` si GitHub le régénère). Faire Commit & Push.
4. Cloudflare : conserver `npm run check` et `npx wrangler deploy`, et les variables Supabase actuelles.
5. Tester avec 1 incubé, 2 prestataires et 1 manager : ouvrir plusieurs fois la même demande, vérifier les compteurs, archiver, vérifier la suppression refusée après proposition, tester l'annuaire et la photo du profil.

Ne pas exécuter la migration directement sur la base sans sauvegarde : elle n'a pas été testée sur ton instance Supabase.
