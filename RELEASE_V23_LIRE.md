# EURACONNECT V2.3 — Invitations de rendez-vous Startup Manager

## Livraison effective

- Depuis son portefeuille, le Startup Manager choisit une startup **qui lui est affectée**, puis « Proposer un créneau ».
- Il sélectionne un contact incubé actif de cette entreprise, indique un objet, une date/heure de début et de fin, la modalité et un message.
- L'incubé reçoit une notification dans l'application, retrouve l'invitation sur son tableau de bord et dans « Agenda », et peut **accepter** ou **refuser**.
- Le manager voit la réponse dans son tableau de bord et son agenda, et reçoit une notification.
- Le contrôle des droits est exécuté côté Supabase (appartenance au portefeuille, destinataire membre actif, rôle). Les invitations ne sont pas visibles des autres utilisateurs.
- Les rendez-vous manager apparaissent dans un encart dédié, distinct des événements historiques du calendrier. Ils ne sont pas encore intégrés à l'export ICS et aux vues jour/semaine/mois de l'agenda historique.

## Déploiement

1. Faire une sauvegarde de la base Supabase.
2. Dans Supabase SQL Editor, exécuter **uniquement la nouvelle migration** `supabase/09_V23_INVITATIONS_MANAGER.sql` après les migrations 01 à 08 déjà installées.
3. Mettre à jour le dépôt GitHub avec le contenu du ZIP à sa racine (pas de sous-dossier supplémentaire).
4. Commit & Push ; Cloudflare relance `npm run check`, puis `npx wrangler deploy`.
5. Tester avec un compte manager affecté et un compte incubé actif de la startup.

## Limites et transparence

- SQL non exécuté contre la base Supabase de l'utilisateur ; valider en recette. Les tests automatisés de cette livraison contrôlent le code et les garde-fous SQL, pas l'exécution réelle de PostgreSQL.
- L'invitation est une proposition, **pas** un rendez-vous confirmé avant acceptation.
- Le contrôle de collision est basique et ne couvre pas tous les calendriers externes.
- Les fonctionnalités demandées précédemment sur les incubateurs administrables et la refonte complète du catalogue ne sont **pas** livrées dans ce lot V2.3. Elles doivent faire l'objet d'une livraison dédiée.
