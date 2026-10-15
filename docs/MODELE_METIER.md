# Modèle fonctionnel et permissions

## Le dossier, centre du parcours

1. L'incubé publie au nom de sa startup un besoin avec contexte, objectifs, livrables, contraintes, budget, date limite et tags.
2. Les prestataires lisent le brief complet. L'identité de la startup est masquée pour les non-Premium ; les indices directs connus sont filtrés dans les champs de texte.
3. Un gestionnaire prestataire transmet une proposition : message enrichi, approche, prix indicatif et délai. L'incubé voit l'entreprise et l'auteur de la proposition.
4. L'incubé choisit « Donner suite », « Retenir » ou « Ne pas retenir ». La conversation est le même dossier, pas une seconde mise en relation à accepter.
5. Les parties échangent et proposent un créneau. L'autre partie le réserve ; le rendez-vous conserve le lien avec le besoin.
6. La startup met à jour son besoin. Les autres prestataires voient cette progression sans accéder aux propositions concurrentes.

Un prestataire ne relance pas avant que l'incubé ait donné suite. L'incubé peut aussi ouvrir la discussion par son premier message. Une proposition déclinée devient en lecture seule ; la startup peut rouvrir la discussion. Une réponse retirée par son auteur reste retirée.

## Deux statuts distincts

**Besoin :** brouillon, ouvert aux propositions, en discussion, rendez-vous planifié, devis reçu, mission en cours, résolu ; en pause et sans suite sont disponibles. La réouverture est une action tracée vers « ouvert », pas un état définitif supplémentaire.

**Proposition :** nouvelle, discussion ouverte, retenue, non retenue, retirée. Plusieurs discussions peuvent rester ouvertes sur un besoin. Retenir une proposition ne signifie ni signature de contrat ni mission facturée.

## Droits par rôle

| Action | Incubé | Prestataire | Startup Manager | Administrateur |
|---|---|---|---|---|
| Publier un besoin | Gestionnaire de sa startup | Non | Non | Au nom d'une startup |
| Répondre | Non | Gestionnaire validé | Non | Intervention tracée, entreprise prestataire sélectionnée |
| Donner suite | Gestionnaire de la startup | Non | Non | Oui |
| Lire les messages privés | Membres de la startup partie au dossier | Membres de l'entreprise partie au dossier | Non, sauf s'il est légitimement partie au dossier par un autre droit | Oui, consultation tracée |
| Voir les KPIs startups | Ses propres besoins | Ses propositions | Startups attribuées | Ensemble de sa structure |
| Publier disponibilités, permanences, ateliers | Pas de disponibilité publique ; proposition possible dans un dossier | Oui si entreprise validée | Oui | Oui |
| S'inscrire | Oui | Oui | Oui | Oui |
| Gérer Premium | Jamais | Demande hors application ; pas d'auto-activation | Non | Activation, révocation, expiration |

Les favoris sont toujours personnels. Les tags sont partagés au sein de la structure d'incubation. L'utilisateur peut choisir un terme existant ou en proposer un ; casse, accents et espaces sont normalisés. Les synonymes de sens différent ne sont pas fusionnés automatiquement.

## Premium

Premium est un droit de l'entreprise prestataire validée. Le contrôle vérifie l'activation, sa date de début et sa date d'expiration à chaque lecture sensible. Une valeur `plan_code` historique isolée ne suffit pas.

Un prestataire Free peut comprendre le brief, envoyer une proposition, utiliser la discussion ouverte par l'incubé et participer aux rendez-vous. Premium ajoute l'identité des startups et les contacts qu'elles ont autorisés. L'incubé ne paie pas et ne reçoit pas de sollicitation d'abonnement. Il connaît toujours ses répondants.

## Agenda

- Disponibilité ponctuelle : une personne, un horaire, un objet à la réservation.
- Permanence : plage de 1 à 8 heures, découpée selon la durée choisie et une pause ; jusqu'à 12 répétitions hebdomadaires. L'heure locale Europe/Paris est conservée entre les semaines.
- Proposition de rendez-vous : privée, rattachée à une candidature, adressée à l'interlocuteur.
- Atelier : capacité paramétrable jusqu'à 200, inscriptions, liste d'attente et émargement manuel. Pas de billetterie payante.

La base vérifie les chevauchements de l'hôte et du participant et verrouille la réservation. Les listes d'attente ne sont pas une garantie de place ; la promotion saute les personnes en conflit horaire ou temporairement verrouillées par une autre réservation. L'export ICS n'est pas une synchronisation bidirectionnelle de calendriers.

## Manager

Le portefeuille est attribué par l'administrateur. Le manager consulte besoins, propositions, prestataires positionnés et rendez-vous des startups affectées. Il peut tenir des notes internes et des actions avec échéance, visibles des managers autorisés et de l'administration, pas des prestataires.

Les indicateurs « contacts » comptent les entreprises ayant répondu dans EURACONNECT ; ils ne certifient ni un contact téléphonique hors plateforme ni une vente. « Devis reçu » et « Mission en cours » sont déclaratifs.
