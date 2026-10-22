EURASANTÉ CRM — VERSION 5.0 PARTENARIATS
========================================
Cette distribution intègre la V5 du module Partenariats : gestion des conventions, tâches en Kanban, import JSON de convention, export ICS Outlook et HTML autonome V5.

IMPORTANT : avant utilisation, lire README_V5_PARTENARIATS_KANBAN_JSON_ICS.txt et exécuter la migration additive MIGRATION_PARTENARIATS_V5.sql après les migrations V4/V4.1 déjà nécessaires.

EURASANTÉ CRM V4.0 — PILOTAGE DES PARTENARIATS
===============================================

NOUVEAUTÉ NON DESTRUCTIVE
- Ajout d’un module « Partenariats » sans suppression ni remplacement des données Prospects, Projets, Sourcing ou Relations / RDV.
- Les tables Partenariats sont ajoutées par MIGRATION_PARTENARIATS_V4.sql.
- Le bouton « Charger les conventions fournies » initialise le référentiel à partir du corpus livré. L’initialisation est idempotente : une ligne déjà présente avec le même source_key n’est pas écrasée.
- Le suivi distingue les clauses contractuelles des tâches de pilotage interne.
- Le CRM peut générer à la demande un fichier HTML autonome embarquant l’état courant du référentiel Partenariats.

INSTALLATION V4
1. Dans Supabase > SQL Editor, exécuter une seule fois MIGRATION_PARTENARIATS_V4.sql.
2. Relancer le serveur local du CRM.
3. Ouvrir « Partenariats » puis cliquer « Charger les conventions fournies ».
4. Vérifier les points de vigilance signalés dans les fiches avant de considérer les données comme juridiquement opposables.

NOUVEAU PARTENAIRE
- Cliquer « Nouveau partenariat », renseigner les éléments contractuels, puis ajouter les engagements par service.
- Les réalisations peuvent être enregistrées sur chaque engagement afin de mesurer l’exécution.
- Cliquer « Générer le HTML autonome » pour obtenir un fichier de suivi partageable hors CRM.
- Cette version n’analyse pas automatiquement un nouveau PDF : les données du nouveau contrat doivent d’abord être saisies/validées dans le module Partenariats.

HTML AUTONOME
- Recherche, filtres, tri et navigation à facettes.
- Lecture des obligations par partenaire et par service Eurasanté.
- Statut, progression et notes modifiables localement.
- Ces modifications sont stockées dans le Local Storage du navigateur : elles ne se synchronisent pas vers Supabase.

Voir également README_V4_PARTENARIATS.txt pour le mode opératoire et les réserves de données.

EURASANTE CRM v2.11 - RELATIONS / RDV
======================================

MISE A JOUR NON DESTRUCTIVE
- Cette version part de v2.10.1 MultiProjetUX.
- Elle ne remplace PAS les tables prospects, projets, sourcing ou prospect_projets.
- Exécuter MIGRATION_RELATIONS_RDV.sql une seule fois dans Supabase.
- L'export XLSX /api/export/xlsx reste STRICTEMENT basé sur le format Reporting ODJ initial : aucun onglet ni colonne RDV n'y est ajouté.
- Après migration, ouvrir Relations / RDV puis cliquer « Importer / actualiser l'historique RDV ». L'import est idempotent grâce à uid_calendrier : il met à jour sans dupliquer.
- Les RDV historiques passés sont volontairement importés « À qualifier » : aucune hypothèse n'est faite sur leur réalisation effective. Les événements explicitement annulés sont marqués annulés ; les dates futures sont planifiées.

EURASANTÉ CRM SUPABASE MULTI — V2.8.1 CONSOLIDÉE
====================================================

Cette version consolide la V2.7 (Favoris temporaires + projets actifs/inactifs + filtres + XLSX) et ajoute uniquement la fonction Réinitialiser ODJ prospects.
Aucune migration SQL supplémentaire n'est nécessaire par rapport à la V2.7/V2.8.

EURASANTE CRM SUPABASE MULTI V2.6 - PROJETS ACTIFS / DESACTIVES

AVANT LE PREMIER LANCEMENT DE CETTE VERSION
--------------------------------------------
1. Dans Supabase > SQL Editor > New query
2. Exécuter le fichier : MIGRATION_PROJECTS_ACTIVE.sql
3. Le script est NON DESTRUCTIF : il ajoute seulement le champ booléen `actif` à la table `projets`.
4. Tous les projets existants sont considérés actifs par défaut.

REGLES METIER
-------------
- Un projet désactivé reste conservé en base.
- Il reste visible dans l'onglet Projets, en grisé et marqué « Désactivé ».
- Les rattachements prospect -> projet déjà existants sont conservés, même si le projet est désactivé ensuite.
- Un projet désactivé n'est plus proposé pour un nouveau rattachement prospect ou depuis le sourcing.
- Si une fiche prospect est déjà rattachée à un projet désactivé, ce rattachement reste visible dans la fiche et peut être conservé tel quel.
- Tu peux remplacer ce rattachement par un projet actif.

EURASANTE CRM V2.5 - INTERFACE FACILE A PERSONNALISER
=======================================================

PERSONNALISATION :
- Modifier ui_config.js pour tous les textes/libelles principaux.
- Voir PERSONNALISATION_UI.txt pour les exemples.
- app.html = structure, styles.css = design, app.js = logique.

EURASANTE CRM SUPABASE MULTI - V2 IMPORT ZERO PERTE

AVANT D'UTILISER LE NOUVEL IMPORT :
1. Dans Supabase > SQL Editor, executer MIGRATION_IMPORT_ZERO_LOSS.sql une seule fois.
2. Cette migration est NON DESTRUCTIVE : elle ne supprime aucune donnee existante.
3. Relancer ensuite l'application.

NOUVEL IMPORT :
- Les champs CRM connus sont structures comme avant.
- La ligne Excel originale complete est conservee dans donnees_source (JSON).
- Une valeur atypique de Statut / ODJ / Date n'est plus perdue : la valeur brute reste dans donnees_source.
- En mode Completer / mettre a jour, une cellule Excel vide n'efface jamais une valeur deja presente dans Supabase.
- Les lignes sans nom sont conservees dans Sourcing au lieu d'etre ignorees.
- Le sourcing est fusionne par Source + Nom afin d'eviter les doublons a chaque reimport.

DONNEES EXISTANTES : CONSERVEES.
Utilise de preference le mode « Completer / mettre a jour ».

EURASANTE CRM - SUPABASE MULTI-UTILISATEUR
==========================================

Architecture
------------
Chaque Mac/Windows lance la meme application locale Python/HTML.
Les donnees sont stockees dans le meme projet Supabase PostgreSQL.
Aucun fichier n'est synchronise entre les postes.

WINDOWS
-------
1. Installer Python 3 si necessaire.
2. Lancer install_windows.bat une seule fois.
3. Lancer start_windows.bat.
4. Se connecter avec l'utilisateur cree dans Supabase Auth.

MACOS
-----
Dans Terminal, depuis le dossier de l'app :
  bash install_macos.command
puis :
  bash start_macos.command
Cette methode evite les blocages Gatekeeper des fichiers .command.

IMPORT INITIAL
--------------
Dans le CRM : Import / Export > choisir Reporting ODJ.xlsx.
L'app propose automatiquement :
- Reporting => Prospects
- Projets a sponsoriser => Projets
- autres onglets => Sourcing
Choisir "Completer / mettre a jour" ou "Remplacer la base".

MULTI-UTILISATEUR
-----------------
Chaque utilisateur doit avoir son propre compte dans Supabase Authentication > Users.
Les changements sont centralises dans PostgreSQL et l'interface recharge la base toutes les 15 secondes.

SECURITE
--------
Le fichier config.json contient uniquement l'URL et une cle publishable Supabase.
Il ne contient ni mot de passe utilisateur, ni service_role key.
Ne jamais mettre de service_role key dans cette application.

SI UNE ERREUR DE PERMISSION APPARAIT
------------------------------------
Si la connexion fonctionne mais que les donnees ne se chargent pas avec une erreur de permission :
1. Supabase > SQL Editor.
2. Executer SUPABASE_PERMISSIONS.sql.
Les policies RLS creees precedemment continueront de limiter l'acces aux utilisateurs authentifies.

EXPORT XLSX
-----------
Dans Import / Export > Base centrale, utilisez « Exporter XLSX — format Reporting ODJ ».
Le fichier généré reprend la structure du classeur d'import initial :
- Reporting (9 colonnes)
- Projets à sponsoriser (13 colonnes)
- Ordre du jour (automatique) conservé et recalculé par Excel à l'ouverture
- Sourcing réinjecté par onglet source quand possible
Le JSON reste disponible techniquement via /api/export/json mais n'est plus l'export principal de l'interface.


=== V2.10 — MULTIPROJETS ===
Avant utilisation, exécuter MIGRATION_MULTIPROJETS.sql dans Supabase > SQL Editor.
Un prospect peut ensuite être rattaché à plusieurs projets.
Le champ historique projet_cible est conservé automatiquement avec un projet principal pour compatibilité avec les exports XLSX existants.
Un projet désactivé déjà rattaché reste visible et peut être conservé ou retiré ; il ne peut pas être ajouté à un nouveau prospect.

V2.11.1 - NETTOYAGE REFERENTIEL RELATIONS
- Exclusion automatique des domaines Eurasante, Clubster NSL, Eurasenior, Euralimentaire et Vivalley lors des imports RDV.
- Les rendez-vous mixtes (ex. Clubster NSL + Pfizer) sont rattaches au domaine externe restant.
- Le fichier NETTOYAGE_REFERENTIEL_RELATIONS.sql permet de retirer ces structures des tables Relations/RDV deja importees.
- Ce nettoyage ne touche jamais aux tables prospects, projets ou sourcing.


V2.11.2 - IMPORT RDV EXHAUSTIF ET DIAGNOSTIQUE
- N'efface aucune donnée CRM existante.
- Les RDV sans organisation identifiable ne sont plus perdus : ils sont importés « À qualifier ».
- Les structures Eurasanté / Clubster NSL / Eurasenior / Euralimentaire / Vivalley restent exclues du référentiel.
- Les événements clairement personnels/internes sans signal externe sont ignorés.
- Une erreur sur un événement ne bloque plus tout l'import.
- Bilan détaillé après import : analysés, ajoutés, actualisés, sans organisation, ambigus, ignorés, erreurs.
- L'export XLSX historique reste inchangé et ne contient aucun RDV.


=== V2.11.3 - QUALIFICATION RELATIONS / RDV ===
Avant d'utiliser le bouton "Ignorer" sur les RDV, exécuter une seule fois dans Supabase :
MIGRATION_RELATIONS_QUALIFICATION_V2113.sql

Cette migration est non destructive : elle conserve les données CRM et les RDV existants.
Nouveautés : sélection multiple des RDV, qualification en masse, filtre année, qualification des organisations, tris, relations à réactiver calculées sur les RDV réalisés.
L'export XLSX Reporting ODJ reste inchangé et n'inclut pas les RDV.
