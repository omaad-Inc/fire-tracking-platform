import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-debts-stats',
    imports: [CommonModule],
    template: `
        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Dette Totale</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ totalDebt | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-red-100 dark:bg-red-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-credit-card text-red-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">-{{ totalDebtChange | currency: 'EUR' }} </span>
                <span class="text-muted-color ml-2">variation ce mois</span>
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Montant Déjà Payé</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ paidAmount | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-check-circle text-green-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">+{{ paidAmountChange | currency: 'EUR' }} </span>
                <span class="text-muted-color ml-2">payé ce mois</span>
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Montant des Créances</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ receivables | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-arrow-down text-blue-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">+{{ receivablesChange | currency: 'EUR' }} </span>
                <span class="text-muted-color ml-2">créances ce mois</span>
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Prochain Paiement</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ nextPayment | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-calendar text-orange-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">{{ nextPaymentDate }}</span>
                <span class="text-muted-color ml-2">date prévue</span>
            </div>
        </div>
    `
})
export class DeptsStats {
    totalDebt = 18500; // Dette totale en EUR
    totalDebtChange = 500; // Variation ce mois
    paidAmount = 7200; // Montant déjà payé en EUR
    paidAmountChange = 800; // Payé ce mois
    receivables = 3200; // Montant des créances en EUR
    receivablesChange = 200; // Créances ce mois
    nextPayment = 1200; // Prochain paiement en EUR
    nextPaymentDate = '15/07/2024'; // Date du prochain paiement
}

