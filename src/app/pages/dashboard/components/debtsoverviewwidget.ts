import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    standalone: true,
    selector: 'app-debts-overview',
    imports: [CommonModule, RouterModule],
    template: `
        <div class="card h-full">
            <div class="flex justify-between items-center mb-6">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ t('dashboard.debtsOverview') }}</div>
                <a [routerLink]="link('pages', 'debts')" class="text-indigo-500 hover:text-indigo-400 font-medium text-sm transition-colors">
                    {{ t('common.viewMore') }} <i class="pi pi-chevron-right text-xs ml-1"></i>
                </a>
            </div>
            <ul class="list-none p-0 m-0 space-y-5">
                <li *ngFor="let debt of debts" class="group">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center" [ngClass]="debt.bgClass">
                                <i [class]="debt.icon" [ngClass]="debt.iconClass"></i>
                            </div>
                            <div>
                                <span class="text-surface-900 dark:text-surface-0 font-medium block">{{ debt.label }}</span>
                                <span class="text-surface-500 dark:text-surface-400 text-sm">{{ debt.paid | currency:'EUR':'symbol':'1.0-0' }} / {{ debt.total | currency:'EUR':'symbol':'1.0-0' }}</span>
                            </div>
                        </div>
                        <span class="font-bold text-lg" [ngClass]="debt.textClass">{{ debt.percent }}%</span>
                    </div>
                    <div class="relative h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-500" 
                             [ngClass]="debt.progressClass" 
                             [ngStyle]="{ width: debt.percent + '%' }">
                        </div>
                    </div>
                </li>
            </ul>
        </div>
    `
})
export class DebtsOverview {
    debts = [
        { 
            label: 'Loyer 2 mois', 
            paid: 1200, 
            total: 2400, 
            percent: 50,
            icon: 'pi pi-home',
            bgClass: 'bg-indigo-500/10',
            iconClass: 'text-indigo-500',
            progressClass: 'bg-gradient-to-r from-indigo-600 to-indigo-400',
            textClass: 'text-indigo-500'
        },
        { 
            label: 'Prêt ami', 
            paid: 300, 
            total: 1000, 
            percent: 30,
            icon: 'pi pi-users',
            bgClass: 'bg-emerald-500/10',
            iconClass: 'text-emerald-500',
            progressClass: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
            textClass: 'text-emerald-500'
        },
        { 
            label: 'Crédit Auto', 
            paid: 5000, 
            total: 15000, 
            percent: 33,
            icon: 'pi pi-car',
            bgClass: 'bg-cyan-500/10',
            iconClass: 'text-cyan-500',
            progressClass: 'bg-gradient-to-r from-cyan-600 to-cyan-400',
            textClass: 'text-cyan-500'
        }
    ];

    constructor(private i18n: I18nService, private router: Router) {}
    
    t(key: string): string { 
        return this.i18n.t(key); 
    }

    link(...segments: string[]): any[] {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as 'fr' | 'en';
        return ['/', lang, ...segments];
    }
}
