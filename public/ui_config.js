/* ========================================================================== 
   EURASANTE CRM - ZONE DE PERSONNALISATION
   --------------------------------------------------------------------------
   Ce fichier contient les textes et libellés que tu peux modifier sans
   toucher au HTML, au CSS, au JavaScript métier ni à Supabase.

   CONSEIL : ne modifie que les valeurs situées APRES les deux-points.
   Exemple :
      dashboardTitle: "Pilotage partenariats"
   peut devenir :
      dashboardTitle: "Mon cockpit commercial"

   IMPORTANT : pour les STATUTS, ne change PAS la propriété "value".
   "value" est la valeur technique stockée dans Supabase.
   Tu peux modifier librement "label", "icon" et "color".
   ========================================================================== */

window.APP_CONFIG = {

  /* -----------------------------------------------------------------------
     1. IDENTITE DE L'APPLICATION
     ----------------------------------------------------------------------- */
  app: {
    browserTitle: "Eurasanté CRM — Multi-utilisateur",
    brandHtml: 'Eura<span>Santé</span> CRM <small>Cloud</small>',
    dashboardTitle: "Pilotage partenariats",
    dashboardSubtitle: "Base Supabase centralisée · Mac + Windows · multi-utilisateur",
    refreshSeconds: 60
  },

  /* -----------------------------------------------------------------------
     2. MENU PRINCIPAL
     Les clés à gauche (dashboard, pipeline...) sont TECHNIQUES : ne pas changer.
     ----------------------------------------------------------------------- */
  nav: {
    dashboard: "Dashboard",
    pipeline: "Pipeline commercial",
    prospects: "Prospects",
    projects: "Projets",
    odj: "ODJ Comité",
    sourcing: "Sourcing",
    relations: "Relations / RDV",
    partnerships: "Partenariats",
    admin: "Import / Export"
  },

  /* -----------------------------------------------------------------------
     3. TITRES DE PAGES
     ----------------------------------------------------------------------- */
  pages: {
    pipelineTitle: "Pipeline commercial",
    prospectsTitle: "Prospects",
    projectsTitle: "Projets",
    odjTitle: "ODJ Comité",
    sourcingTitle: "Sourcing",
    sourcingSubtitle: "Listes importées depuis Excel et non encore intégrées au CRM",
    partnershipsTitle: "Partenariats",
    adminTitle: "Import / Export"
  },

  /* -----------------------------------------------------------------------
     4. DASHBOARD
     ----------------------------------------------------------------------- */
  dashboard: {
    prospects: "Prospects",
    projects: "Projets",
    pipeline: "Pipeline",
    won: "Gagné",
    odj: "ODJ Comité",
    sourcing: "Sourcing",
    funnelTitle: "Entonnoir commercial",
    recentTitle: "Dernières mises à jour",
    noData: "Aucune donnée"
  },

  /* -----------------------------------------------------------------------
     5. BOUTONS ET MODES D'AFFICHAGE
     ----------------------------------------------------------------------- */
  buttons: {
    resetProspectODJ: "Réinitialiser ODJ prospects",
    login: "Se connecter",
    logout: "Quitter",
    refresh: "Actualiser",
    newProspect: "+ Nouveau prospect",
    newProject: "+ Projet",
    selectVisibleProjects: "Sélectionner les visibles",
    clearProjectSelection: "Effacer la sélection",
    bulkActivateProjects: "✓ Activer la sélection",
    bulkDeactivateProjects: "⊘ Désactiver la sélection",
    resetFilters: "Réinitialiser",
    save: "💾 Enregistrer",
    delete: "Supprimer",
    addToCrm: "+ CRM",
    importSupabase: "Importer dans Supabase",
    exportXlsx: "⇩ Exporter XLSX — format Reporting ODJ",
    cancel: "Annuler",
    confirm: "Confirmer",
    validate: "Valider"
  },

  views: {
    kanban: "Kanban",
    listing: "Listing",
    table: "☷ Tableau",
    cards: "▦ Cartes",
    compact: "≡ Compact",
    byOwner: "Par responsable"
  },

  /* -----------------------------------------------------------------------
     6. PLACEHOLDERS ET FILTRES
     ----------------------------------------------------------------------- */
  placeholders: {
    pipelineSearch: "Rechercher...",
    prospectsSearch: "Société, commentaire, projet...",
    projectSearch: "Rechercher projet...",
    sourcingSearch: "Rechercher une cible...",
    projectChipSearch: "Rechercher..."
  },

  filters: {
    allRefs: "Tous référents",
    allProjects: "Tous projets",
    allStatuses: "Tous statuts",
    allPriorities: "Toutes priorités",
    allSources: "Toutes sources",
    allOdj: "Tous ODJ",
    odjFilled: "ODJ renseigné",
    odjEmpty: "ODJ vide",
    sourcingOpen: "Non importées",
    sourcingAll: "Toutes",
    sourcingDone: "Déjà importées",
    sortRecent: "Date : récent → ancien",
    sortOld: "Date : ancien → récent",
    sortAZ: "Nom A → Z",
    sortAmountDesc: "Montant : décroissant",
    sortAmountAsc: "Montant : croissant",
    sortPriority: "Priorité",
    sortDateAsc: "Date croissante",
    sortDateDesc: "Date décroissante",
    favoritesOnly: "Favoris",
    allProjectStates: "Tous les projets",
    activeProjects: "Projets actifs",
    inactiveProjects: "Projets désactivés"
  },

  /* -----------------------------------------------------------------------
     7. LIBELLES DES CHAMPS
     ----------------------------------------------------------------------- */
  fields: {
    sponsor: "Nom sponsor",
    status: "Statut",
    dateUpdated: "Date MAJ",
    owner: "Référent",
    odj: "ODJ",
    targetProject: "Projet cible",
    targetProjects: "Projets associés",
    amount: "Montant (€)",
    comment: "Commentaire",
    crmLink: "Lien CRM",

    projectName: "Nom projet",
    priority: "Priorité",
    targetAmount: "Montant cible",
    projectDate: "Date",
    targetPartner: "Partenaire cible",
    funded: "Financé",
    site: "Site",
    crmCampaign: "Campagne CRM",
    slides: "Slides",
    comments: "Commentaires",
    projectState: "État du projet",
    projectActive: "Actif",
    projectInactive: "Désactivé"
  },

  /* -----------------------------------------------------------------------
     8. STATUTS COMMERCIAUX
     !!! NE PAS MODIFIER "value" !!!
     label / icon / color peuvent être modifiés librement.
     ----------------------------------------------------------------------- */
  statuses: [
    { value: "1. Prise de contact",     label: "Prise de contact", icon: "◉", color: "#64748b" },
    { value: "2. À recontacter",        label: "À recontacter",    icon: "↻", color: "#d97706" },
    { value: "3. Intéressé 2",          label: "Intéressé 2",      icon: "◇", color: "#0284c7" },
    { value: "4. Rdv réalisé",          label: "RDV réalisé",      icon: "●", color: "#7c3aed" },
    { value: "5. Intéressé 1",          label: "Intéressé 1",      icon: "★", color: "#059669" },
    { value: "6. Proposition envoyée",  label: "Proposition",      icon: "✉", color: "#ca8a04" },
    { value: "7. Accord de principe",   label: "Accord",           icon: "✓", color: "#2563eb" },
    { value: "8. Gagné (fermé)",        label: "Gagné",            icon: "◆", color: "#08765a" },
    { value: "9. Perdu (fermé)",        label: "Perdu",            icon: "✕", color: "#b91c1c" }
  ],

  /* -----------------------------------------------------------------------
     9. NOMS AFFICHES POUR LES CODES ODJ
     Les codes AL / LS / NG sont techniques : ne pas les changer.
     ----------------------------------------------------------------------- */
  odjNames: {
    AL: "Aurélien",
    LS: "Lise",
    NG: "Nathalie"
  },

  /* -----------------------------------------------------------------------
     10. TEXTES DE CONNEXION, IMPORT / EXPORT ET MESSAGES
     ----------------------------------------------------------------------- */
  login: {
    titleHtml: 'Eura<span>Santé</span> CRM',
    subtitle: "Connexion à la base partagée Supabase.",
    email: "Email",
    password: "Mot de passe"
  },

  admin: {
    importTitle: "Importer un Excel",
    importIntro: "Import zéro perte : champs CRM structurés + conservation intégrale de chaque ligne Excel source.",
    importDropText: "Choisis un fichier Excel pour l'analyser.",
    databaseTitle: "Base centrale",
    supabaseProject: "Projet Supabase",
    user: "Utilisateur",
    prospects: "Prospects",
    projects: "Projets",
    sourcing: "Sourcing",
    exportHelp: "Reconstitue un classeur compatible avec l’import initial : Reporting, Projets à sponsoriser, ODJ automatique et onglets de sourcing.",
    multiUserHelp: "Chaque poste utilise la même base Supabase. Les changements sont rechargés automatiquement."
  },

  messages: {
    synced: "● synchronisé",
    syncing: "● actualisation…",
    syncError: "● erreur",
    prospectSaved: "Prospect synchronisé",
    projectSaved: "Projet synchronisé",
    statusSaved: "Statut synchronisé",
    favoriteAdded: "Ajouté aux favoris",
    favoriteRemoved: "Retiré des favoris",
    prospectDeleted: "Prospect supprimé",
    sourceAdded: "Cible ajoutée au CRM",
    sponsorRequired: "Nom sponsor obligatoire",
    noProject: "Sans projet",
    noOwner: "Sans référent",
    noComment: "Aucun commentaire",
    noPriority: "Sans priorité",
    projectActive: "Projet actif",
    projectInactive: "Projet désactivé",
    inactiveAttachmentKept: "Rattachement existant conservé",
    imported: "Importé",
    toQualify: "À qualifier"
  }
};
