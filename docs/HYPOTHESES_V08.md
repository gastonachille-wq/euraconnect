# Hypotheses EURACONNECT V0.8

1. **Perimetre organisation** : les demandes et les rendez-vous d'une structure d'incubation ne sont visibles qu'aux membres connectes de cette structure.
2. **Identification des prestataires** : toute candidature rend immediatement visible a la startup le nom public du prestataire, quel que soit son plan.
3. **Anonymat de la startup** : un prestataire Free ou Pro voit un alias aleatoire, le statut et une annonce neutre. Le prestataire Premium peut acceder a l'identite et aux details. Aucune garantie d'anonymat absolu n'est possible face a une reidentification par le contenu publie.
4. **Plan actif** : `prestataires.plan_code` est la source de verification technique. Stripe non integre dans V0.8. Toute activation Premium doit etre reservee a la recette avant facturation.
5. **Statuts** : progression pilotee par la startup et non par les prestataires. `en_pause` est temporaire, `sans_suite` couvre les abandons / absence de conclusion, `reouvert` lance un nouveau cycle.
6. **Rendez-vous** : consultations de groupe partagees au sein de l'entreprise; la personne qui reserve reste enregistree pour l'audit; pas d'invitation calendrier automatique par email.
7. **Stockage** : la V0.6 utilisait deja `euraconnect-media`, bucket public. Les nouveaux uploads transforment les images dans le navigateur avant envoi; les anciennes sont uniformisees par CSS mais leur resolution d'origine n'est pas amelioree.
8. **Annonces historiques** : les anciennes descriptions peuvent contenir des noms. Elles deviennent donc non visibles aux Free/Pro par defaut et sont remplacees par un resume generique jusqu'a validation de la startup.
9. **Donnees personnelles** : si un profil personne est publie, sa photo doit etre choisie avec un accord explicite de l'interesse; ce module ne constitue pas une gestion complete du consentement RGPD.
10. **Synchronisation** : les appels a la base et les emails ne sont pas testes sur le projet de production de l'utilisateur depuis cet environnement.
