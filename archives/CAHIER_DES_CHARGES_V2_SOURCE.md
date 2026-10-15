# EURACONNECT — Cahier des charges fonctionnel et technique V2

Version V2 consolidée — 14 octobre 2026 · Document de référence pour conception, réalisation, recette et déploiement


> **Statut : spécification cible V2 (non déployée).** Cette version reprend la V1 et rend normatives les corrections d'intermédiation, de monétisation hybride, de sécurité et de livraison. Les prix, quotas et seuils de l'offre hybride sont des **hypothèses paramétrables** à valider avant commercialisation. Les règles identifiées `V2-*` font autorité sur les dispositions antérieures contradictoires ; les corrections de la section 13 restent applicables dans les autres cas. Aucun test ni déploiement n'est présumé réalisé.

### Guide de lecture et traçabilité

- **Fait de source** : les sections historiques V1 et leurs identifiants `R…`, `UC-…`, `CT-…` sont conservés, hormis les corrections explicites signalées dans ce document.
- **Décision V2** : les règles `V2-*` et les nouveaux critères `AT-V2-*` constituent des exigences de conception recommandées et désormais retenues pour ce document.
- **À valider métier** : tout tarif, pourcentage, quota commercial, période de rétention non légalement fixée et condition d'accès aux coordonnées.
- **Priorité en cas de conflit** : sections V2 (3.4, 4.5, 5.14 à 5.16, 7.6 à 7.8, 8.4, 11 et 12.5), puis section 13, puis sections 7 et 8 historiques, puis autres règles historiques.

## 1. Contexte, objectifs et périmètre

La Plateforme met en relation des **incubés** (jeunes créateurs d'entreprise) avec des **prestataires** (experts, freelances, agences) autour de compétences, savoir-faire et projets, dans un modèle **freemium** : gratuite pour les incubés, gratuite avec options payantes pour les prestataires. Ce document est écrit pour être donné tel quel à un générateur de code (Claude Code ou ChatGPT) : chaque règle est numérotée et testable.

### 1.1 Objectifs

- O1. Permettre à un incubé de trouver un prestataire par **compétence**, **savoir-faire** ou **besoin décrit en langage libre**, même sans savoir qui peut répondre.
- O2. Permettre à un prestataire de se référencer, de répondre aux besoins publiés, de candidater et de proposer des rendez-vous d'expertise.
- O3. Offrir une **bourse de projets** (publication, candidatures, sélection) et la **constitution d'équipes** par projet.
- O4. Centraliser **rendez-vous** et **événements** (conférences, webinaires, ateliers) avec inscription.
- O5. Donner à l'administrateur une vision complète : tableaux de bord, indicateurs, modération, audit.
- O6. Monétiser les fonctions complémentaires côté prestataires, sans jamais bloquer le parcours incubé. Le modèle hybride différencie référencement, réponse, identification et mise en relation selon le contexte (voir 3.4).

### 1.2 Périmètre

| Inclus (V1) | Exclu (hors V1, voir lot 6) |
| --- | --- |
| Profils, catalogue d'offres, recherche, bourse de projets, candidatures | Contrat et facturation entre incubé et prestataire |
| Équipes projet, messagerie interne, rendez-vous, événements | Paiement des prestations par la Plateforme (séquestre) |
| Abonnements prestataires payants, quotas, boosts | Application mobile native (la V1 est un site responsive) |
| Administration, modération, tableaux de bord, audit | Visioconférence intégrée (lien externe fourni par l'hôte) |
| Notifications email et in-app, RGPD | Recommandation par apprentissage automatique (V1 : règles + recherche plein texte) |

### 1.3 Glossaire

| Terme | Définition |
| --- | --- |
| Incubé | Utilisateur porteur d'un projet ou d'une jeune entreprise, rattaché à une structure d'incubation |
| Prestataire | Personne ou société qui propose des services (freelance, expert, agence, école) |
| Compétence | Entrée normalisée d'un référentiel (ex. « Comptabilité », « UX design ») |
| Savoir-faire | Description libre et preuves (références, réalisations) rattachées à une compétence |
| Besoin | Demande d'un incubé, ciblée (une compétence) ou ouverte (description libre) |
| Projet | Besoin structuré publié dans la bourse de projets, avec rôles à pourvoir |
| Candidature | Réponse d'un prestataire à un besoin ou à un rôle de projet |
| Offre de service | Prestation référencée par un prestataire, avec périmètre, format et tarif indicatif |
| Animateur | Personnel de la structure d'incubation qui crée des événements et accompagne les incubés |

### 1.4 Hypothèses à confirmer

- H1. Une seule structure d'incubation au départ ; le modèle de données reste **multi-structure** (champ `organisation_id`) pour ne pas bloquer une extension.
- H2. Les incubés sont **invités ou validés** par un administrateur ou un animateur (pas d'inscription ouverte).
- H3. Les prestataires s'inscrivent librement puis sont **validés** par un administrateur avant publication.
- H4. Les paiements concernent uniquement les abonnements et options prestataires (carte bancaire via Stripe).

## 2. Acteurs, rôles et permissions

Quatre rôles métier plus un visiteur anonyme. Un compte a **un seul rôle principal** ; l'administrateur peut accorder le rôle Animateur en complément (champ `roles[]`). Les droits sont appliqués côté base par Row Level Security (section 7), jamais uniquement dans l'interface.

### 2.1 Description des rôles

| Rôle | Qui | Accès | Ce qu'il fait |
| --- | --- | --- | --- |
| Visiteur | Non connecté | Pages publiques | Voir l'accueil, l'annuaire public (profils publiés, version limitée), les événements publics ; s'inscrire en tant que prestataire |
| Incubé | Créateur d'entreprise invité | Gratuit, toutes fonctions incubé | Chercher, publier besoins et projets, comparer, inviter, monter une équipe, prendre rendez-vous, s'inscrire aux événements, évaluer |
| Prestataire | Freelance, expert, agence | Gratuit (plan Free) ou payant (Pro, Premium) | Référencer offres et savoir-faire, répondre aux besoins, candidater, proposer des rendez-vous d'expertise, gérer ses disponibilités |
| Animateur | Équipe de la structure | Accès interne | Valider des incubés, créer et animer des événements, voir les indicateurs de sa structure, orienter un incubé vers un prestataire |
| Administrateur | Responsable de la Plateforme | Accès complet | Tout voir et tout configurer : utilisateurs, référentiels, modération, plans payants, tableaux de bord, journal d'audit |

### 2.2 Matrice des permissions

Légende : ✔ autorisé · ◐ autorisé avec condition (précisée en section 5) · ✘ interdit.

| Action | Visiteur | Incubé | Prestataire | Animateur | Admin |
| --- | --- | --- | --- | --- | --- |
| Consulter l'annuaire des prestataires | ◐ aperçu | ✔ | ✔ (profils publics) | ✔ | ✔ |
| Voir les coordonnées complètes d'un prestataire | ✘ | ◐ selon la visibilité choisie | ✘ | ✔ | ✔ |
| Créer et modifier son profil | ✘ | ✔ | ✔ | ✔ | ✔ |
| Publier une offre de service | ✘ | ✘ | ◐ quota du plan | ✘ | ✔ |
| Publier un besoin ou un projet | ✘ | ✔ | ✘ | ✔ (pour un incubé) | ✔ |
| Consulter la bourse de projets | ◐ titres seulement | ✔ ses projets | ✔ projets ouverts | ✔ | ✔ |
| Candidater à un besoin ou un projet | ✘ | ✘ | ◐ quota du plan | ✘ | ✘ |
| Accepter ou refuser une candidature | ✘ | ✔ sur ses projets | ✘ | ✔ | ✔ |
| Constituer une équipe projet | ✘ | ✔ | ✘ | ✔ | ✔ |
| Proposer des créneaux de rendez-vous | ✘ | ✘ | ✔ | ✔ | ✔ |
| Réserver un rendez-vous | ✘ | ✔ | ◐ avec un autre prestataire si activé | ✔ | ✔ |
| Créer un événement | ✘ | ✘ | ◐ webinaire, si plan Premium | ✔ | ✔ |
| S'inscrire à un événement | ◐ événements publics | ✔ | ✔ | ✔ | ✔ |
| Laisser un avis | ✘ | ✔ après prestation | ✘ | ✘ | ✘ |
| Répondre à un avis | ✘ | ✘ | ✔ | ✘ | ✔ |
| Modérer contenus et utilisateurs | ✘ | ✘ | ✘ | ◐ signalements de sa structure | ✔ |
| Voir tableaux de bord | ✘ | ✔ les siens | ✔ les siens (étendus en Pro) | ✔ sa structure | ✔ global |
| Gérer plans, prix, référentiels | ✘ | ✘ | ✘ | ✘ | ✔ |
| Exporter des données (CSV) | ✘ | ✘ | ✔ ses données | ◐ sa structure | ✔ |

### 2.3 Cycle de vie d'un compte

- **Incubé** : invité (email) → compte créé → profil complété → actif. Un administrateur ou animateur peut le suspendre ou l'archiver.
- **Prestataire** : inscrit → email confirmé → profil soumis → **en validation** → publié (ou refusé avec motif) → actif → suspendu / archivé.
- Un compte archivé disparaît de la recherche, conserve ses données 12 mois puis est anonymisé (section 9).
- Tout changement de statut est tracé dans le journal d'audit (qui, quand, ancien et nouveau statut, motif).

## 3. Modèle freemium

Les incubés n'ont **jamais** de fonction payante. Les prestataires démarrent en plan Free et peuvent passer en Pro ou Premium. Les plans, quotas et prix sont **paramétrables par l'administrateur** (table `plans`, aucune valeur en dur dans le code) ; les chiffres ci-dessous sont des propositions de départ à valider.

### 3.1 Plans prestataires

| Fonction | Free | Pro (proposition : 19 € HT/mois) | Premium (proposition : 49 € HT/mois) |
| --- | --- | --- | --- |
| Profil public, compétences, savoir-faire | ✔ 5 compétences | ✔ 15 compétences | ✔ illimité |
| Offres de service publiées | 3 | 15 | illimité |
| Candidatures par mois | 5 | 30 | illimité |
| Alertes sur les nouveaux besoins correspondants | résumé hebdomadaire | email quotidien + in-app temps réel | temps réel + filtres avancés |
| Créneaux de rendez-vous actifs en même temps | 10 | 50 | illimité |
| Messagerie, avis reçus, inscription aux événements | ✔ | ✔ | ✔ |
| Statistiques de profil (vues, contacts, candidatures) | 30 derniers jours, chiffres globaux | 12 mois, par offre | 12 mois + comparaison au marché (moyennes anonymisées) |
| Badge « Pro » ou « Premium » sur le profil | ✘ | ✔ | ✔ |
| Priorité dans les résultats de recherche | ✘ | légère | forte (hors classement par pertinence stricte) |
| Page vitrine personnalisée (portfolio, vidéo, logo) | ✘ | ✔ | ✔ |
| Export CSV de ses candidatures et contacts | ✘ | ✔ | ✔ |
| Sièges collaborateurs sur le même compte | 1 | 1 | 5 |
| Création de webinaires publics | ✘ | ✘ | ✔ 2 par mois |

### 3.2 Options à l'unité (achat ponctuel)

| Option | Effet | Prix proposé |
| --- | --- | --- |
| Boost d'offre | Offre mise en avant en tête de sa catégorie pendant 7 jours, mention « Sponsorisé » | 15 € HT |
| Pack candidatures | +10 candidatures à consommer dans le mois courant | 9 € HT |
| Mise en avant sur l'accueil | Carrousel « Experts à découvrir » pendant 7 jours | 29 € HT |

### 3.3 Règles de gestion de l'abonnement

- R3.1. Paiement par carte via **Stripe Checkout** ; le portail client Stripe gère moyen de paiement, factures et annulation. La Plateforme ne stocke aucune donnée de carte.
- R3.2. Essai gratuit de 30 jours du plan Pro, une seule fois par prestataire, sans carte demandée.
- R3.3. Passage Free vers Pro ou Premium : effet immédiat, quotas relevés tout de suite.
- R3.4. Annulation : le plan reste actif jusqu'à la fin de la période payée, puis retour automatique en Free.
- R3.5. **Rétrogradation** : rien n'est supprimé. Les contenus au-delà des quotas Free sont **dépubliés** (statut `hors_quota`, les plus récents d'abord) ; le prestataire choisit ceux à garder publiés. Les données restent visibles pour lui.
- R3.6. Échec de paiement : 3 relances (J+1, J+3, J+7), puis rétrogradation en Free. Chaque étape déclenche un email et une notification in-app.
- R3.7. Quotas mensuels remis à zéro le 1er de chaque mois à 00:00 (Europe/Paris) ; un pack candidatures non consommé expire à la fin du mois.
- R3.8. Le quota est vérifié **côté serveur** (fonction Postgres ou Edge Function), jamais seulement par l'interface. Dépassement : message explicite et bouton « Passer au plan supérieur ».
- R3.9. Les webhooks Stripe (`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`) mettent à jour la table `abonnements` ; le traitement est **idempotent** (clé = identifiant d'événement Stripe).
- R3.10. TVA et factures : produites par Stripe ; l'administrateur voit chiffre d'affaires, MRR et churn dans son tableau de bord (section 6).


### 3.4 Modèle hybride EURACONNECT — règles normatives V2

**Principe commercial :** l'incubé ne paie jamais. Tout prestataire validé peut être référencé et recevoir des demandes entrantes. Le plan détermine la quantité de réponses spontanées, les fonctionnalités et l'accès à l'identité dans le **seul canal des besoins ouverts**, jamais dans une relation initiée directement par l'incubé. Les candidats sont jugés sur leur pertinence ; les contenus sponsorisés sont identifiés.

| Cas | Free | Pro | Premium | Traitement de la visibilité |
| --- | --- | --- | --- | --- |
| Catalogue public | Oui, quota d'offres | Oui, quota supérieur | Oui, étendu | Identité du prestataire visible sur **sa fiche publiée** |
| Demande de contact initiée par l'incubé depuis une fiche/offre | Réponse gratuite et illimitée | Idem | Idem | Identités connues des deux parties ; aucune barrière payante |
| Invitation nominative de l'incubé à candidater | Réponse sans consommation du quota | Idem | Idem | Identité visible ; pas de verrou d'abonnement |
| Candidature spontanée à un besoin **ouvert** | Quota Free ; dossier évalué avec alias | Quota Pro ; identité révélable selon consentement | Quota Premium ; identité révélable selon consentement | Avant déblocage Free, l'incubé voit un **alias et des attributs professionnels non identifiants** ; le serveur supprime tout identifiant du dossier affiché |
| Présélection d'une candidature Free anonyme | Possible sans payer côté incubé | Sans objet | Sans objet | Le prestataire Free peut **accepter gratuitement** une invitation de mise en relation issue de sa candidature, révélant son identité après accord mutuel ; l'accès rapide et les facilités commerciales peuvent être réservés au payant |
| Messagerie relative à une candidature anonyme | Oui, fil pseudonymisé | Oui | Oui | Fil filtré, pièces et coordonnées protégées jusqu'à l'accord mutuel |
| CRM d'opportunités et analytics avancés | Pipeline minimal | CRM et analyses étendus | Analyses étendues, équipe | Aucun blocage du suivi de base d'une mise en relation déjà acceptée |
| Offre préférentielle aux incubés | Oui, limitée selon plan | Étendue | Étendue | Visible uniquement après authentification et rattachement incubé validé |

**Règles contractuelles :**

- **V2-FRE-01** Le plan Free conserve les quotas V1 initiaux *comme valeurs de départ* : 3 offres et 5 candidatures spontanées mensuelles. Les tarifs Pro 19 € HT/mois et Premium 49 € HT/mois restent **hypothétiques** ; la grille des autres quotas en 3.1 est provisoire et entièrement stockée dans `plans`/`plan_versions`.
- **V2-FRE-02** Un prestataire n'a jamais à payer pour répondre à un incubé qui l'a directement contacté ou invité ; la réponse ne consomme aucun quota de candidature spontanée.
- **V2-FRE-03** Une candidature Free ouverte est anonyme **uniquement dans les vues destinées à l'incubé avant accord de relation** ; elle demeure nominative pour son auteur et les administrateurs autorisés. Les plans payants ne permettent pas de révéler les coordonnées d'un incubé sans son accord.
- **V2-FRE-04** Le déblocage de l'identité Free est déclenché par une **demande de mise en relation de l'incubé** puis l'**acceptation du prestataire**, sans transaction obligatoire : on ne crée pas d'impasse commerciale et le parcours incubé reste gratuit. Un abonnement offre des fonctionnalités supplémentaires, non un droit de forcer la révélation des coordonnées.
- **V2-FRE-05** Ni les pièces jointes, ni métadonnées, liens, noms de fichiers, URLs de Storage, signatures de messages ou résultats de recherche ne doivent permettre de contourner l'anonymisation. Une candidature anonyme utilise des **références structurées validées ou expurgées** et des fichiers retenus jusqu'à la révélation ; contrôle automatique et possibilité de signalement.
- **V2-FRE-06** Toute mise en avant commerciale doit porter la mention « Sponsorisé ». Le plan et le boost ne doivent jamais prévaloir sur les filtres d'éligibilité, de sécurité et les besoins essentiels du demandeur.
- **V2-FRE-07** Les avantages « incubés » portent sur une variante d'offre (conditions, tarif indicatif, justificatif éventuel) et ne doivent pas être envoyés à un visiteur, un prestataire concurrent ou un incubé non éligible.
- **V2-FRE-08** Le quota consommé pour une réponse spontanée est comptabilisé atomiquement. Une mise en relation invitée, un retour de contact ou une réponse à une invitation ne consomment pas de quota. Toute modification des plans est versionnée et n'altère pas les engagements commerciaux existants.
- **V2-FRE-09** Les offres préférentielles, avantages et prix effectivement publiés requièrent la validation métier et juridique (CGV, publicité du prix, TVA) avant activation commerciale.

## 4. Parcours et cas d'usage par rôle

Chaque cas d'usage a un identifiant (UC-…) repris dans les critères d'acceptation (section 12) et dans les tests.

### 4.1 Incubé

| ID | Cas d'usage | Résultat attendu |
| --- | --- | --- |
| UC-INC-01 | Activer son compte depuis l'email d'invitation | Choix du mot de passe, acceptation des CGU et de la politique de confidentialité, redirection vers l'assistant de profil |
| UC-INC-02 | Compléter son profil et celui de sa startup | Profil complet à 100 % : identité, startup (nom, stade, secteur), besoins récurrents, visibilité des coordonnées |
| UC-INC-03 | Chercher une compétence ou un savoir-faire | Résultats triés par pertinence, filtrables, avec carte prestataire (compétences, tarif indicatif, disponibilité, note) |
| UC-INC-04 | **Décrire un besoin sans savoir qui peut répondre** | Saisie libre → suggestion de compétences et de prestataires → publication du besoin ciblé ou ouvert (voir 5.4) |
| UC-INC-05 | Publier un projet dans la bourse | Projet publié avec rôles à pourvoir, budget, calendrier, visibilité ; alerte envoyée aux prestataires correspondants |
| UC-INC-06 | Examiner et comparer les candidatures | Tableau comparatif (tarif, délai, note, message), tri, filtres, mise en favoris |
| UC-INC-07 | Accepter, refuser ou mettre en attente une candidature | Notification au prestataire ; les autres candidats d'un rôle pourvu reçoivent un refus automatique courtois |
| UC-INC-08 | Constituer l'équipe d'un projet | Équipe composée de prestataires retenus, d'incubés et d'animateurs, avec rôles et espace de discussion |
| UC-INC-09 | Inviter directement un prestataire à répondre à un besoin | Invitation envoyée, ne consomme aucun quota de l'incubé |
| UC-INC-10 | Prendre rendez-vous avec un prestataire | Créneau réservé, confirmation email, ajout au calendrier (fichier .ics), rappel J-1 et H-1 |
| UC-INC-11 | Annuler ou déplacer un rendez-vous | Possible jusqu'à 24 h avant sans motif ; au-delà, avec motif ; le prestataire est notifié |
| UC-INC-12 | S'inscrire à un événement | Place réservée, ou liste d'attente si complet ; rappels automatiques |
| UC-INC-13 | Clôturer un projet et évaluer les prestataires | Note de 1 à 5 par critère + commentaire ; avis publié après modération automatique |
| UC-INC-14 | Signaler un contenu ou un comportement | Signalement transmis à la modération avec contexte, accusé de réception à l'auteur |
| UC-INC-15 | Exporter ou supprimer ses données | Export JSON/CSV en moins de 24 h ; suppression du compte avec confirmation |

### 4.2 Prestataire

| ID | Cas d'usage | Résultat attendu |
| --- | --- | --- |
| UC-PRE-01 | S'inscrire comme prestataire | Création de compte, confirmation d'email, assistant de profil, soumission à validation |
| UC-PRE-02 | Renseigner profil, compétences, savoir-faire, coordonnées | Profil publié après validation ; contrôle de la qualité (champs obligatoires, minimum de description) |
| UC-PRE-03 | Référencer une offre de service | Fiche avec périmètre, livrables, format (à distance, sur site), délai, tarif indicatif ou sur devis, secteurs ciblés |
| UC-PRE-04 | Déclarer ses disponibilités | Disponibilité globale (disponible / partielle / indisponible jusqu'au …) et créneaux de rendez-vous récurrents ou ponctuels |
| UC-PRE-05 | Recevoir et consulter les besoins correspondant à ses compétences | Flux de besoins filtré, alertes selon le plan |
| UC-PRE-06 | Candidater à un besoin ou à un rôle de projet | Candidature (message, tarif, délai, pièces jointes) ; consomme 1 quota |
| UC-PRE-07 | Modifier ou retirer une candidature | Modification tant que l'incubé ne l'a pas traitée ; retrait possible, quota non restitué |
| UC-PRE-08 | Répondre à une invitation d'un incubé | Accepter (crée une candidature sans consommer de quota) ou décliner avec motif |
| UC-PRE-09 | Proposer un rendez-vous d'expertise | Publication d'un créneau (individuel ou collectif), durée, lieu ou lien, public cible |
| UC-PRE-10 | Gérer ses rendez-vous | Liste, confirmation, annulation, notes privées, marquage « réalisé » |
| UC-PRE-11 | Répondre à un avis | Réponse publique unique par avis, visible sous l'avis |
| UC-PRE-12 | Gérer son abonnement | Voir son plan, ses quotas restants, changer de plan, accéder aux factures |
| UC-PRE-13 | Animer un webinaire (Premium) | Création d'événement, inscriptions, rappel, export de la liste des inscrits |
| UC-PRE-14 | Consulter ses statistiques | Vues du profil, contacts, candidatures envoyées, taux de sélection |

### 4.3 Animateur et administrateur

| ID | Cas d'usage | Résultat attendu |
| --- | --- | --- |
| UC-ANI-01 | Inviter ou valider des incubés | Import CSV ou invitation unitaire ; liste des invitations et leur état |
| UC-ANI-02 | Créer et animer un événement | Événement publié, inscriptions, émargement, supports déposés, enquête de satisfaction |
| UC-ANI-03 | Orienter un incubé vers un prestataire | Recommandation tracée, visible par l'incubé et le prestataire |
| UC-ADM-01 | Valider ou refuser un prestataire | Décision motivée, email automatique, trace d'audit |
| UC-ADM-02 | Modérer les signalements et les avis | File de modération avec priorité, actions : masquer, avertir, suspendre, rétablir |
| UC-ADM-03 | Gérer les référentiels | Compétences, secteurs, types d'événement, catégories d'offres : créer, fusionner, désactiver |
| UC-ADM-04 | Piloter l'activité | Tableaux de bord, alertes de seuil, exports (section 6) |
| UC-ADM-05 | Configurer plans, quotas, prix et textes d'email | Modifications versionnées, effet à la date choisie |
| UC-ADM-06 | Consulter le journal d'audit et gérer les demandes RGPD | Recherche par utilisateur ou par action, export, anonymisation |

### 4.4 Parcours transverses

1. **Besoin → prestataire** : incubé décrit son besoin → la Plateforme suggère → publication → candidatures → rendez-vous d'expertise → sélection → projet démarré → clôture → avis.
2. **Offre → mission** : prestataire publie une offre → un incubé la trouve en recherche → demande de contact ou de rendez-vous → échange → projet.
3. **Projet → équipe** : incubé publie un projet à plusieurs rôles → candidatures par rôle → sélection → équipe constituée → espace d'équipe actif.
4. **Événement → relation** : prestataire ou animateur publie un événement → inscriptions → participation → mise en relation ultérieure (suivi, rendez-vous).


### 4.5 Parcours de conversion commerciale — V2

| ID | Déclencheur | Étapes obligatoires | Résultat |
| --- | --- | --- | --- |
| UC-V2-01 | Incubé consulte une offre | Voir la fiche → comparer l'offre publique et l'avantage incubé → demander contact ou RDV → notification prestataire | Opportunité `contact_entrant` créée, identité visible des deux parties |
| UC-V2-02 | Incubé publie un besoin ouvert | Rédiger → matcher → notifier → recevoir candidatures → comparer → inviter à entrer en relation → confirmer → RDV | Réponses structurées et opportunité traçable |
| UC-V2-03 | Prestataire Free répond à un besoin ouvert | Vérifier éligibilité/solde → composer réponse → contrôler anonymisation → envoyer → suivre alias → accepter/refuser mise en relation | Identité protégée avant accord mutuel ; aucun paiement requis pour accepter l'invitation |
| UC-V2-04 | Incubé invite un prestataire identifié | Inviter → recevoir réponse sans quota → messagerie/agenda → clôture | Aucun anonymat ni obstacle payant |
| UC-V2-05 | Prestataire propose un avantage incubé | Rédiger conditions → soumettre → valider si requis → publier → accès incubé connecté seulement | Promotion ciblée sans divulgation publique |
| UC-V2-06 | Administrateur anime la demande | Voir besoins sans réponse → détecter manque d'offre → recommander des prestataires → suivre le statut et les suites déclarées | Intermédiation tracée et mesurable |
| UC-V2-07 | Société prestataire avec équipe | Désigner propriétaire → inviter collaborateurs → déléguer gestion offres/réponses → journaliser les actes | Identité société stable et permissions individuelles |

**Pipeline commun** : `nouvelle` → `qualifiee` → `contact_etabli` → `rdv_planifie` → `proposition_transmise` → `gagnee` / `perdue` / `sans_suite` ; les états sont déclaratifs et **ne démontrent pas à eux seuls la conclusion contractuelle**. Un rapprochement `source_type + source_id + prestataire_organisation_id` interdit les doublons d'opportunité. Chaque changement conserve acteur, date et motif.

## 5. Spécifications fonctionnelles par module

Convention : « doit » = obligatoire en V1 ; « peut » = optionnel. Les règles sont numérotées Rx.y.z. Toutes les dates sont stockées en UTC et affichées en Europe/Paris. Tous les textes de l'interface sont en français, avec un fichier de traduction prévu pour une autre langue.

### 5.1 Authentification et comptes

- R5.1.1. Connexion par email et mot de passe (Supabase Auth) ; lien magique en option ; connexion Google et LinkedIn peut être ajoutée.
- R5.1.2. Mot de passe : 12 caractères minimum ; verrouillage temporaire après 5 échecs en 15 minutes ; réinitialisation par email, lien valable 1 h.
- R5.1.3. L'email doit être confirmé avant tout accès aux fonctions d'écriture.
- R5.1.4. Un incubé ne peut s'inscrire que par **invitation** (jeton à usage unique, valable 14 jours, renvoyable). Un prestataire s'inscrit depuis la page publique.
- R5.1.5. L'acceptation des CGU et de la politique de confidentialité est horodatée et versionnée ; une nouvelle version impose une nouvelle acceptation à la connexion suivante.
- R5.1.6. Authentification à deux facteurs (TOTP) disponible pour tous, **obligatoire** pour les administrateurs.
- R5.1.7. Session : expiration après 7 jours d'inactivité ; déconnexion de tous les appareils possible depuis le profil.

### 5.2 Profils

**Profil prestataire**

| Champ | Type | Règle |
| --- | --- | --- |
| Nom d'affichage, type (indépendant, société, école, association) | texte, liste | obligatoire |
| Photo ou logo | image ≤ 2 Mo, jpg/png/webp | recadrage 1:1 |
| Titre court (accroche) | texte ≤ 120 car. | obligatoire |
| Présentation | texte riche ≤ 3 000 car. | obligatoire, ≥ 200 car. |
| Compétences | 1 à N depuis le référentiel, niveau (débutant, confirmé, expert), années d'expérience | au moins 1 ; N selon le plan |
| Savoir-faire | blocs libres liés à une compétence : description, réalisations, liens, pièces (PDF ≤ 5 Mo) | facultatif |
| Secteurs d'intervention, langues, zone (pays, région, à distance) | listes | à distance par défaut |
| Tarif indicatif | taux journalier ou horaire min–max, ou « sur devis » | facultatif ; affiché en tranches |
| Coordonnées | email pro, téléphone, site, LinkedIn | chacune avec sa **visibilité** : publique, aux incubés connectés, après acceptation d'une mise en relation, privée |
| Disponibilité | disponible / partielle / indisponible jusqu'au (date) | mise à jour rappelée tous les 60 jours |
| SIRET ou numéro de TVA | texte | demandé pour les sociétés, utilisé pour la validation, jamais public |

**Profil incubé** : nom, prénom, photo, startup (nom, secteur, stade : idée, prototype, lancement, croissance), site, besoins récurrents (compétences), visibilité des coordonnées (par défaut : visibles uniquement par les prestataires avec qui il échange).

- R5.2.1. Un indicateur de complétude (0 à 100 %) est affiché ; un profil prestataire n'est soumis à validation qu'à partir de 70 %.
- R5.2.2. Toute modification d'un champ sensible d'un profil publié (nom, SIRET, présentation) repasse en **revalidation légère** : la version publiée reste visible jusqu'à décision.
- R5.2.3. Les coordonnées ne sont jamais exposées dans le code client tant que la règle de visibilité n'est pas satisfaite (colonnes protégées, vue sécurisée côté base).
- R5.2.4. Un prestataire en plan Premium peut ajouter des collaborateurs (sièges) ; les actions sont tracées par utilisateur.

### 5.3 Catalogue des offres de service

- R5.3.1. Une offre contient : titre (≤ 100 car.), compétence principale et secondaires, description, livrables, format (à distance, sur site, mixte), durée type, tarif (forfait, journalier, horaire, sur devis), secteurs, mots-clés (≤ 10), pièces jointes (≤ 3).
- R5.3.2. Statuts : `brouillon` → `en_modération` (contrôle automatique : mots interdits, coordonnées dans le titre) → `publiée` → `hors_quota` | `archivée`.
- R5.3.3. Une offre publiée est modifiable ; un changement de compétence principale ou de tarif met à jour l'index de recherche sous 60 secondes.
- R5.3.4. Un boost d'offre place l'offre dans le bloc « Sponsorisé » de sa catégorie avec libellé visible ; une offre ne peut pas être boostée deux fois en même temps.
- R5.3.5. Chaque offre comptabilise vues, clics sur contact, demandes de rendez-vous ; ces chiffres alimentent les statistiques (UC-PRE-14).

### 5.4 Recherche

**Trois modes**, accessibles depuis une barre unique et un assistant :

1. **Par compétence ou savoir-faire** : saisie avec autocomplétion sur le référentiel, synonymes inclus (« compta » trouve « Comptabilité »).
2. **Par texte libre** : recherche plein texte en français (accents et pluriels ignorés, tolérance aux fautes de frappe).
3. **Par besoin décrit (assistant « Je ne sais pas qui peut m'aider »)** : l'incubé décrit son besoin en quelques phrases ; la Plateforme propose 1 à 5 compétences probables et les prestataires correspondants.

- R5.4.1. Filtres : compétence, secteur, format (distance/site), zone, langue, disponibilité, fourchette de tarif, note minimale, plan (option « mettre en avant les experts vérifiés »), prestataires ayant déjà travaillé avec ma structure.
- R5.4.2. Tri : pertinence (défaut), disponibilité, note, tarif croissant, nouveauté. Pagination de 20 résultats ; sauvegarde d'une recherche avec alerte (email ou in-app) à chaque nouveau résultat.
- R5.4.3. **Score de pertinence** (somme pondérée, poids paramétrables) : correspondance texte (40 %), compétence exacte (25 %), disponibilité (10 %), note moyenne et nombre d'avis (10 %), complétude du profil (5 %), proximité sectorielle (5 %), priorité du plan (5 %). Les résultats sponsorisés sont **toujours marqués** et ne remplacent pas un résultat bien plus pertinent.
- R5.4.4. L'assistant de besoin (mode 3) fonctionne en V1 **sans IA générative** : extraction de mots-clés, correspondance avec les synonymes du référentiel, classement par score. Une option (feature flag `assistant_ia`) permet de brancher un modèle de langage via Edge Function pour reformuler le besoin ; elle est désactivée par défaut et ne transmet jamais de données personnelles.
- R5.4.5. À l'issue de l'assistant, l'incubé choisit : (a) contacter des prestataires suggérés, (b) **publier le besoin** pour recevoir des candidatures, (c) enregistrer sans publier.
- R5.4.6. Aucun résultat : message utile, suggestions de termes proches, bouton « Publier mon besoin ». Les requêtes sans résultat sont comptées pour l'administrateur (écarts de l'offre, section 6).
- R5.4.7. Les prestataires `indisponibles` apparaissent en fin de liste avec mention ; les suspendus et archivés n'apparaissent jamais.

### 5.5 Bourse de projets et besoins

Un **besoin** est une demande simple (une compétence, une mission). Un **projet** peut regrouper plusieurs **rôles** à pourvoir. Les deux partagent le même moteur.

| Champ | Règle |
| --- | --- |
| Titre, résumé (≤ 300 car.), description détaillée | obligatoires |
| Type | `besoin_ciblé` (un ou plusieurs prestataires invités), `besoin_ouvert` (visible à tous les prestataires éligibles) |
| Rôles | 1 à 10 ; chacun avec compétence, description, charge (jours), budget min–max, début souhaité |
| Budget global, échéance de réponse, date de début, durée | échéance de réponse obligatoire, ≥ 3 jours après publication |
| Format, zone, langue, secteurs | comme pour les offres |
| Confidentialité | `public` (détail visible des prestataires connectés), `restreint` (titre et résumé seulement, détail après candidature), `privé` (invités seulement) |
| Pièces jointes | ≤ 5 fichiers, ≤ 10 Mo au total |

- R5.5.1. Statuts d'un projet : `brouillon` → `publié` → `en_sélection` → `en_cours` → `terminé` ; ou `annulé` / `expiré`. Transitions autorisées uniquement selon le schéma de la section 8.
- R5.5.2. À l'échéance de réponse, le projet passe en `en_sélection` ; l'incubé peut **prolonger** une fois de 14 jours maximum.
- R5.5.3. Un projet sans action de l'incubé 30 jours après l'échéance reçoit un rappel, puis expire à 60 jours.
- R5.5.4. À la publication, les prestataires dont les compétences correspondent reçoivent une alerte selon leur plan (3.1). Le moteur de correspondance utilise la même logique que 5.4.3.
- R5.5.5. Un incubé peut dupliquer un projet, le clôturer sans suite ou le rouvrir dans les 30 jours.
- R5.5.6. Les projets `public` sont listés dans la **bourse** avec filtres (compétence, budget, durée, secteur, nouveauté, échéance proche) et tri ; les prestataires peuvent enregistrer des projets en favoris et s'abonner à des alertes.
- R5.5.7. Un projet modifié après candidatures : tout changement sur budget, charge ou compétence d'un rôle notifie les candidats, qui peuvent confirmer ou retirer leur candidature.

### 5.6 Candidatures

- R5.6.1. Une candidature = un prestataire × un rôle (ou un besoin). Un seul dossier actif par prestataire et par rôle.
- R5.6.2. Contenu : message (≥ 100 car.), tarif proposé (obligatoire), délai, disponibilité, références choisies dans son profil, pièces jointes (≤ 3), question éventuelle à l'incubé.
- R5.6.3. Statuts : `envoyée` → `consultée` → `présélectionnée` → `entretien` → `acceptée` | `refusée` | `retirée` | `expirée`. Chaque changement notifie l'autre partie ; `consultée` est posée automatiquement à la première ouverture par l'incubé.
- R5.6.4. Candidater consomme **un quota** à l'envoi (sauf sur invitation, R4/UC-PRE-08). Si le quota est atteint : blocage avec proposition de pack ou de montée en plan.
- R5.6.5. L'incubé peut poser des questions aux candidats (fil lié à la candidature) et organiser un **entretien** (création d'un rendez-vous depuis la candidature).
- R5.6.6. Acceptation : confirmation à deux (l'incubé accepte, le prestataire confirme sous 5 jours) ; sans confirmation, le dossier repasse en `présélectionnée` et l'incubé est averti.
- R5.6.7. Un prestataire ne voit jamais les autres candidatures ni leur nombre exact (tranches : 0, 1-3, 4-10, 10+).
- R5.6.8. Les coordonnées complètes de l'incubé deviennent visibles du prestataire **uniquement** après passage en `entretien` ou `acceptée`, sauf choix contraire de l'incubé.

### 5.7 Recherche de talents et constitution d'équipe

- R5.7.1. Un prestataire individuel peut cocher « Ouvert à rejoindre une équipe projet » ; il apparaît alors dans l'annuaire des **talents** avec compétences, disponibilité et mode de collaboration (mission, temps partagé, co-développement).
- R5.7.2. Un incubé ou animateur crée une **équipe** liée à un projet (nom, objectif, rôles). Il invite des talents ou des prestataires déjà candidats ; l'invité accepte ou décline sous 7 jours.
- R5.7.3. Un membre d'équipe a un rôle : `responsable` (incubé propriétaire), `membre`, `expert_invité`, `observateur` (animateur). Seul le responsable ajoute ou retire des membres ; un membre peut quitter l'équipe.
- R5.7.4. L'équipe dispose d'un **espace** : fil de discussion, liste de tâches simple (à faire, en cours, fait), documents partagés (≤ 50 Mo au total en Free, extensible), calendrier des rendez-vous liés.
- R5.7.5. Un rôle de projet peut rester **vacant** : il reste visible dans la bourse tant que le projet est `publié` ou `en_cours`.
- R5.7.6. Une équipe est dissoute à la clôture du projet : accès en lecture seule pendant 90 jours, puis archivage.

### 5.8 Rendez-vous d'expertise

| Élément | Règle |
| --- | --- |
| Types | individuel (1 incubé) ou collectif (jusqu'à N participants, N ≤ 20) |
| Durées | 15, 30, 45, 60 ou 90 minutes |
| Modalités | visioconférence (lien saisi par le prestataire), téléphone, sur site (adresse) |
| Créneaux | ponctuels ou récurrents (hebdomadaire, par jour et plage horaire) ; pause entre deux rendez-vous (0 à 30 min) ; horizon de réservation 90 jours ; délai minimal 12 h |
| Gratuité | Les rendez-vous d'expertise sont gratuits sur la Plateforme ; toute tarification éventuelle se fait hors Plateforme en V1 |
| Fuseau | Europe/Paris par défaut, fuseau du prestataire affiché sur chaque créneau |

- R5.8.1. **Aucune double réservation** : une contrainte d'exclusion en base (plage de temps par prestataire) garantit qu'un créneau ne peut être réservé qu'une fois, même en accès simultané.
- R5.8.2. Statuts : `proposé` (créneau ouvert) → `demandé` (si validation manuelle) → `confirmé` → `réalisé` | `annulé_incubé` | `annulé_prestataire` | `absent`. Le prestataire choisit entre confirmation automatique et manuelle ; en manuel, absence de réponse sous 48 h = refus automatique et notification.
- R5.8.3. Annulation ou déplacement par l'incubé jusqu'à 24 h avant : sans motif. Moins de 24 h : motif obligatoire. Trois absences non justifiées en 90 jours déclenchent un avertissement puis une restriction de réservation de 30 jours.
- R5.8.4. Rappels automatiques à J-1 et H-1 (email et in-app) ; fichier calendrier .ics joint à la confirmation et à chaque modification.
- R5.8.5. Après un rendez-vous `réalisé`, l'incubé est invité à évaluer l'échange (note rapide et commentaire facultatif) ; le prestataire peut saisir une note privée et marquer le suivi (ex. « devis envoyé »).
- R5.8.6. Rendez-vous collectif : places limitées, liste d'attente, annulation du créneau par le prestataire possible jusqu'à 24 h avant avec notification de tous les inscrits.
- R5.8.7. Un prestataire en congé (disponibilité `indisponible jusqu'au …`) ne propose aucun créneau sur la période ; les rendez-vous déjà confirmés l'obligent à les annuler explicitement.
- R5.8.8. Peut (lot 6) : synchronisation avec Google Calendar et Outlook en lecture pour masquer les créneaux déjà occupés.

### 5.9 Événements : conférences, webinaires, ateliers

| Champ | Règle |
| --- | --- |
| Type | `conférence`, `webinaire`, `atelier` (liste administrable) |
| Titre, description, intervenants (profils liés), thématiques | obligatoires |
| Date, durée, fuseau | date future ; chevauchement avec un autre événement du même organisateur : avertissement non bloquant |
| Modalité | présentiel (adresse), distanciel (lien), hybride |
| Capacité | nombre de places ou illimité ; **liste d'attente** automatique |
| Public et visibilité | `public` (visiteurs inclus), `membres` (connectés), `incubés` uniquement |
| Inscription | ouverture et clôture paramétrables ; questions complémentaires (≤ 5) |
| Prix | gratuit uniquement en V1 |
| Supports | fichiers ou liens déposés après l'événement ; lien de replay |

- R5.9.1. Statuts : `brouillon` → `publié` → `inscriptions_closes` → `terminé` | `annulé`.
- R5.9.2. Inscription : une par personne et par événement ; confirmation immédiate par email avec .ics ; si complet, mise en liste d'attente avec **promotion automatique** à la première désinscription (email avec 24 h pour confirmer, sinon place proposée au suivant).
- R5.9.3. Désinscription possible jusqu'au début de l'événement ; libère la place.
- R5.9.4. Inscription d'un visiteur non connecté à un événement public : email, prénom, nom, consentement ; création d'un contact (pas de compte).
- R5.9.5. Rappels : J-7 (si inscription > 7 jours avant), J-1, H-1. Annulation d'événement : notification immédiate à tous les inscrits et à la liste d'attente.
- R5.9.6. Émargement : QR code personnel par inscrit, scanné par l'organisateur ; à défaut, saisie manuelle. Résultat : `présent` ou `absent`.
- R5.9.7. Enquête de satisfaction envoyée automatiquement 2 h après la fin (note globale + commentaire) ; résultats agrégés pour l'organisateur et l'administrateur.
- R5.9.8. Les prestataires Premium peuvent créer des webinaires publics (2 par mois) ; ils sont modérés par l'animateur avant publication.
- R5.9.9. Export de la liste des inscrits (CSV) par l'organisateur : limité aux données consenties.

### 5.10 Messagerie interne

- R5.10.1. Fils de discussion : 1 à 1 (incubé ↔ prestataire), de **candidature**, de **projet/équipe** et de **rendez-vous**. Temps réel (Supabase Realtime), indicateur lu / non lu.
- R5.10.2. Un premier message d'un prestataire à un incubé n'est possible que dans le cadre d'une candidature, d'une invitation ou d'une réponse à une demande de contact ; **pas de prospection à froid**.
- R5.10.3. Un incubé peut contacter n'importe quel prestataire publié ; un prestataire Free peut répondre à un nombre illimité de messages entrants.
- R5.10.4. Pièces jointes ≤ 10 Mo, types autorisés (pdf, docx, xlsx, pptx, png, jpg, zip) ; analyse antivirus à l'envoi (Edge Function ou service tiers).
- R5.10.5. Blocage d'un correspondant, signalement d'un message, masquage par la modération ; les messages sont conservés 24 mois.
- R5.10.6. Notification par email d'un nouveau message, regroupée si plusieurs en 15 minutes ; réponse par email non supportée en V1.

### 5.11 Notifications

Canaux : in-app (cloche + compteur), email, et récapitulatifs (digest). Chaque utilisateur règle ses préférences par catégorie ; les notifications **transactionnelles** (sécurité, rendez-vous, paiement) ne peuvent pas être désactivées.

| Événement | Destinataire | Canal | Désactivable |
| --- | --- | --- | --- |
| Invitation incubé, validation ou refus d'un profil prestataire | concerné | email + in-app | non |
| Nouveau besoin correspondant | prestataires ciblés | selon le plan (3.1) | oui |
| Nouvelle candidature, changement de statut de candidature | incubé, prestataire | email + in-app | oui (digest possible) |
| Rendez-vous demandé, confirmé, annulé, rappels | les deux parties | email + in-app | non |
| Événement : inscription, liste d'attente, promotion, rappel, annulation | inscrit | email + in-app | non |
| Nouveau message | destinataire | in-app + email groupé | oui |
| Avis reçu, réponse à un avis | prestataire, incubé | in-app + email | oui |
| Projet à échéance, expiré, rappel de clôture | incubé | email + in-app | oui |
| Abonnement : essai bientôt terminé, paiement échoué, rétrogradation | prestataire | email + in-app | non |
| Signalement reçu ou traité | admin, auteur | in-app | non |

- R5.11.1. Les emails partent via un fournisseur transactionnel (Resend, Postmark ou SMTP) ; chaque envoi est journalisé (statut, échec) ; lien de désinscription pour les emails non transactionnels.
- R5.11.2. Plage silencieuse : aucun email non transactionnel entre 20 h et 8 h (Europe/Paris) ; ils sont reportés à 8 h.
- R5.11.3. Digest hebdomadaire : lundi 8 h, regroupe nouveaux besoins correspondants, événements à venir, candidatures en attente.

### 5.12 Avis et réputation

- R5.12.1. Seul un incubé ayant un lien établi avec le prestataire peut déposer un avis : projet `terminé` avec une candidature `acceptée`, ou rendez-vous `réalisé`. Un avis par couple (incubé, prestataire, projet ou rendez-vous).
- R5.12.2. Critères : qualité du travail, communication, respect des délais, rapport qualité/prix (1 à 5 chacun) + commentaire (≥ 30 car.) ; un avis sur rendez-vous ne comporte qu'une note globale.
- R5.12.3. Note affichée = moyenne pondérée : les avis de projet comptent 3 fois un avis de rendez-vous ; affichage dès 3 avis.
- R5.12.4. Modération automatique (mots interdits, coordonnées, injures) avant publication ; un avis signalé est masqué le temps de l'examen.
- R5.12.5. Le prestataire peut répondre une fois par avis ; il ne peut ni le supprimer ni le modifier. L'incubé peut modifier son avis pendant 14 jours.
- R5.12.6. L'administrateur peut masquer un avis avec motif tracé ; un avis masqué sort du calcul de la note.

### 5.13 Signalement et modération

- R5.13.1. Tout contenu (profil, offre, projet, message, avis, événement) peut être signalé avec un motif (contenu inapproprié, usurpation, spam, discrimination, contournement de la Plateforme, autre) et un commentaire.
- R5.13.2. File de modération classée par priorité (nombre de signalements, ancienneté, gravité du motif) ; objectif de traitement : 72 h.
- R5.13.3. Actions : classer sans suite, masquer le contenu, avertir l'utilisateur, suspendre (durée choisie), bannir. Chaque action envoie un email motivé et crée une entrée dans le journal d'audit.
- R5.13.4. Un utilisateur sanctionné peut contester une fois par email ou formulaire ; la contestation est examinée par un administrateur différent.


### 5.14 Opportunités commerciales et mise en relation — V2

- **V2-OPP-01** Une opportunité est créée depuis : contact entrant sur une offre, réponse acceptée à besoin ouvert, invitation ciblée acceptée, rendez-vous initié ou recommandation animateur. Un même couple besoin/prestataire ne crée qu'une opportunité active ; les origines secondaires s'ajoutent à l'historique.
- **V2-OPP-02** L'opportunité possède : entreprise prestataire, incubé propriétaire, organisation d'incubation, origine, source, statut, montant potentiel facultatif (centimes), date de prochain suivi, responsable, motifs de perte et dernier événement.
- **V2-OPP-03** Le prestataire consulte seulement ses opportunités ; l'incubé voit celles de ses demandes ; l'animateur voit son périmètre d'accompagnement, avec les données minimales utiles ; l'admin accède au périmètre nécessaire à l'exploitation avec audit.
- **V2-OPP-04** L'incubé et le prestataire peuvent déclarer séparément `mission_conclue` ; une mission n'est comptée comme *confirmée bilatéralement* que lorsque les deux déclarations concordent. Le montant déclaré est facultatif et n'est jamais assimilé au chiffre d'affaires de la plateforme.
- **V2-OPP-05** Pas de prospectage à froid : tout fil découle d'une demande ou d'une interaction autorisée. L'email, les coordonnées et les documents privés ne sont révélés que conformément aux règles de visibilité.
- **V2-OPP-06** Les relances automatiques sont limitées en fréquence, configurables et désactivables (sauf notifications transactionnelles) ; elles respectent les plages silencieuses.

### 5.15 Organisations prestataires, collaborateurs et avantages incubés — V2

- **V2-ORG-01** Une organisation prestataire constitue l'entité propriétaire des offres, savoir-faire, candidatures et abonnements ; un indépendant peut être représenté par une organisation à un seul membre.
- **V2-ORG-02** Les utilisateurs membres portent les rôles `proprietaire`, `gestionnaire`, `contributeur` ; seul le propriétaire ou un gestionnaire explicitement autorisé peut gérer les invitations. Le propriétaire seul peut changer l'abonnement, demander l'effacement de l'organisation ou transférer la propriété, avec contrôle renforcé et audit.
- **V2-ORG-03** Les sièges sont décomptés côté base au moment de l'invitation et de l'acceptation ; la rétrogradation suspend les accès collaborateurs au-delà du quota sans supprimer leur identité ni leur historique.
- **V2-ORG-04** Les demandes spontanées sont présentées au nom de l'organisation prestataire (visible ou alias) ; l'identité d'un collaborateur individuel reste privée, sauf choix explicite de l'organisation et de ce membre.
- **V2-ORG-05** L'avantage incubé est un contenu lié à une offre avec conditions, période, statut, prix indicatif facultatif et audience ; si expiration il redevient non visible. Les avantages ne sont exposés que via des vues ou RPC sécurisées.
- **V2-ORG-06** Les incubés sont rattachés à une structure d'accompagnement validée ; la vérification d'éligibilité se fait **côté serveur** à chaque accès à une offre réservée.

### 5.16 Interfaces et ergonomie des flux métiers — V2

- **V2-UX-01** Accueil connecté incubé : recherche unifiée, « Décrire mon besoin », demandes en cours, réponses en attente, rendez-vous et offres préférentielles.
- **V2-UX-02** Accueil prestataire : catalogue, demandes correspondantes, candidatures et quotas, opportunités, rendez-vous et plan.
- **V2-UX-03** Tableau administrateur : validations, demandes sans réponse, mises en relation en attente, délais, incidents email, paiements, métriques de conversion et arbitrages.
- **V2-UX-04** Sur chaque candidature, le produit explique la règle de visibilité et le prochain événement possible, sans créer de paiement implicite.
- **V2-UX-05** Les données fictives de démonstration sont séparées des données de production, visuellement identifiées en environnement de recette, avec comptes de test utilisables et scénarios de bout en bout.

## 6. Administration, tableaux de bord et indicateurs

L'administrateur voit **toute** l'activité ; l'animateur voit uniquement sa structure ; incubés et prestataires ont un tableau de bord personnel (sections 4 et 3.1). Les indicateurs sont calculés par des **vues SQL matérialisées** rafraîchies toutes les heures (temps réel pour les compteurs de la vue d'ensemble).

### 6.1 Fonctions d'administration

- Gestion des utilisateurs : recherche, fiche détaillée (profil, activité, plan, historique), validation, suspension, archivage, changement de rôle, réinitialisation d'accès, « voir comme » (lecture seule, tracé dans l'audit).
- Référentiels : compétences (avec synonymes et regroupements), secteurs, types d'événements, catégories d'offres, motifs de signalement. Fusion de deux compétences avec réaffectation automatique des liens.
- Contenus : consultation et modération de tous les profils, offres, projets, avis, messages signalés, événements.
- Configuration : plans, quotas, prix, poids du score de recherche, textes d'emails, feature flags, bannière d'annonce, pages légales.
- Journal d'audit : toute action d'administration et tout changement de statut (qui, quoi, quand, avant/après), non modifiable, conservé 5 ans.
- Exports CSV de chaque tableau et de chaque liste filtrée.

### 6.2 Tableaux de bord et indicateurs

Filtres communs : période (7 j, 30 j, 90 j, 12 mois, personnalisée), structure, secteur, compétence. Comparaison avec la période précédente.

| Tableau de bord | Indicateur | Définition | Alerte |
| --- | --- | --- | --- |
| **Vue d'ensemble** | Utilisateurs actifs | Comptes ayant au moins une connexion sur la période, par rôle | — |
|  | Nouveaux inscrits | Créations de compte par rôle et par semaine | baisse de 30 % sur 4 semaines |
|  | Demandes en attente | Prestataires à valider, signalements ouverts, avis à modérer | > 20 ou plus ancienne > 72 h |
| **Acquisition et activation** | Taux d'activation incubé | Incubés invités ayant complété leur profil et fait une action (recherche, besoin, RDV) sous 14 jours | < 60 % |
|  | Taux de validation prestataire | Prestataires validés / soumis ; délai moyen de validation | délai > 3 jours |
|  | Complétude moyenne des profils | Moyenne du score de complétude par rôle | < 70 % |
| **Marché (offre et demande)** | Recherches sans résultat | Nombre et liste des requêtes sans résultat, par compétence | top 10 affiché |
|  | Couverture par compétence | Pour chaque compétence : nombre de prestataires actifs et nombre de besoins publiés ; ratio | ratio besoins/prestataires > 3 |
|  | Disponibilité du réseau | Part de prestataires disponibles ou partiellement disponibles | < 50 % |
| **Projets et candidatures** | Entonnoir | Besoins publiés → avec ≥ 1 candidature → présélectionnés → acceptés → terminés, avec taux de passage | taux de réponse < 70 % |
|  | Délais | Médiane : publication → 1re candidature ; publication → sélection | 1re candidature > 5 jours |
|  | Projets sans candidature | Besoins ouverts depuis > 7 jours sans réponse, avec action suggérée (relance, diffusion, orientation animateur) | > 10 % |
|  | Candidatures par prestataire | Nombre, taux de sélection, concentration (part des 10 % les plus actifs) | concentration > 60 % |
| **Rendez-vous** | Volume et taux de réalisation | Proposés, réservés, réalisés, annulés, absents | absence > 15 % |
|  | Taux d'occupation des créneaux | Créneaux réservés / créneaux proposés, par prestataire | < 20 % |
| **Événements** | Inscriptions et présence | Inscrits, présents, taux de présence, liste d'attente | présence < 50 % |
|  | Satisfaction | Note moyenne par événement et par type | < 3,5 / 5 |
| **Revenus** | MRR et ARR | Revenu mensuel récurrent des abonnements, par plan | — |
|  | Conversion Free → payant | Prestataires passés en Pro ou Premium / prestataires actifs sur 90 jours | < 5 % |
|  | Churn | Abonnements arrêtés / abonnements actifs, par mois | > 8 % |
|  | Ventes d'options | Boosts, packs, mises en avant : volume et chiffre d'affaires | — |
| **Qualité et modération** | Signalements | Volume, motifs, délai moyen de traitement, taux de suites | délai > 72 h |
|  | Note moyenne et distribution | Note globale, part d'avis ≤ 2 sur 5, prestataires sous 3 sur 5 | prestataire < 3 sur 5 avec ≥ 5 avis |
| **Santé technique** | Erreurs et emails | Erreurs applicatives, emails en échec, webhooks Stripe en échec, jobs planifiés en retard | tout échec de webhook ; > 2 % d'emails en échec |

### 6.3 Tableau de bord de l'animateur

Périmètre = les incubés de sa structure : incubés actifs ou inactifs depuis 30 jours (à relancer), besoins publiés sans réponse, rendez-vous réalisés, événements animés et taux de présence, recommandations faites. Aucune donnée d'une autre structure n'est accessible.

### 6.4 Alertes et rapports

- R6.4.1. Chaque alerte (colonne « Alerte ») envoie une notification in-app à l'administrateur et un email si l'alerte reste active 24 h.
- R6.4.2. Rapport mensuel automatique par email (PDF ou lien) le 1er du mois : synthèse des indicateurs clés, top compétences, projets sans suite, revenus.
- R6.4.3. Les seuils d'alerte sont modifiables dans la configuration ; un indicateur peut être épinglé en haut de la vue d'ensemble (jusqu'à 6).

## 7. Modèle de données Supabase

Base PostgreSQL (Supabase). Noms de tables et de colonnes en français, `snake_case`, sans accents. Le générateur de code doit produire des **migrations SQL versionnées** (dossier `supabase/migrations`), jamais de modification manuelle dans la console.

### 7.1 Conventions

- Clé primaire `id uuid default gen_random_uuid()` ; `created_at`, `updated_at` (trigger automatique) sur toutes les tables ; suppression logique `deleted_at` sur profils, offres, projets, avis.
- Colonne `organisation_id` sur toutes les tables métier (multi-structure, hypothèse H1).
- Statuts en **types énumérés** Postgres (`create type … as enum`), transitions contrôlées par triggers (section 8).
- Montants en centimes (`integer`), devise `EUR`. Dates en `timestamptz`.
- Extensions : `pgcrypto`, `unaccent`, `pg_trgm`, `btree_gist` (contrainte d'exclusion), `pg_cron` (tâches planifiées).
- Recherche : colonne `tsv tsvector` générée (configuration `french` + `unaccent`) avec index GIN sur profils prestataires, offres, projets ; index `pg_trgm` sur libellés de compétences.

### 7.2 Tables par domaine

| Domaine | Table | Colonnes clés | Notes |
| --- | --- | --- | --- |
| Identité | `organisations` | nom, slug, logo\_url, actif | structure d'incubation |
|  | `profiles` | id (= `auth.users.id`), organisation\_id, role (`incube`, `prestataire`, `admin`), est\_animateur, statut (`invité`, `actif`, `en_validation`, `suspendu`, `archivé`), nom, prenom, avatar\_url, cgu\_version, cgu\_acceptee\_le, derniere\_connexion | un profil par compte |
|  | `invitations` | email, role, organisation\_id, jeton\_hash, expire\_le, utilisee\_le, invite\_par | jeton à usage unique, 14 jours |
|  | `consentements` | profile\_id, type (`cgu`, `confidentialite`, `marketing`), version, accorde\_le, revoque\_le | preuve RGPD |
| Prestataires | `prestataires` | profile\_id (PK), type, nom\_affichage, accroche, presentation, tarif\_min, tarif\_max, tarif\_unite, disponibilite (`disponible`, `partielle`, `indisponible`), indisponible\_jusqu, ouvert\_equipe, siret, statut\_validation, motif\_refus, completude, valide\_le, valide\_par | `tsv` généré |
|  | `prestataire_contacts` | prestataire\_id, type (`email`, `telephone`, `site`, `linkedin`), valeur, visibilite (`public`, `connectes`, `apres_relation`, `prive`) | exposé via vue sécurisée uniquement |
|  | `prestataire_membres` | prestataire\_id, profile\_id, role (`proprietaire`, `collaborateur`) | sièges Premium |
|  | `prestataire_competences` | prestataire\_id, competence\_id, niveau, annees, est\_principale | clé (prestataire, compétence) |
|  | `savoir_faire` | prestataire\_id, competence\_id, titre, description, liens (jsonb), pieces | blocs libres |
| Incubés | `incubes` | profile\_id (PK), startup\_nom, secteur\_id, stade, site, besoins\_competences (uuid\[\]), visibilite\_contact |  |
| Référentiels | `competences` | parent\_id, libelle, slug, actif, ordre | arborescence à 2 niveaux |
|  | `competence_synonymes` | competence\_id, terme | alimente la recherche et l'assistant |
|  | `secteurs`, `types_evenement`, `motifs_signalement` | libelle, actif, ordre | administrables |
| Offres | `offres` | prestataire\_id, titre, description, livrables, format, duree\_type, tarif\_type, tarif\_montant, secteurs (uuid\[\]), mots\_cles (text\[\]), statut, boost\_jusqu, publiee\_le | `tsv` généré |
|  | `offre_competences` | offre\_id, competence\_id, est\_principale |  |
| Projets | `projets` | incube\_id, titre, resume, description, type (`besoin_cible`, `besoin_ouvert`, `projet`), confidentialite, statut, budget\_min, budget\_max, echeance\_reponse, prolongations, debut\_souhaite, duree\_jours, format, publie\_le |  |
|  | `projet_roles` | projet\_id, competence\_id, titre, description, charge\_jours, budget\_min, budget\_max, statut (`vacant`, `pourvu`) | 1 à 10 par projet |
|  | `projet_invitations` | projet\_id, prestataire\_id, statut (`envoyee`, `acceptee`, `declinee`), motif | n'utilise pas de quota |
|  | `candidatures` | role\_id, prestataire\_id, message, tarif, delai\_jours, statut, quota\_consomme (booleen), retiree\_le | unicité (role, prestataire) actifs |
|  | `candidature_questions` | candidature\_id, auteur\_id, texte, cree\_le | fil léger lié à la candidature |
| Équipes | `equipes`, `equipe_membres`, `equipe_taches` | projet\_id, nom ; equipe\_id, profile\_id, role, statut ; titre, statut, assigne\_a, echeance | rôles définis en 5.7.3 |
| Rendez-vous | `creneaux` | prestataire\_id, debut, fin, type (`individuel`, `collectif`), capacite, modalite, lien, adresse, confirmation (`auto`, `manuelle`), statut, regle\_id | **contrainte d'exclusion** sur (prestataire\_id, plage) |
|  | `creneau_regles` | prestataire\_id, jour\_semaine, heure\_debut, heure\_fin, duree, pause, valide\_du, valide\_au | génère les créneaux sur 90 jours |
|  | `rendez_vous` | creneau\_id, incube\_id, statut, motif\_annulation, annule\_par, note\_privee, evalue (booleen) | un par participant |
| Événements | `evenements` | organisateur\_id, type\_id, titre, description, debut, fin, modalite, adresse, lien, capacite, visibilite, inscription\_ouvre\_le, inscription\_ferme\_le, statut, replay\_url |  |
|  | `evenement_intervenants`, `evenement_supports` | evenement\_id, prestataire\_id ; titre, url, fichier |  |
|  | `inscriptions_evenement` | evenement\_id, profile\_id ou contact\_externe\_id, statut (`inscrit`, `liste_attente`, `annule`, `present`, `absent`), rang\_attente, reponses (jsonb), qr\_jeton | unicité (événement, personne) |
|  | `contacts_externes` | email, prenom, nom, consentement\_le | visiteurs non connectés |
| Messagerie | `fils`, `fil_participants`, `messages`, `message_pieces` | type (`direct`, `candidature`, `projet`, `rendez_vous`), objet\_id ; fil\_id, profile\_id, lu\_jusqua ; fil\_id, auteur\_id, corps, masque ; message\_id, fichier | Realtime activé sur `messages` |
| Avis | `avis` | auteur\_id, prestataire\_id, source\_type (`projet`, `rendez_vous`), source\_id, note\_qualite, note\_communication, note\_delais, note\_prix, note\_globale, commentaire, statut, reponse, reponse\_le | unicité (auteur, source) |
| Modération | `signalements`, `moderation_actions` | auteur\_id, cible\_type, cible\_id, motif, commentaire, statut ; signalement\_id, admin\_id, action, motif, duree |  |
| Monétisation | `plans` | code (`free`, `pro`, `premium`), prix\_mensuel, prix\_annuel, quotas (jsonb), actif | valeurs de 3.1 |
|  | `abonnements` | prestataire\_id, plan\_id, stripe\_client\_id, stripe\_abonnement\_id, statut, debut, fin\_periode, essai\_fin, annule\_en\_fin |  |
|  | `usage_quotas` | prestataire\_id, periode (mois), type (`candidatures`, `offres`, `webinaires`), consomme, bonus | remise à zéro mensuelle |
|  | `options_achetees` | prestataire\_id, type, cible\_id, debut, fin, stripe\_paiement\_id | boosts, packs |
|  | `evenements_stripe` | stripe\_event\_id (PK), type, traite\_le, payload | idempotence des webhooks |
| Usage | `notifications`, `preferences_notification`, `journal_emails` | profile\_id, type, titre, lien, lu\_le ; profile\_id, categorie, canal, frequence ; destinataire, modele, statut, erreur |  |
|  | `favoris`, `recherches_sauvegardees` | profile\_id, cible\_type, cible\_id ; profile\_id, criteres (jsonb), alerte |  |
|  | `analytics_evenements` | type (`vue_profil`, `vue_offre`, `clic_contact`, `recherche`), acteur\_id, cible\_id, contexte (jsonb), resultats | alimente les indicateurs, purgé après 24 mois |
| Pilotage | `audit_log` | acteur\_id, action, cible\_type, cible\_id, avant (jsonb), apres (jsonb), ip, cree\_le | insertion seule, aucune modification possible |
|  | `parametres`, `feature_flags` | cle, valeur ; code, actif, perimetre | poids de recherche, seuils d'alerte |

### 7.3 Sécurité : Row Level Security (RLS)

RLS est **activée sur toutes les tables** du schéma `public`, sans exception, avec refus par défaut. Aucune clé `service_role` n'est jamais exposée au navigateur ; elle ne sert que dans les Edge Functions. Des fonctions `security definer` utilitaires (`est_admin()`, `est_animateur()`, `mon_organisation()`, `est_membre_equipe(projet_id)`) servent aux politiques.

| Table ou vue | Lecture | Écriture |
| --- | --- | --- |
| `profiles` | le titulaire ; l'admin ; l'animateur de la même organisation ; données publiques via vue `profils_publics` | le titulaire (hors `role`, `statut`) ; l'admin |
| `prestataires` (publié) | tout utilisateur connecté (colonnes publiques) ; visiteur : vue `annuaire_public` limitée | le prestataire (et ses collaborateurs) sur son profil ; l'admin |
| `prestataire_contacts` | selon `visibilite` : public, connecté, ou après relation (candidature ou rendez-vous existants) via fonction `peut_voir_contact()` | le prestataire ; l'admin |
| `offres` | publiées : tout connecté ; brouillons : le propriétaire | le propriétaire sous contrôle de quota (trigger) ; l'admin |
| `projets`, `projet_roles` | selon `confidentialite` : public = prestataires et incubés connectés ; restreint = titre et résumé seulement ; privé = propriétaire, invités, équipe | l'incubé propriétaire ; l'animateur de son organisation ; l'admin |
| `candidatures` | le prestataire auteur ; l'incubé propriétaire du projet ; l'admin | le prestataire auteur (création, modification, retrait) ; l'incubé propriétaire (changement de statut uniquement) |
| `creneaux`, `rendez_vous` | créneaux ouverts : tout connecté ; rendez-vous : les deux parties, l'admin | le prestataire (créneaux) ; l'incubé (réservation via fonction `reserver_creneau`) |
| `evenements` | publics : tous ; membres et incubés selon la visibilité | l'organisateur ; l'animateur ; l'admin |
| `inscriptions_evenement` | la personne inscrite ; l'organisateur ; l'admin | via fonctions `inscrire_evenement` et `annuler_inscription` uniquement |
| `messages`, `fils` | participants du fil ; l'admin pour un fil signalé | participants (insertion) ; aucun UPDATE de contenu |
| `avis` | publiés : tout connecté ; le prestataire voit ses avis | l'auteur (14 jours) ; réponse du prestataire via fonction ; l'admin (masquage) |
| `abonnements`, `usage_quotas`, `options_achetees` | le prestataire concerné ; l'admin | **Edge Functions seulement** (webhooks Stripe, `service_role`) |
| `audit_log` | l'admin | insertion par triggers et fonctions ; **jamais** d'UPDATE ou de DELETE |
| `parametres`, `feature_flags`, `plans` | plans actifs et drapeaux : tous ; paramètres : l'admin | l'admin |

- R7.3.1. Les écritures sensibles (réservation, inscription, candidature, acceptation, avis, consommation de quota) passent par des **fonctions SQL `rpc`** transactionnelles qui vérifient droits, quotas et états ; aucune insertion directe sur ces tables depuis le client.
- R7.3.2. Chaque politique est testée automatiquement (tests pgTAP ou script SQL) avec des utilisateurs de chaque rôle : un test de non-régression par ligne de la table ci-dessus.
- R7.3.3. Le téléversement de fichiers passe par des URL signées à durée courte ; les fichiers privés ne sont jamais publics.

### 7.4 Stockage (Supabase Storage)

| Bucket | Contenu | Accès | Limites |
| --- | --- | --- | --- |
| `avatars` | photos et logos | public en lecture | 2 Mo, jpg/png/webp |
| `offres` | pièces d'offres et portfolios | lecture selon la visibilité de l'offre | 5 Mo par fichier |
| `projets` | pièces de besoins et de projets | lecture selon la confidentialité du projet | 10 Mo au total par projet |
| `candidatures` | pièces de candidature | prestataire auteur, incubé propriétaire | 3 fichiers, 5 Mo chacun |
| `messages` | pièces de messagerie | participants du fil | 10 Mo |
| `evenements` | supports et visuels | public ou membres selon l'événement | 50 Mo par fichier |
| `exports` | exports RGPD et CSV | propriétaire, expiration 7 jours | — |

### 7.5 Fonctions, déclencheurs et tâches planifiées

| Élément | Rôle |
| --- | --- |
| `rpc.reserver_creneau(creneau_id)` | Réserve un créneau, gère la liste d'attente des collectifs, échoue proprement en cas de conflit |
| `rpc.inscrire_evenement(evenement_id, reponses)` | Inscrit ou met en liste d'attente ; renvoie la position |
| `rpc.candidater(role_id, …)` | Vérifie statut du projet, quota, unicité ; consomme un quota de façon atomique |
| `rpc.changer_statut_candidature(id, statut)` | Contrôle la transition et notifie |
| `rpc.recherche_prestataires(params)` | Recherche plein texte, filtres, score pondéré, pagination |
| `rpc.suggerer_competences(texte)` | Assistant de besoin (R5.4.4) |
| `trigger.verifier_quota_offre` | Bloque la publication d'une offre au-delà du quota du plan |
| `trigger.audit_statut` | Écrit dans `audit_log` à chaque changement de statut |
| `trigger.calculer_completude` | Recalcule le score de complétude du profil |
| `trigger.maj_note_prestataire` | Recalcule la note moyenne pondérée (R5.12.3) |
| `cron.generer_creneaux` (quotidien) | Crée les créneaux récurrents sur l'horizon de 90 jours |
| `cron.cloturer_projets` (horaire) | Passe les projets à l'échéance en `en_sélection`, expire les projets inactifs |
| `cron.rappels` (toutes les 15 min) | Rappels de rendez-vous et d'événements, relances de paiement |
| `cron.raz_quotas` (mensuel) | Remise à zéro des quotas, expiration des packs |
| `cron.rafraichir_indicateurs` (horaire) | Rafraîchit les vues matérialisées du tableau de bord |
| `cron.rgpd` (quotidien) | Anonymise les comptes archivés depuis plus de 12 mois, purge les données expirées |
| Edge Function `stripe-webhook` | Reçoit et vérifie la signature des webhooks, met à jour les abonnements (R3.9) |
| Edge Function `envoyer-emails` | Envoi des emails depuis une file (`journal_emails`), reprise en cas d'échec |
| Edge Function `creer-session-paiement` | Crée la session Stripe Checkout ou le portail client |
| Edge Function `export-donnees` | Génère l'export RGPD d'un utilisateur |


### 7.6 Évolutions du modèle relationnel V2 — migrations obligatoires

> Les tables historiques de 7.2 sont conservées comme base conceptuelle. À l'implémentation, les références `prestataire_id` des contenus commerciaux pointent vers `organisations_prestataires.id` via migrations versionnées (sans suppression de données). `prestataires` conserve les données de vitrine et de validation de l'entité. `prestataire_membres` est remplacée ou migrée sans duplication vers `organisation_prestataire_membres`.

| Table ajoutée / évolution | Champs essentiels | Contraintes métier |
| --- | --- | --- |
| `organisations_prestataires` | `id`, `organisation_id`, `nom_legal`, `nom_public`, `siret`, `statut_validation`, `proprietaire_profile_id` | SIRET privé, contrôle de validation, propriétaire unique |
| `organisation_prestataire_membres` | `organisation_prestataire_id`, `profile_id`, `role`, `statut`, `invitation_id` | Unicité membership actif, quotas de sièges, audit |
| `offres_avantages_incubes` | `offre_id`, `organisation_id`, `titre`, `conditions`, `prix_indicatif_centimes`, `debut`, `fin`, `statut` | Visibilité incubé validé via vue/RPC dédiée |
| `opportunites` | `organisation_id`, `organisation_prestataire_id`, `incube_id`, `source_type`, `source_id`, `statut`, `prochain_suivi`, `montant_potentiel_centimes`, `version` | Index sur propriétaire et source, unicité métier active, suivi audité |
| `opportunite_evenements` | `opportunite_id`, `acteur_id`, `type`, `ancien_statut`, `nouveau_statut`, `metadata` | Append-only et traçabilité |
| `mises_en_relation` | `opportunite_id`, `candidature_id`, `demande_par`, `demande_le`, `reponse_par`, `reponse_le`, `statut`, `consentement_version` | `demandee` → `acceptee` / `refusee` / `expiree`; révélation après acceptation |
| `candidature_identites` (accès fermé) | `candidature_id`, `organisation_prestataire_id`, `alias_public`, `revelee_le` | Ne jamais exposer cette table par API générique ; lecture RPC filtrée |
| `conclusions_mission` | `opportunite_id`, `acteur_id`, `decision`, `date_declaration` | Une déclaration courante par partie ; bilatéral distinct du déclaratif |
| `plan_versions` | `plan_id`, `version`, `applicable_le`, `quotas_json`, `tarification_json` | Historique immuable ; vérifications par version applicable |
| `outbox_evenements` | `id`, `cle_idempotence`, `type`, `charge_utile`, `statut`, `tentatives`, `prochain_essai` | Unicité de clé, gestion de relance et échec durable |

**Compatibilité** : les champs existants restent nommés en français sans accents lorsque possible. Toutes les nouvelles entités métier ont une clé `uuid`, des timestamps, un `organisation_id` (sauf table véritablement globale) et des politiques RLS. Les vues publiques sont explicitement listées et testées. Les vues d'accès anonyme sont fondées sur des projections sûres, **jamais sur un simple masquage en interface**.

### 7.7 RPC, RLS et sécurité de l'anonymisation — V2

- **V2-SEC-01** `rpc.envoyer_candidature_ouverte(...)` vérifie invitation absente, validité de l'offre, quota et absence de doublon sous verrou transactionnel ; calcule l'alias et le statut d'anonymisation. Les candidatures d'invitation utilisent `rpc.repondre_invitation(...)` sans quota.
- **V2-SEC-02** `rpc.demander_mise_en_relation(candidature_id)` (incubé propriétaire) et `rpc.repondre_mise_en_relation(id, acceptation)` (organisation candidate habilitée) réalisent les transitions atomiquement ; la révélation dépend de l'état accepté et est journalisée.
- **V2-SEC-03** `rpc.lister_candidatures_pour_incube(projet_id)` fournit un objet expurgé pour les Free anonymes ; aucune requête directe à `candidatures`, `prestataires`, `organisation_prestataire_membres` ou Storage ne doit reconstituer l'identité.
- **V2-SEC-04** `rpc.obtenir_offre_avantage(offre_id)` contrôle l'appartenance à une structure d'incubation validée au moment de la requête.
- **V2-SEC-05** `rpc.creer_ou_mettre_a_jour_opportunite(...)` exige une source autorisée, idempotence et contrôle d'appartenance multi-tenant ; la mise à jour de statut utilise un verrou optimiste `version` ou `for update`.
- **V2-SEC-06** Toutes les fonctions `SECURITY DEFINER` imposent `search_path` fixé, qualification explicite des schémas, limitation `EXECUTE` aux seuls rôles requis, et vérification `auth.uid()`/membership à l'entrée. Les schémas contenant les tables privées ne sont pas exposés dans les API publiques.
- **V2-SEC-07** Les ressources privées sont servies par URL signée courte uniquement après contrôle d'accès. Le service d'analyse des pièces doit vérifier le contenu réel et l'absence de fuite d'identité avant communication dans le canal anonyme.
- **V2-SEC-08** Le rôle administrateur est provisionné via un bootstrap sécurisé et traçable, indépendant des données fictives et jamais via une élévation de rôle depuis le client. 2FA est vérifiée dans les actions sensibles, pas uniquement proposée à l'interface.
- **V2-SEC-09** Les membres d'une structure d'incubation ne disposent pas automatiquement d'accès aux données d'une autre structure ; les prestataires transversaux ne voient que leurs propres dossiers. Les fonctions de recherche n'exposent que les informations publiables.
- **V2-SEC-10** Les paiements Stripe suivent un état métier reconstruit à partir des objets Stripe actuels lors de la réconciliation ; les webhooks enregistrés servent de trace idempotente, et un événement plus ancien ne rétrograde jamais l'état récent.

### 7.8 Fiabilité et exploitation opérationnelle V2

- **V2-OPS-01** Notifications, emails, rappels et webhooks métier passent par une outbox persistée dans la même transaction que l'événement métier ; chaque job est idempotent, relançable et observable.
- **V2-OPS-02** Le dispositif de sauvegarde doit être vérifié par restauration en préproduction ; aucun objectif de disponibilité n'est présenté comme garanti sans monitoring et service adapté.
- **V2-OPS-03** Un bootstrap admin reproductible fournit les étapes de récupération d'accès, de remise à zéro MFA et de rotation de secrets, avec vérification d'identité et audit.
- **V2-OPS-04** Le jeu de données de recette inclut les cas d'anonymat, d'offres incubés, de comptes Free/Pro/Premium, d'invitations, de paiements simulés, de conflits de réservation et de multi-structure.
- **V2-OPS-05** Les opérations planifiées doivent être compatibles avec les capacités du plan Supabase choisi ; l'orchestration externe, si nécessaire, est spécifiée et configurée par environnement.

## 8. Règles de gestion, états et cas limites

Toute transition non listée ci-dessous est **refusée** par la base (trigger) avec un message d'erreur explicite ; l'interface n'affiche que les actions permises.

### 8.1 Transitions autorisées

| Entité | De | Vers | Qui | Condition |
| --- | --- | --- | --- | --- |
| Prestataire | `en_validation` | `actif` | admin | profil ≥ 70 %, SIRET renseigné si société |
|  | `en_validation` | `refusé` | admin | motif obligatoire ; le prestataire peut corriger et resoumettre |
|  | `actif` | `suspendu` | admin | motif et durée ; masqué de la recherche, données conservées |
|  | `suspendu` | `actif` | admin | à échéance ou manuellement |
|  | tout | `archivé` | prestataire (demande) ou admin | rendez-vous et candidatures ouverts annulés avec notification |
| Offre | `brouillon` | `en_modération` puis `publiée` | prestataire | quota disponible ; contrôle automatique réussi |
|  | `publiée` | `hors_quota` | système | rétrogradation de plan |
|  | `hors_quota` | `publiée` | prestataire | quota disponible |
|  | `publiée` | `archivée` | prestataire ou admin | — |
| Projet | `brouillon` | `publié` | incubé | champs obligatoires, échéance ≥ 3 jours |
|  | `publié` | `en_sélection` | système (échéance) ou incubé | au moins une candidature, sinon l'incubé choisit de prolonger ou d'annuler |
|  | `en_sélection` | `en_cours` | incubé | au moins un rôle `pourvu` |
|  | `en_cours` | `terminé` | incubé ou animateur | déclenche les invitations à noter |
|  | `publié`, `en_sélection` | `annulé` | incubé | candidats notifiés, quotas **non** restitués |
|  | `publié` | `expiré` | système | 60 jours sans action après échéance |
| Candidature | `envoyée` | `consultée` | système | première ouverture par l'incubé |
|  | `envoyée`, `consultée` | `présélectionnée`, `refusée` | incubé | — |
|  | `présélectionnée` | `entretien`, `acceptée`, `refusée` | incubé | `acceptée` : le rôle n'est pas déjà `pourvu` |
|  | `envoyée`…`présélectionnée` | `retirée` | prestataire | avant décision finale |
|  | `acceptée` | `confirmée` | prestataire | sous 5 jours ; sinon retour en `présélectionnée` |
|  | tout actif | `expirée` | système | projet annulé, expiré ou rôle pourvu à un autre |
| Créneau | `proposé` | `demandé` ou `confirmé` | incubé | selon le mode de confirmation ; contrainte d'exclusion |
|  | `demandé` | `confirmé` ou `refusé` | prestataire | 48 h, sinon refus automatique |
|  | `confirmé` | `réalisé`, `absent`, `annulé_incubé`, `annulé_prestataire` | prestataire ou incubé | `réalisé` et `absent` après l'heure de début |
| Événement | `brouillon` | `publié` | organisateur | date future ; modération préalable si prestataire |
|  | `publié` | `inscriptions_closes` | système ou organisateur | date de clôture atteinte ou complet sans liste d'attente |
|  | `publié`, `inscriptions_closes` | `terminé` | système | après l'heure de fin |
|  | `publié`, `inscriptions_closes` | `annulé` | organisateur ou admin | notification de tous |
| Avis | `en_modération` | `publié`, `masqué` | système puis admin | contrôle automatique, puis signalement éventuel |

### 8.2 Cas limites et comportement attendu

| Cas | Comportement attendu |
| --- | --- |
| Deux incubés réservent le même créneau en même temps | Le premier gagne ; le second reçoit « Ce créneau vient d'être réservé » et la liste des créneaux voisins |
| Le dernier quota de candidature est utilisé par deux onglets | La fonction `rpc.candidater` est atomique : une seule candidature passe, l'autre est refusée avec message de quota |
| Un prestataire rétrograde alors qu'il a 6 offres publiées | Voir R3.5 ; aucune donnée supprimée, choix guidé des offres à conserver |
| Un prestataire suspendu a des rendez-vous confirmés | Rendez-vous annulés avec notification aux incubés et proposition de créneaux d'autres prestataires de la même compétence |
| Un incubé supprime son compte avec des projets en cours | Refusé tant que des projets sont `en_cours` ; sinon projets annulés, candidats notifiés, données anonymisées |
| Un projet public reçoit des candidatures puis passe en `privé` | Les candidatures existantes restent valides ; aucune nouvelle candidature possible |
| Un rôle est pourvu et un autre candidat de ce rôle est déjà `entretien` | Refus automatique avec message standard, rendez-vous d'entretien annulé |
| Deux candidats acceptés pour un rôle à un seul poste | Impossible : l'acceptation est refusée si le rôle est `pourvu` |
| L'échéance tombe à minuit pendant la rédaction d'une candidature | À l'envoi, refus avec message ; le brouillon est conservé 7 jours |
| Événement complet, désinscription à quelques minutes du début | La place est proposée au premier de la liste d'attente avec délai de confirmation raccourci à 30 minutes |
| Inscription d'un même email à un événement, en visiteur puis connecté | Fusion des inscriptions par email ; pas de doublon |
| Changement d'heure d'été ou d'hiver | Les créneaux récurrents sont recalculés en heure locale ; une règle à 14 h reste à 14 h locales |
| Prestataire modifie son tarif après des candidatures acceptées | Aucun effet sur les accords en cours ; seules les nouvelles candidatures utilisent le nouveau tarif |
| Webhook Stripe reçu deux fois ou dans le désordre | Idempotence sur `stripe_event_id` ; traitement selon la date de l'événement, jamais d'écrasement par un événement plus ancien |
| Email invalide ou rebond | L'envoi est marqué en échec ; après 3 échecs, bandeau dans l'application « Vérifiez votre adresse email » |
| Compétence supprimée du référentiel | Désactivation seulement (jamais de suppression) ; les liens existants sont conservés mais la compétence n'est plus proposée |
| Tentative d'accès à une ressource d'un autre utilisateur par URL | Réponse « introuvable » (pas « interdit ») pour ne pas révéler l'existence |
| Fichier téléversé infecté ou de type interdit | Refus, message clair, aucun enregistrement |
| Utilisateur sans connexion Internet pendant une saisie | Brouillons conservés localement (formulaires de projet, offre, candidature) et restaurés à la reconnexion |

### 8.3 Règles transverses

- R8.3.1. **Concurrence** : toute opération qui modifie un état partagé (quota, place, créneau, rôle pourvu) s'exécute dans une transaction avec verrouillage de ligne.
- R8.3.2. **Idempotence** : les actions déclenchées par l'utilisateur (clic double, rechargement) ne créent pas de doublon ; clé d'idempotence sur les fonctions rpc de création.
- R8.3.3. **Archivage plutôt que suppression** : sauf demande RGPD, aucune suppression physique de données métier.
- R8.3.4. **Traçabilité** : chaque transition de la table 8.1 écrit une ligne dans `audit_log`.
- R8.3.5. **Messages d'erreur** : clairs, en français, indiquant la cause et l'action possible ; aucun message technique affiché à l'utilisateur.


### 8.4 Transitions et arbitrages V2 prioritaires

| Entité | Transitions | Condition |
| --- | --- | --- |
| Mise en relation | `demandee` → `acceptee` / `refusee` / `expiree` | Demande incubé ; réponse du prestataire habilité ; révélation uniquement à `acceptee` |
| Opportunité | `nouvelle` → `qualifiee` → `contact_etabli` → `rdv_planifie` → `proposition_transmise` → `gagnee` / `perdue` / `sans_suite` | Transitions intermédiaires pouvant être sautées si événements source justifiés ; passage à statut final toujours motivé |
| Candidature | `acceptee` → `confirmee` puis rôle `pourvu` | Les autres candidatures ne sont définitivement refusées qu'après `confirmee`, et non dès `acceptee` |
| Candidature Free anonyme | `envoyee` → `relation_demandee` (état séparé) → `relation_acceptee` | Le dossier est pseudonymisé avant double accord, les pièces non validées restent cachées |
| Avantage incubé | `brouillon` → `en_validation` → `publie` → `expire` / `archive` | Visibilité serveur conditionnée au statut et à l'éligibilité incubé |

- **V2-ETAT-01** Le projet `restreint` fournit avant candidature une description opérationnelle suffisante et non confidentielle ; les pièces confidentielles nécessitent une invitation à accéder ou un NDA géré hors plateforme, sans obligation de candidater à l'aveugle.
- **V2-ETAT-02** La capacité d'un rendez-vous collectif est gérée au niveau des inscriptions/participants ; la contrainte d'exclusion protège le temps du prestataire entre sessions, pas la capacité de chaque participant.
- **V2-ETAT-03** Un projet sans candidature à l'échéance ne passe pas automatiquement en sélection : l'incubé choisit prolongation, clôture ou sollicitation assistée. La règle de 60 jours d'inactivité reste à appliquer suivant le statut explicite.
- **V2-ETAT-04** Les règles de stockage des pièces et la visibilité des coordonnées sont harmonisées : jamais d'accès brut permettant de contourner la confidentialité des projets ou candidatures.

## 9. Exigences non fonctionnelles

### 9.1 Protection des données (RGPD)

| Exigence | Spécification |
| --- | --- |
| Base légale et information | Politique de confidentialité et CGU versionnées ; consentement distinct pour l'envoi d'emails non transactionnels |
| Minimisation | Seules les données listées en section 7 sont collectées ; pas de données sensibles (santé, opinions) |
| Droit d'accès et de portabilité | Export JSON et CSV de toutes les données de l'utilisateur en moins de 24 h (Edge Function `export-donnees`) |
| Droit à l'effacement | Suppression à la demande : anonymisation des données personnelles, conservation des données agrégées et des avis anonymisés (« ancien utilisateur ») |
| Durées de conservation | Compte archivé : anonymisé après 12 mois ; messages : 24 mois ; analytics : 24 mois ; audit : 5 ans ; factures : 10 ans (portées par Stripe) |
| Hébergement | Projet Supabase dans une région **UE** (Francfort ou Paris selon disponibilité) ; Netlify en CDN ; sous-traitants listés dans la politique de confidentialité |
| Cookies et traceurs | Cookies strictement nécessaires uniquement ; mesure d'audience sans traceur (ou avec consentement) ; bandeau de consentement si autre usage |
| Registre et violation | Journal d'audit exploitable pour le registre des traitements ; procédure de notification de violation à documenter hors application |

### 9.2 Sécurité

- Toutes les communications en HTTPS ; en-têtes de sécurité définis dans Netlify (`Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`).
- Aucune clé secrète dans le code client ni dans le dépôt ; variables d'environnement Netlify et secrets Supabase.
- Validation des entrées côté serveur (contraintes `check`, types, longueurs) en plus de la validation du formulaire ; échappement de tout contenu utilisateur affiché (protection XSS) ; texte riche filtré par liste blanche de balises.
- Limitation de débit : connexion, envoi de messages, candidatures, recherche (par utilisateur et par IP) pour freiner l'abus.
- Protection anti-robot (captcha) sur l'inscription prestataire et le formulaire de contact.
- Sauvegarde quotidienne de la base avec restauration testée chaque trimestre ; point-in-time recovery activé si le plan Supabase le permet.
- Dépendances mises à jour régulièrement, analyse automatique des vulnérabilités dans l'intégration continue.

### 9.3 Performance et disponibilité

| Critère | Cible |
| --- | --- |
| Chargement initial d'une page publique (réseau 4G) | LCP < 2,5 s |
| Réponse d'une recherche | < 800 ms au 95e centile pour 10 000 prestataires et 50 000 offres |
| Écriture courante (candidature, réservation) | < 500 ms au 95e centile |
| Disponibilité mensuelle | 99,5 % |
| Montée en charge de référence | 2 000 utilisateurs actifs par mois, 200 simultanés |
| Pagination | Toutes les listes sont paginées côté serveur (20 éléments) |

### 9.4 Accessibilité, ergonomie et compatibilité

- Conformité **RGAA / WCAG 2.1 niveau AA** : contrastes, navigation au clavier, labels de formulaire, textes alternatifs, focus visible, messages d'erreur liés aux champs.
- Interface **responsive** : smartphone (≥ 360 px), tablette, ordinateur ; priorité mobile pour la recherche, la prise de rendez-vous et les inscriptions.
- Navigateurs : deux dernières versions de Chrome, Edge, Firefox, Safari (ordinateur et mobile).
- Langue : français ; tous les textes dans des fichiers de ressources pour permettre l'ajout de l'anglais ; dates et nombres au format français.
- États vides, chargement et erreur définis pour chaque écran ; confirmations explicites pour toute action destructive.

### 9.5 Exploitation et qualité

- Environnements : développement local (Supabase CLI), préproduction, production, chacun avec son projet Supabase et son site Netlify.
- Suivi des erreurs (Sentry ou équivalent) et métriques d'usage ; alertes sur taux d'erreur et échecs de tâches planifiées.
- Jeu de données de démonstration (`seed.sql`) : 1 organisation, 3 animateurs, 20 incubés, 40 prestataires, 30 besoins et projets, rendez-vous et événements.
- Tests automatisés : unitaires sur la logique métier, tests des politiques RLS, tests de bout en bout (Playwright) des parcours de la section 4.4, exécutés à chaque déploiement.
- Documentation livrée : README d'installation, schéma de données, guide d'exploitation, procédure de mise en production.

## 10. Architecture technique

L'application est un site Next.js hébergé sur Netlify qui s'appuie sur Supabase pour l'authentification, les données, les fichiers, le temps réel et la logique serveur. Aucun serveur à administrer ; les secrets (Stripe, email, clé de service) vivent uniquement dans les Edge Functions de Supabase.

&#91;embedded content: architecture · Netlify, Supabase, Stripe, email\]

Le navigateur atteint le site Netlify et l'API Supabase protégée par la RLS ; Stripe et le service d'email ne sont joints que par les Edge Functions.

### 10.1 Pile technologique recommandée

| Couche | Choix | Rôle |
| --- | --- | --- |
| Interface | Next.js (App Router), React, TypeScript en mode strict | Pages publiques rendues côté serveur (référencement), espace connecté |
| Style et composants | Tailwind CSS, shadcn/ui | Composants accessibles (clavier, ARIA), thème clair/sombre optionnel |
| Formulaires | React Hook Form, Zod | Validation, schémas partagés entre formulaire et fonctions |
| Accès aux données | `supabase-js`, `@supabase/ssr`, TanStack Query | Session, requêtes, cache, mises à jour optimistes |
| Base, auth, fichiers, temps réel | Supabase (Postgres, Auth, Storage, Realtime) | Référentiel de données, RLS, messagerie en direct |
| Logique serveur | Fonctions SQL `rpc`, Edge Functions (Deno), `pg_cron` | Règles métier atomiques, webhooks, emails, tâches planifiées |
| Paiement | Stripe Checkout et portail client | Abonnements et options des prestataires |
| Emails | Resend (ou Postmark) appelé depuis une Edge Function | Emails transactionnels et digests |
| Hébergement | Netlify (runtime Next.js), CDN | Déploiement continu, prévisualisations, en-têtes de sécurité |
| Qualité | Vitest, pgTAP, Playwright, ESLint, GitHub Actions | Tests unitaires, RLS, bout en bout, intégration continue |
| Surveillance | Sentry | Erreurs applicatives et alertes |

Le générateur de code peut remplacer une brique par un équivalent à condition de respecter les contraintes des sections 7 (données et sécurité) et 9 (exigences non fonctionnelles).

### 10.2 Environnements et déploiement

| Environnement | Branche Git | Site Netlify | Projet Supabase |
| --- | --- | --- | --- |
| Local | — | `next dev` | `supabase start` (conteneurs locaux, `seed.sql`) |
| Prévisualisation | branche de travail (pull request) | URL temporaire par branche | préproduction |
| Préproduction | `develop` | site de recette | projet de recette |
| Production | `main` | domaine public | projet de production |

- R10.2.1. Les migrations (`supabase/migrations`) sont appliquées automatiquement par GitHub Actions : d'abord en préproduction, puis en production après validation manuelle.
- R10.2.2. Variables d'environnement :

| Variable | Où | Public |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` | Netlify | oui (la clé `anon` est protégée par la RLS) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM` | secrets Supabase (Edge Functions) | non |
| `RESEND_API_KEY`, `EMAIL_FROM` | secrets Supabase (Edge Functions) | non |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions uniquement | **non, jamais dans Netlify ni dans le navigateur** |

### 10.3 Règles d'architecture

- R10.3.1. Le navigateur appelle Supabase avec la clé publique, la RLS fait foi. Le code serveur de Next.js n'utilise jamais la clé `service_role`.
- R10.3.2. Pages publiques (accueil, annuaire, fiche prestataire publique, événements publics, bourse en aperçu) rendues côté serveur avec balises de titre et de description, données structurées JSON-LD, `sitemap.xml` et `robots.txt` ; l'espace connecté est sous `/app` et protégé par un middleware qui vérifie la session.
- R10.3.3. Un seul fichier `netlify.toml` porte le plugin Next.js, les en-têtes de sécurité (9.2) et les redirections.
- R10.3.4. Les tâches longues ou sensibles (emails, webhooks, exports, antivirus) s'exécutent en Edge Functions ou en `pg_cron`, jamais dans le navigateur.
- R10.3.5. Structure du dépôt demandée :

```text
/app                       # routes Next.js (public, auth, /app/...)
/components                # composants d'interface réutilisables
/lib                       # clients Supabase, schémas Zod, utilitaires
/supabase/migrations       # schéma, RLS, fonctions, triggers (SQL)
/supabase/functions        # Edge Functions : stripe-webhook, envoyer-emails, ...
/supabase/tests            # tests pgTAP des politiques RLS
/supabase/seed.sql         # données de démonstration
/e2e                       # tests Playwright des parcours (section 4.4)
/docs                      # README, schéma de données, guide d'exploitation
netlify.toml
```

## 11. Découpage V2 en lots de livraison opérationnels

Le développement avance **lot par lot**, sans renoncer aux exigences de sécurité, de qualité, d'accessibilité et de traçabilité. Chaque lot comprend : migrations Supabase idempotentes, RLS testée, RPC/Edge Functions nécessaires, écrans Next.js, tests, seed de recette, guide de déploiement et scénario vérifié en préproduction. **Une maquette avec données statiques n'est jamais considérée comme un lot livré.**

| Lot | Finalité / périmètre livré | Démonstration vérifiable | Dépendances |
| --- | --- | --- | --- |
| **0 — Socle opérationnel** | Monorepo Next.js TypeScript, Netlify, projets Supabase distincts, Auth/MFA, bootstrap admin, profils minimaux, audit, politiques RLS, CI/CD, email transactionnel minimal | Connexion admin récupérable, invitation et connexion d'utilisateurs de test, première migration, build et déploiement de recette | — |
| **1 — Identités et catalogue** | Structures d'incubation, organisations prestataires, membres, profils, validation, compétences, recherche initiale, offres et avantages incubés | Un prestataire crée une offre, l'admin le valide ; un incubé trouve et voit son avantage exclusif | 0 |
| **2 — Besoins et intermédiation** | Publication de besoins ouverts/ciblés, matching, alertes, candidatures quota Free/Pro/Premium, alias Free, demandes de relation, invitations, messagerie sécurisée, cockpit des opportunités | Candidature Free anonyme → sélection → double accord → échange ; invitation directe sans quota | 1 |
| **3 — Rendez-vous et conversion** | Disponibilités, réservation atomique, ICS, rappels, fiches opportunités, suivi des étapes et déclaration bilatérale de mission | Contact → rendez-vous sans double réservation → conclusion déclarée avec piste d'audit | 2 |
| **4 — Commercialisation et pilotage** | Stripe, versions de plans, packs, boosts, réconciliation, quotas, administration des demandes non pourvues, indicateurs, avis, modération, RGPD, performance | Abonnement test → changement de droits → annulation/rétrogradation → audit et reporting | 3 |
| **5 — Fonctions collaboratives et événements** | Bourse multi-rôles avancée, équipes et tâches, événements, inscriptions, listes d'attente, QR codes, enquêtes et webinaires Premium | Projet multi-rôles + équipe ; événement complet + promotion liste d'attente | 4 |
| **6 — Évolutions post-V1** | Mobile natif, vidéo intégrée, facturation entre parties, calendrier externe, assistant IA avancé, events payants, langues supplémentaires | Spécifications et arbitrage distincts | Après V1 |

### 11.1 Contrat de livraison de chaque lot

- `supabase/migrations/*.sql`, RLS documentée, fonctions SQL RPC, politiques Storage, seed local et recette.
- `supabase/functions/*` et secrets listés sans valeurs ; migration automatique uniquement après vérification.
- Site Next.js compatible Netlify, environnement de préproduction et processus de rollback documenté.
- Tests unitaires (Vitest), de sécurité SQL (pgTAP ou équivalent), E2E (Playwright), lint, build, scans de secrets.
- Rapport de recette : cas passés/échoués, captures ou traces de tests, limites connues, version, hash de livraison.
- Documentation `README.md`, `docs/HYPOTHESES.md`, `docs/DEPLOIEMENT.md`, `docs/RECETTE.md`.

### 11.2 Portes de décision avant mise en production

1. **G0** : accès projet Supabase/Netlify, domaine, emailing, Stripe test/production, propriétaire des secrets, responsabilités RGPD.
2. **G1** : parcours incubé et prestataire **réels** réussis avec données et comptes de recette, aucune faille RLS critique.
3. **G2** : anonymisation Free prouvée contre API, Storage, exports, messages et métadonnées.
4. **G3** : tests de concurrence, idempotence, webhooks, restaurations et déploiement sans régression.
5. **G4** : CGU/CGV/politique de confidentialité, mentions tarifaires et approbations métier finalisées.

## 12. Critères d'acceptation

Format : **Étant donné** (contexte) · **Quand** (action) · **Alors** (résultat vérifiable). Chaque ligne devient au moins un test Playwright ou pgTAP.

### 12.1 Incubé

| ID | Critère |
| --- | --- |
| UC-INC-01 | Étant donné une invitation valide, quand l'incubé ouvre le lien et définit un mot de passe de 12 caractères en acceptant les CGU, alors son compte est `actif`, l'acceptation est horodatée et versionnée, et il arrive sur l'assistant de profil. Un lien expiré ou déjà utilisé affiche un message avec option de renvoi. |
| UC-INC-02 | Quand l'incubé renseigne tous les champs obligatoires, alors la complétude atteint 100 %. Ses coordonnées ne sont visibles que des prestataires avec qui il échange. |
| UC-INC-03 | Quand il saisit « compta », alors « Comptabilité » est proposée et les résultats s'affichent en moins de 800 ms, 20 par page, avec les filtres de R5.4.1. Un prestataire suspendu n'apparaît jamais. |
| UC-INC-04 | Quand il décrit un besoin en texte libre, alors 1 à 5 compétences sont proposées avec des prestataires, et il choisit entre contacter, publier ou enregistrer (R5.4.5). Sans résultat, un message propose des termes proches et « Publier mon besoin ». |
| UC-INC-05 | Quand il publie un projet avec 2 rôles et une échéance à J+7, alors le projet est `publié` et les prestataires correspondants sont alertés selon leur plan. Une échéance à J+2 est refusée avec un message explicite. |
| UC-INC-06 | Étant donné 3 candidatures, quand il ouvre le tableau comparatif, alors tarif, délai, note et message sont affichés et triables. |
| UC-INC-07 | Quand il accepte un candidat sur un rôle, alors les autres candidats de ce rôle reçoivent un refus automatique courtois. L'acceptation d'un second candidat sur un rôle `pourvu` est refusée. |
| UC-INC-08 | Quand il invite un prestataire dans l'équipe, alors celui-ci reçoit l'invitation et dispose de 7 jours pour répondre. Seul le responsable ajoute ou retire des membres. |
| UC-INC-09 | Quand il invite un prestataire à un besoin, alors l'invitation est envoyée et son quota n'est pas consommé. |
| UC-INC-10 | Quand il réserve un créneau, alors il reçoit un email avec fichier `.ics`, puis des rappels à J-1 et H-1. Deux réservations simultanées du même créneau : une seule réussit. |
| UC-INC-11 | Une annulation à plus de 24 h ne demande aucun motif ; à moins de 24 h, un motif est obligatoire. Le prestataire est notifié dans les deux cas. |
| UC-INC-12 | Quand il s'inscrit à un événement complet, alors il passe en liste d'attente avec sa position. À la première désinscription, le premier de la liste reçoit une proposition valable 24 h. |
| UC-INC-13 | Quand un projet passe en `terminé`, alors l'incubé est invité à noter chaque prestataire retenu. Un avis sans lien établi est refusé. L'avis est publié après contrôle automatique. |
| UC-INC-14 | Quand il signale un contenu, alors un signalement est créé, un accusé de réception est envoyé et le signalement entre dans la file de modération. |
| UC-INC-15 | Quand il demande l'export, alors il reçoit un fichier JSON et CSV en moins de 24 h. Sa suppression est refusée tant qu'un projet est `en_cours`. |

### 12.2 Prestataire

| ID | Critère |
| --- | --- |
| UC-PRE-01 | Après inscription et confirmation d'email, le prestataire ne peut soumettre son profil qu'à partir de 70 % de complétude. Son profil n'apparaît nulle part avant validation. |
| UC-PRE-02 | Une présentation de moins de 200 caractères est refusée. Un coordonnée en visibilité `privé` n'est jamais renvoyée par l'API à un tiers. |
| UC-PRE-03 | Sur le plan Free, la 4e offre publiée est refusée côté base avec le message de quota et le bouton « Passer au plan supérieur ». |
| UC-PRE-04 | Avec la disponibilité `indisponible jusqu'au 30/11`, aucun créneau n'est proposable sur cette période et le prestataire apparaît en fin de résultats avec mention. |
| UC-PRE-05 | Le flux affiche uniquement les besoins correspondant à ses compétences ; la fréquence des alertes suit son plan (hebdomadaire en Free, quotidienne en Pro, temps réel en Premium). |
| UC-PRE-06 | Une candidature de moins de 100 caractères est refusée. Une candidature valide consomme 1 quota. À quota atteint, la 6e candidature Free du mois est refusée avec proposition de pack. Deux envois simultanés avec 1 quota restant : un seul passe. |
| UC-PRE-07 | La modification est possible tant que le statut est `envoyée`. Le retrait ne restitue pas le quota. |
| UC-PRE-08 | Accepter une invitation crée une candidature sans consommer de quota ; décliner demande un motif. |
| UC-PRE-09 | Un créneau récurrent hebdomadaire génère les créneaux sur 90 jours. Un chevauchement avec un créneau existant est refusé. |
| UC-PRE-10 | En confirmation manuelle, une demande sans réponse après 48 h est refusée automatiquement et l'incubé est notifié. |
| UC-PRE-11 | Le prestataire peut répondre une seule fois à un avis ; il ne peut ni le modifier ni le supprimer. |
| UC-PRE-12 | Après annulation, le plan reste actif jusqu'à la fin de la période payée. À la rétrogradation, rien n'est supprimé : les contenus excédentaires passent `hors_quota`. Un webhook reçu deux fois ne produit qu'un seul effet. |
| UC-PRE-13 | Un prestataire Premium crée 2 webinaires publics par mois ; le 3e est refusé. Un webinaire n'est publié qu'après modération par l'animateur. |
| UC-PRE-14 | Les statistiques sont limitées à 30 jours en Free et à 12 mois en Pro. |

### 12.3 Animateur et administrateur

| ID | Critère |
| --- | --- |
| UC-ANI-01 | L'import d'un CSV de 50 incubés crée 50 invitations et signale ligne par ligne les erreurs (email invalide, doublon). |
| UC-ANI-02 | Un animateur crée un événement, ouvre les inscriptions, scanne les QR codes (présent) et déclenche l'enquête 2 h après la fin. |
| UC-ANI-03 | Une recommandation faite par un animateur est visible de l'incubé et du prestataire concernés, et tracée. |
| UC-ADM-01 | Un refus sans motif est impossible. Chaque décision envoie un email et écrit une ligne dans `audit_log`. |
| UC-ADM-02 | La file de modération est triée par priorité. Masquer un avis le retire du calcul de la note. |
| UC-ADM-03 | Fusionner deux compétences réaffecte tous les liens (prestataires, offres, rôles) sans perte. Une compétence n'est jamais supprimée, seulement désactivée. |
| UC-ADM-04 | Chaque indicateur de 6.2 s'affiche avec ses filtres et sa comparaison à la période précédente ; une alerte dépassée envoie une notification, puis un email après 24 h. |
| UC-ADM-05 | Modifier un quota ou un prix est versionné et prend effet à la date choisie, sans modifier le code. |
| UC-ADM-06 | La recherche dans le journal d'audit fonctionne par utilisateur et par action. Toute tentative de modification ou de suppression d'une ligne d'audit échoue. |

### 12.4 Critères transverses

- CT-1. **Sécurité des données** : pour chaque ligne du tableau 7.3, un test vérifie qu'un utilisateur non autorisé reçoit zéro ligne ou une erreur, et qu'un accès par URL à la ressource d'autrui répond « introuvable ».
- CT-2. **Aucune clé secrète** dans le code client ni dans le dépôt (analyse automatique en CI).
- CT-3. **Quotas et états partagés** : tests de concurrence (2 requêtes simultanées) pour candidature, réservation, inscription et acceptation.
- CT-4. **Performance** : valeurs de 9.3 mesurées sur le jeu de données de charge (10 000 prestataires, 50 000 offres).
- CT-5. **Accessibilité** : aucun défaut bloquant RGAA sur les parcours de 4.4 (contrôle automatique plus vérification manuelle au clavier).
- CT-6. **Traçabilité** : chaque transition de 8.1 produit une ligne dans `audit_log`.
- CT-7. **Parcours de bout en bout** : les 4 parcours de 4.4 passent en test Playwright sur la préproduction avant chaque mise en production.


### 12.5 Critères d'acceptation complémentaires V2 — obligatoires

| ID | Étant donné / Quand / Alors | Test attendu |
| --- | --- | --- |
| **AT-V2-01** | Étant donné un prestataire Free validé avec 5 candidatures spontanées du mois, quand il en envoie une 6e, alors la base refuse l'envoi avec un motif de quota ; une réponse à une invitation directe réussit sans consommer de quota. | SQL transactionnel + E2E |
| **AT-V2-02** | Quand un prestataire Free répond à un besoin ouvert, alors l'incubé voit alias, compétences pertinentes et contenu épuré, **sans nom, société, SIRET, email, téléphone, URLs, document source ni métadonnée identifiante**. | Tests RLS, API, Storage et E2E |
| **AT-V2-03** | Quand l'incubé sollicite la mise en relation sur une candidature Free, alors l'identité reste cachée jusqu'à acceptation explicite par le prestataire. En cas de refus ou expiration, elle reste cachée. | Concurrence RPC + E2E |
| **AT-V2-04** | Quand un incubé contacte un prestataire depuis son offre, alors les deux identités sont visibles selon leurs règles de coordonnées et le prestataire peut répondre sans payer, quel que soit son plan. | E2E comptes Free/Pro |
| **AT-V2-05** | Quand un prestataire répond à une invitation nominative de l'incubé, alors le compteur de candidatures spontanées est inchangé et l'interface n'applique pas l'alias Free. | SQL + E2E |
| **AT-V2-06** | Quand un visiteur ou prestataire concurrent appelle l'API d'avantage incubé, alors aucune condition réservée ni tarif préférentiel n'est retourné ; un incubé actif autorisé les voit. | RLS/RPC et requêtes HTTP |
| **AT-V2-07** | Quand une organisation prestataire invite un collaborateur, alors ses droits sont bornés à cette organisation ; seul le propriétaire peut changer de plan ou effacer le compte. | Matrice RLS multi-utilisateurs |
| **AT-V2-08** | Quand un dossier relationnel passe à `gagnee`, alors il apparaît comme conclusion déclarée ; seul l'accord concordant des deux parties contribue à l'indicateur « missions confirmées bilatéralement ». | SQL + E2E |
| **AT-V2-09** | Quand un événement métier déclenche un email et que l'envoi échoue, alors l'événement est conservé en outbox, relancé sans doublon et l'incident apparaît au tableau de bord. | Intégration + simulation d'échec |
| **AT-V2-10** | Quand deux utilisateurs réservent simultanément un même rendez-vous individuel, un seul aboutit ; pour une session collective les inscriptions ne dépassent jamais la capacité. | Test de concurrence |
| **AT-V2-11** | Quand deux candidatures sont acceptées en quasi-simultané sur un rôle à une place, alors une seule peut atteindre `confirmee` et le rôle devient `pourvu` atomiquement ; les refus concurrents ne sont définitifs qu'à cette étape. | Test de concurrence |
| **AT-V2-12** | Quand un candidat tente de lire les pièces, les coordonnées ou l'identité d'un dossier d'une autre organisation par une URL directe ou un RPC, alors il n'obtient aucune information sensible. | Matrice sécurité cross-tenant |
| **AT-V2-13** | Quand un administrateur perd l'accès et suit la procédure de récupération approuvée, alors l'accès est restaurable sans désactiver RLS ni contourner la MFA, et les opérations sont auditées. | Procédure de recette |
| **AT-V2-14** | Quand une offre change de version ou un abonnement rétrograde, les missions conclues, les échanges et les preuves de consentement existants ne sont pas supprimés. | SQL + E2E |
| **AT-V2-15** | Quand un prestataire Premium annule un abonnement et Stripe transmet des événements dupliqués ou désordonnés, alors l'état local est cohérent avec Stripe et les droits évoluent à la date prévue une seule fois. | Test webhook + réconciliation |
| **AT-V2-16** | Quand un incubé publie un besoin ouvert et qu'aucun prestataire ne répond, alors il voit un état explicite et l'animateur peut faire une recommandation tracée sans envoyer de prospection non sollicitée. | E2E métier |
| **AT-V2-17** | Quand un incubé consulte la recherche par besoin libre, les résultats affichent les raisons de correspondance et distinguent contenu sponsorisé et pertinence organique. | E2E + validation UX |
| **AT-V2-18** | Quand un lot est annoncé « livré », migrations, comptes de test, workflows, lint, build, tests RLS et E2E passent sur la préproduction et sont attachés au rapport de recette. | CI/CD + revue de livraison |
| **AT-V2-19** | Quand un prestataire Free répond à un besoin ouvert avec une pièce jointe, alors celle-ci n'est pas visible avant la révélation si elle n'a pas été contrôlée et expurgée ; aucun lien Storage non autorisé n'est divulgué. | Storage + API + E2E |
| **AT-V2-20** | Quand un incubé de l'organisation A tente de consulter les dossiers confidentiels de l'organisation B, alors l'accès est refusé ; les prestataires transversaux ne peuvent pas réutiliser le contexte B pour lire A. | Tests SQL tenant A/B |

## 13. Points de cohérence à appliquer (corrections normatives)

Ces points précisent ou corrigent des écarts entre sections historiques. Ils **prévalent** sur le texte V1 antérieur ; les règles V2 explicitement identifiées prévalent sur les éventuels conflits résiduels.

| # | Constat | Décision à appliquer |
| --- | --- | --- |
| C1 | Le statut de candidature `confirmée` (8.1) manque dans la liste de 5.6.3 | Ajouter `confirmée` à l'énumération : `envoyée`, `consultée`, `présélectionnée`, `entretien`, `acceptée`, `confirmée`, `refusée`, `retirée`, `expirée` |
| C2 | Le passage d'un rôle à `pourvu` n'est pas défini | Un rôle devient `pourvu` quand sa candidature passe à `confirmée` (trigger). Si cette candidature est ensuite `retirée`, le rôle redevient `vacant` |
| C3 | Le statut `refusé` du prestataire est cité en 8.1 mais absent de `profiles.statut` | Porter le refus dans `prestataires.statut_validation` (`en_validation`, `valide`, `refuse`) ; `profiles.statut` reste `en_validation` tant que la correction n'a pas été resoumise |
| C4 | Le plan limite les « créneaux actifs » (3.1) mais `usage_quotas.type` ne le prévoit pas | Ajouter le type `creneaux` ; le décompte porte sur les créneaux futurs au statut `proposé` |
| C5 | La matrice 2.2 autorise un prestataire à réserver chez un autre prestataire, mais `rendez_vous` ne référence qu'un `incube_id` | Remplacer `incube_id` par `participant_id` (profil quelconque) ; cette fonction est désactivée par défaut derrière le feature flag `rdv_entre_prestataires` |
| C6 | La matrice 2.2 donne à l'admin le droit de publier une offre | L'admin agit « au nom de » un prestataire ; l'acte est tracé dans `audit_log` avec l'identité de l'admin |
| C7 | Le rôle `animateur` est un drapeau (`est_animateur`) et non un rôle | Un animateur est un `incube` ou un `admin` avec `est_animateur = true` ; il ne peut pas être prestataire |
| C8 | Seuls l'e-mail et le mot de passe sont décrits pour les prestataires membres de sièges Premium | Un collaborateur est invité par email, rattaché via `prestataire_membres`, et ne peut ni changer le plan ni supprimer le compte |
| C9 | Les statistiques de 5.3.5 et de 6.2 reposent sur `analytics_evenements` sans règle de comptage | Une vue par utilisateur et par ressource est comptée au plus une fois par 30 minutes ; les robots connus et le propriétaire sont exclus |

### 13.1 Compléments V2 — arbitrages normatifs

| # | Sujet | Règle consolidée |
| --- | --- | --- |
| C10 | Anonymat Free absent du modèle initial | Appliquer V2-FRE-03 à V2-FRE-05 et 7.7, jamais un masquage React seul |
| C11 | Refus concurrents trop précoce | Effectuer le refus définitif après `confirmee` (V2-ETAT, AT-V2-11) |
| C12 | Identité d'une organisation prestataire et ses membres | Une entité juridique `organisations_prestataires` et des permissions de membres distinctes |
| C13 | Suivi commercial absent | Ajouter opportunités, historique, états, source et déclarations bilatérales |
| C14 | Rendez-vous collectifs | Gérer capacité par inscriptions, exclusivité temporelle par hôte |
| C15 | Avantage incubé | Visibilité vérifiée à chaque appel serveur, aucun enrichissement public |
| C16 | Projet restreint | Autoriser l'évaluation du périmètre sans accès aux annexes confidentielles |
| C17 | Evénements Stripe désordonnés | Réconciliation périodique avec la vérité Stripe |
| C18 | Reprise d'accès administrateur | Bootstrap et récupération MFA sécurisés, testés et documentés |

## 14. Consignes pour le générateur de code

Ce document est la **source de vérité**. En cas de doute, le générateur applique, dans cet ordre : règles V2 explicitement normatives, section 13, sections 7 et 8, puis le reste. Il ne devine pas : il liste ses hypothèses dans le fichier `docs/HYPOTHESES.md`.

### 14.1 Règles de production

1. Un lot à la fois (section 11) ; avant de commencer, résumer en 10 lignes le périmètre du lot et lister les fichiers à créer.
2. Schéma d'abord : migrations SQL (tables, énumérations, contraintes, index, RLS, fonctions, triggers) puis tests pgTAP, **avant** toute interface.
3. Toute écriture sensible passe par une fonction `rpc` transactionnelle (R7.3.1) ; jamais d'`insert` direct depuis le client sur ces tables.
4. Aucune valeur métier en dur (quotas, prix, seuils, poids de recherche) : tout vient de `plans`, `parametres` ou `feature_flags`.
5. Chaque écran gère les états : chargement, vide, erreur, succès, accès refusé.
6. Tous les textes de l'interface dans des fichiers de ressources français ; messages d'erreur conformes à R8.3.5.
7. Les schémas de validation Zod sont partagés entre formulaires et fonctions ; les contraintes sont aussi posées en base (`check`).
8. Un test automatisé par critère de la section 12, rattaché à son identifiant (UC-… ou CT-…).
9. Le code est en TypeScript strict, sans `any` implicite ; lint et tests passent avant chaque commit.

### 14.2 Ce que le générateur ne doit pas faire

- Utiliser la clé `service_role` dans Next.js ou dans le navigateur.
- Désactiver la RLS, même temporairement, ou créer une politique `using (true)` sur une table métier.
- Supprimer physiquement des données métier (R8.3.3).
- Stocker des données de carte bancaire.
- Ajouter des fonctionnalités du lot 6 ou des bibliothèques non justifiées.
- Modifier la base autrement que par des migrations versionnées.

### 14.3 Prompt d'amorçage (à coller dans Claude Code ou ChatGPT)

```text
Tu es développeur senior full-stack. Le fichier cahier_des_charges.md est la
source de vérité : lis-le intégralement avant d'agir.

Objectif : construire le LOT <N> de la section 11 V2, et uniquement celui-là.
Applique en priorité les règles V2, la section 13, les contrôles 7.7 et les tests 12.5.

Étapes :
1. Résume le périmètre du lot et liste les fichiers que tu vas créer.
2. Écris les migrations Supabase (supabase/migrations) : tables, énumérations,
   contraintes, index, RLS, fonctions rpc, triggers, crons concernés.
3. Écris les tests pgTAP des politiques RLS et des fonctions.
4. Implémente l'interface Next.js (App Router) et les Edge Functions.
5. Écris les tests Playwright rattachés aux critères UC-… de la section 12.
6. Lance lint, tests et build ; corrige jusqu'à ce que tout passe.
7. Mets à jour docs/ (README, schéma, HYPOTHESES.md).

Contraintes : respecte la section 13 (elle prévaut), la section 14.2
(interdits), la pile de la section 10.1, et ne devine rien : note tes
hypothèses dans docs/HYPOTHESES.md.
```

## 15. Décisions à valider avant le lot 0

| # | Question | Proposition par défaut |
| --- | --- | --- |
| Q1 | Prix des plans et des options (3.1, 3.2) | Valeurs proposées, modifiables en base |
| Q2 | Hypothèses H1 à H4 (1.4) | Confirmées telles quelles |
| Q3 | Fournisseur d'emails | Resend |
| Q4 | Région Supabase | UE (Francfort) |
| Q5 | Nom de domaine et marque | À fournir |
| Q6 | CGU, politique de confidentialité, mentions légales | À fournir par le client (le générateur crée des pages de remplacement) |
| Q7 | Connexion Google et LinkedIn | Hors V1 |
| Q8 | Qui joue le rôle d'administrateur et d'animateur au démarrage | À nommer |

### 15.1 Décisions V2 ouvertes — sans blocage du développement du socle

| ID | Décision | Position retenue dans la V2 | Validation nécessaire |
| --- | --- | --- | --- |
| DV2-01 | Modèle hybride | Gratuit côté incubé ; Free répond aux besoins ouverts sous alias ; déblocage par double accord gratuit ; services avancés payants | Validation commerciale et juridique |
| DV2-02 | Tarifs et quotas | Reprise temporaire des montants et quotas V1 en données configurables | Pricing/finance |
| DV2-03 | Offre réservée incubé | Avantage visible uniquement aux incubés authentifiés et éligibles | Conditions et contrôle des offres |
| DV2-04 | Structures d'incubation | Une structure au lancement, modèle multi-structure strict | Règles de partage transversales |
| DV2-05 | Consentement de contact | Double accord préalable à la révélation dans la candidature Free ouverte | Rédaction des consentements et CGU |
| DV2-06 | Data et conformité | Région UE choisie à la création ; durées de conservation V1 à confirmer selon finalités | DPO/juridique |
| DV2-07 | Administration | Un compte propriétaire habilité et une procédure de récupération MFA | Responsable opérationnel à désigner |
| DV2-08 | Infrastructure | Noms de domaine, Supabase projets, Netlify sites, Stripe et service mail | Identifiants et environnements à fournir |

### 15.2 Registre des hypothèses de conception

**Hypothèse H-V2-A** : le prestataire Free peut utiliser les réponses spontanées anonymes sans frais ; une révélation mutuellement consentie reste gratuite pour éviter toute rupture du parcours incubé. **Hypothèse H-V2-B** : la monétisation viendra des fonctionnalités, limites de volumes et options de visibilité, plutôt que de la vente ponctuelle d'une identité. **Hypothèse H-V2-C** : la confirmation bilatérale de mission peut être demandée sans téléverser de contrat ou traiter le paiement de la mission. **Hypothèse H-V2-D** : les références et données professionnelles susceptibles d'identifier une société ne sont pas exposées au stade anonyme. Toutes ces hypothèses doivent être enregistrées dans `docs/HYPOTHESES.md` puis validées avant les lots concernés.

### 15.3 Liste des livrables attendus du générateur pour la V2 complète

1. Code applicatif Next.js/TypeScript, composants et pages publiques SEO + espaces authentifiés par rôle.
2. Migrations Supabase SQL **versionnées**, index, RLS, RPC, Storage policies, Edge Functions et tâches planifiées.
3. `seed.sql` pour les données métier, script de création des utilisateurs de test Auth et procédure de bootstrap admin protégée.
4. Configuration Netlify (`netlify.toml`), `.env.example`, CI/CD et procédures de staging/production.
5. Tests unitaires, de concurrence, RLS cross-tenant, anonymisation, E2E et Stripe en environnement test.
6. Guide d'installation local, guide de déploiement Netlify/Supabase, guide d'exploitation et registre des hypothèses.

**Fin du cahier des charges V2.**
