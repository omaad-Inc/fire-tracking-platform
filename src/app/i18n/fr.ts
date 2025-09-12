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
    remarks: 'Remarques'
  },
  dashboard: {
    recentTransactions: 'Transactions récentes',
    debtsOverview: 'Vue Globale des Dettes',
    savingsProgress: "Progression de l'Epargne",
    kpi: {
      netWorth: 'Patrimoine total brut',
      sinceLastMonth: 'depuis le mois dernier',
      monthlySavingsRate: "Taux d’épargne mensuel",
      savedThisMonth: 'économisés ce mois',
      passiveIncome: 'Revenus passifs',
      thisMonth: 'ce mois'
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
    manageTitle: 'Gestion de l’épargne',
    detailsTitle: 'Détail de l’épargne',
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


