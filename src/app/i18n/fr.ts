export const FR = {
  common: {
    viewMore: 'Voir plus',
    search: 'Rechercher...',
    cancel: 'Annuler',
    save: 'Enregistrer',
    date: 'Date',
    name: 'Nom',
    type: 'Type',
    amount: 'Montant',
    account: 'Compte',
    remarks: 'Remarques',
    back: 'Retour',
    close: 'Fermer',
    export: 'Exporter'
  },
  menu: {
    navigation: 'Navigation',
    dashboard: 'Synthèse',
    patrimony: 'Patrimoine',
    transactions: 'Transactions',
    finances: 'Finances',
    savings: 'Épargne',
    debts: 'Dettes',
    account: 'Compte',
    settings: 'Paramètres',
    myAccount: 'Mon compte',
    security: 'Sécurité',
    preferences: 'Préférences'
  },
  settings: {
    title: 'Gérer mon compte',
    backToDashboard: 'Retour au tableau de bord',
    manageAccount: 'Gérer mon compte',
    help: 'Aide',
    getHelp: 'Obtenir de l\'aide',
    account: {
      myProfile: 'Mon profil',
      profilePicture: 'Photo de profil',
      changePhoto: 'Changer la photo',
      firstName: 'Prénom',
      lastName: 'Nom',
      myEmail: 'Mon email',
      verified: 'VÉRIFIÉ',
      manageEmail: 'Gérer mon email',
      session: 'Session',
      logout: 'Se déconnecter',
      logoutDesc: 'Déconnectez-vous de votre compte sur cet appareil',
      logoutButton: 'Se déconnecter',
      deleteAccount: 'Zone de danger',
      deleteAccountDesc: 'La suppression de votre compte entraîne la suppression définitive de toutes vos données et est irréversible.',
      deleteMyAccount: 'Supprimer mon compte'
    },
    security: {
      title: 'Sécurité',
      password: 'Mot de passe',
      lastChanged: 'Dernière modification il y a {{time}}',
      change: 'Modifier',
      twoFactor: 'Authentification à deux facteurs',
      twoFactorDesc: 'Ajoutez une couche de sécurité supplémentaire',
      enabled: 'Activé',
      disabled: 'Désactivé',
      authApp: 'Application d\'authentification',
      recoveryEmail: 'Email de récupération',
      configured: 'Configuré',
      activeSessions: 'Sessions actives',
      currentSession: 'Session actuelle',
      disconnectOthers: 'Déconnecter toutes les autres sessions',
      securityLog: 'Historique de sécurité',
      loginSuccess: 'Connexion réussie',
      passwordChanged: 'Mot de passe modifié',
      twoFactorEnabled: '2FA activé'
    },
    preferences: {
      title: 'Préférences',
      language: 'Langue',
      currency: 'Devise',
      theme: 'Thème',
      lightMode: 'Mode Clair',
      darkMode: 'Mode Sombre',
      systemMode: 'Système',
      notifications: 'Notifications',
      emailNotifications: 'Notifications par email',
      emailNotificationsDesc: 'Recevoir des mises à jour par email',
      pushNotifications: 'Notifications push',
      pushNotificationsDesc: 'Recevoir des notifications push',
      monthlyReports: 'Rapports mensuels',
      monthlyReportsDesc: 'Recevoir un résumé mensuel de votre patrimoine',
      expenseAlerts: 'Alertes de dépenses',
      expenseAlertsDesc: 'Être alerté en cas de dépenses inhabituelles',
      data: 'Données',
      exportData: 'Exporter mes données',
      exportDataDesc: 'Télécharger toutes vos données au format CSV'
    }
  },
  topbar: {
    notifications: 'Notifications',
    logout: 'Se déconnecter',
    addAssets: 'Ajouter un actif'
  },
  addAssets: {
    title: 'Ajouter un actif',
    searchPlaceholder: 'Rechercher un type d\'actif...',
    allCategories: 'Toutes les catégories'
  },
  dashboard: {
    recentTransactions: 'Transactions récentes',
    debtsOverview: 'Vue Globale des Dettes',
    savingsProgress: "Progression de l'Épargne",
    worthEvolution: 'Évolution du patrimoine',
    months: 'mois',
    noDataYet: 'Pas encore de données',
    distribution: 'Distribution du Patrimoine',
    noAssets: 'Aucun actif enregistré',
    noAssetsDesc: 'Ajoutez vos premiers actifs pour voir la distribution',
    noRecentTransactions: 'Aucune transaction récente',
    noDebts: 'Aucune dette enregistrée',
    noDebtsCongrats: 'Félicitations ! 🎉',
    topMovers: 'Top Movers',
    topMoversSubtitle: 'Meilleures & pires performances',
    noMovers: 'Ajoutez des actifs pour voir les movers',
    expenseDistribution: 'Répartition des Dépenses',
    noExpenses: 'Aucune dépense ce mois',
    noExpensesDesc: 'Vos dépenses apparaîtront ici',
    savingsNoGoal: "Aucun objectif d'épargne",
    savingsCreateGoal: 'Créer un objectif',
    kpi: {
      netWorth: 'Patrimoine total brut',
      sinceLastMonth: 'depuis le mois dernier',
      monthlySavingsRate: "Taux d'épargne mensuel",
      savedThisMonth: 'économisés ce mois',
      passiveIncome: 'Revenus passifs',
      thisMonth: 'ce mois',
      thisMonthLabel: 'ce mois-ci',
      monthlyFlux: 'Flux Mensuel',
      monthlyFluxRevenues: 'Revenus',
      monthlyFluxExpenses: 'Dépenses',
      monthlyFluxSub: 'dépenses',
      monthlyFluxNet: 'flux net',
      noData: 'Aucune donnée',
      fireObjectif: 'Objectif FIRE',
      fireNotConfigured: 'Non configuré',
      fireGoalUndefined: 'objectif non défini',
      fireConfigure: 'Configurer',
      fireTarget: 'sur',
      fireYearsLeft: 'ans restants',
      fireReached: 'Objectif atteint !',
      addTransaction: 'Ajouter une transaction',
    }
  },
  patrimoine: {
    assets: {
      title: 'Actifs'
    },
    list: {
      name: 'Nom',
      share: 'Répartition',
      value: 'Valeur',
      delta: '+/- valeur Tout'
    },
    repartition: {
      total: 'Total'
    }
  },
  transactions: {
    bankBalance: 'Solde Comptes Bancaires',
    totalExpense: 'Dépenses Totales',
    lastSalary: 'Dernier Salaire',
    onDate: 'le {{date}}',
    logTitle: 'Journal des transactions',
    new: 'Nouveau',
    delete: 'Supprimer',
    export: 'Exporter',
    detailsTitle: 'Détails de la transaction',
    messages: {
      dateRequired: 'La date est obligatoire.',
      nameRequired: 'Le nom est obligatoire.',
      deleteSelectedConfirm: 'Voulez-vous supprimer les éléments sélectionnés ?',
      deleteOneConfirm: 'Voulez-vous supprimer {{name}} ?',
      successful: 'Succès',
      recordsDeleted: 'Éléments supprimés',
      recordDeleted: 'Élément supprimé',
      recordUpdated: 'Élément mis à jour',
      recordCreated: 'Élément créé'
    }
  },
  savings: {
    manageTitle: "Gestion de l'épargne",
    detailsTitle: "Détail de l'épargne",
    evolution: 'Évolution de l\'Épargne',
    progressionMensuelle: 'Progression mensuelle',
    noDataYet: 'Pas encore de données',
    labels: {
      total: 'Épargne totale',
      thisMonth: 'Épargne du mois',
      averageMonthly: 'Épargne mensuelle moyenne'
    },
    messages: {
      dateRequired: 'La date est obligatoire.',
      nameRequired: 'Le nom est obligatoire.',
      deleteSelectedConfirm: 'Voulez-vous supprimer les éléments sélectionnés ?',
      deleteOneConfirm: 'Voulez-vous supprimer {{name}} ?',
      successful: 'Succès',
      recordsDeleted: 'Éléments supprimés',
      recordDeleted: 'Élément supprimé',
      recordUpdated: 'Élément mis à jour',
      recordCreated: 'Élément créé'
    }
  }
} as const;


