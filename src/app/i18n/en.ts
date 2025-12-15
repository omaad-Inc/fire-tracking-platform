export const EN = {
  common: {
    viewMore: 'View more',
    search: 'Search...',
    cancel: 'Cancel',
    save: 'Save',
    date: 'Date',
    name: 'Name',
    type: 'Type',
    amount: 'Amount',
    account: 'Account',
    remarks: 'Remarks',
    back: 'Back',
    close: 'Close',
    export: 'Export'
  },
  menu: {
    navigation: 'Navigation',
    dashboard: 'Dashboard',
    patrimony: 'Patrimony',
    transactions: 'Transactions',
    finances: 'Finances',
    savings: 'Savings',
    debts: 'Debts',
    account: 'Account',
    settings: 'Settings',
    myAccount: 'My Account',
    security: 'Security',
    preferences: 'Preferences'
  },
  settings: {
    title: 'Manage my account',
    backToDashboard: 'Back to dashboard',
    manageAccount: 'Manage my account',
    help: 'Help',
    getHelp: 'Get help',
    account: {
      myProfile: 'My profile',
      profilePicture: 'Profile picture',
      changePhoto: 'Change photo',
      firstName: 'First name',
      lastName: 'Last name',
      myEmail: 'My email',
      verified: 'VERIFIED',
      manageEmail: 'Manage my email',
      session: 'Session',
      logout: 'Log out',
      logoutDesc: 'Log out of your account on this device',
      logoutButton: 'Log out',
      deleteAccount: 'Danger zone',
      deleteAccountDesc: 'Deleting your account will permanently delete all your data and is irreversible.',
      deleteMyAccount: 'Delete my account'
    },
    security: {
      title: 'Security',
      password: 'Password',
      lastChanged: 'Last changed {{time}} ago',
      change: 'Change',
      twoFactor: 'Two-factor authentication',
      twoFactorDesc: 'Add an extra layer of security',
      enabled: 'Enabled',
      disabled: 'Disabled',
      authApp: 'Authentication app',
      recoveryEmail: 'Recovery email',
      configured: 'Configured',
      activeSessions: 'Active sessions',
      currentSession: 'Current session',
      disconnectOthers: 'Disconnect all other sessions',
      securityLog: 'Security log',
      loginSuccess: 'Successful login',
      passwordChanged: 'Password changed',
      twoFactorEnabled: '2FA enabled'
    },
    preferences: {
      title: 'Preferences',
      language: 'Language',
      currency: 'Currency',
      theme: 'Theme',
      lightMode: 'Light Mode',
      darkMode: 'Dark Mode',
      systemMode: 'System',
      notifications: 'Notifications',
      emailNotifications: 'Email notifications',
      emailNotificationsDesc: 'Receive updates by email',
      pushNotifications: 'Push notifications',
      pushNotificationsDesc: 'Receive push notifications',
      monthlyReports: 'Monthly reports',
      monthlyReportsDesc: 'Receive a monthly summary of your patrimony',
      expenseAlerts: 'Expense alerts',
      expenseAlertsDesc: 'Get alerted for unusual expenses',
      data: 'Data',
      exportData: 'Export my data',
      exportDataDesc: 'Download all your data in CSV format'
    }
  },
  topbar: {
    notifications: 'Notifications',
    logout: 'Log out'
  },
  dashboard: {
    recentTransactions: 'Recent transactions',
    debtsOverview: 'Debts overview',
    savingsProgress: "Savings progress",
    kpi: {
      netWorth: 'Total net worth',
      sinceLastMonth: 'since last month',
      monthlySavingsRate: 'Monthly savings rate',
      savedThisMonth: 'saved this month',
      passiveIncome: 'Passive income',
      thisMonth: 'this month'
    }
  },
  patrimoine: {
    assets: {
      title: 'Assets'
    },
    list: {
      name: 'Name',
      share: 'Share',
      value: 'Value',
      delta: '+/- value All'
    },
    repartition: {
      total: 'Total'
    }
  },
  transactions: {
    bankBalance: 'Bank accounts balance',
    totalExpense: 'Total expenses',
    lastSalary: 'Last salary',
    onDate: 'on {{date}}',
    logTitle: 'Transaction log',
    new: 'New',
    delete: 'Delete',
    export: 'Export',
    detailsTitle: 'Transaction details',
    messages: {
      dateRequired: 'Date is required.',
      nameRequired: 'Name is required.',
      deleteSelectedConfirm: 'Are you sure you want to delete the selected records?',
      deleteOneConfirm: 'Are you sure you want to delete {{name}}?',
      successful: 'Successful',
      recordsDeleted: 'Records Deleted',
      recordDeleted: 'Record Deleted',
      recordUpdated: 'Record Updated',
      recordCreated: 'Record Created'
    }
  },
  savings: {
    manageTitle: 'Manage savings',
    detailsTitle: 'Saving record details',
    labels: {
      total: 'Total savings',
      thisMonth: 'This month saving',
      averageMonthly: 'Average monthly saving'
    },
    messages: {
      dateRequired: 'Date is required.',
      nameRequired: 'Name is required.',
      deleteSelectedConfirm: 'Are you sure you want to delete the selected records?',
      deleteOneConfirm: 'Are you sure you want to delete {{name}}?',
      successful: 'Successful',
      recordsDeleted: 'Records Deleted',
      recordDeleted: 'Record Deleted',
      recordUpdated: 'Record Updated',
      recordCreated: 'Record Created'
    }
  }
} as const;


