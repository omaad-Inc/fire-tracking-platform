import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService, BrokerConnection, BrokerProvider } from '../../../core/services/api.service';
import { I18nService } from '../../../i18n/i18n.service';
import { firstValueFrom } from 'rxjs';

const PROVIDER_META: Record<BrokerProvider, { name: string; flag: string }> = {
    jokko_fi: { name: 'Jokko FI', flag: '🇸🇳' },
    cgf_bourse: { name: 'CGF Bourse', flag: '🇸🇳' },
    bridge_securities: { name: 'Bridge Securities', flag: '🇨🇮' },
    credit_agricole: { name: 'Crédit Agricole', flag: '🇫🇷' },
    boursobank: { name: 'BoursoBank', flag: '🇫🇷' },
    credit_mutuel: { name: 'Crédit Mutuel', flag: '🇫🇷' },
    trade_republic: { name: 'Trade Republic', flag: '🇩🇪' },
    fortuneo: { name: 'Fortuneo', flag: '🇫🇷' },
};

@Component({
    selector: 'app-connections-settings',
    standalone: true,
    imports: [CommonModule, ButtonModule, ToastModule, ConfirmDialogModule],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast position="top-center"></p-toast>
        <p-confirmDialog></p-confirmDialog>

        <div class="max-w-2xl mx-auto">
            <!-- Header -->
            <div class="flex items-center justify-between mb-2">
                <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0">{{ t('broker.connections') }}</h2>
                <button pButton type="button"
                        [label]="t('broker.addAccount')"
                        icon="pi pi-plus"
                        class="omaad-cta !rounded-xl !text-sm"
                        (click)="addAccount()">
                </button>
            </div>

            <p class="text-surface-400 text-sm mb-6">{{ t('broker.refreshNote') }}</p>

            @if (loading()) {
                <div class="flex items-center justify-center py-16">
                    <i class="pi pi-spin pi-spinner text-2xl text-surface-400"></i>
                </div>
            }

            @if (!loading() && connections().length === 0) {
                <!-- Empty state -->
                <div class="text-center py-16">
                    <div class="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                        <i class="pi pi-link text-2xl text-surface-400"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-2">{{ t('broker.emptyTitle') }}</h3>
                    <p class="text-surface-400 text-sm mb-6 max-w-sm mx-auto">{{ t('broker.emptyDesc') }}</p>
                    <button pButton type="button"
                            [label]="t('broker.emptyAction')"
                            icon="pi pi-plus"
                            class="omaad-cta !rounded-xl"
                            (click)="addAccount()">
                    </button>
                </div>
            }

            @if (!loading() && connections().length > 0) {
                <!-- Action required section -->
                @if (errorConnections().length > 0) {
                    <h3 class="text-sm font-semibold text-surface-500 dark:text-surface-400 mb-3 uppercase tracking-wide">{{ t('broker.actionRequired') }}</h3>
                    <div class="space-y-3 mb-8">
                        @for (conn of errorConnections(); track conn.id) {
                            <div class="flex items-center gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                <div class="w-11 h-11 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-lg shrink-0">
                                    {{ providerFlag(conn.provider) }}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ providerName(conn.provider) }}</div>
                                    <div class="text-surface-400 text-xs mt-0.5">{{ conn.login }}</div>
                                </div>
                                <span class="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium shrink-0">
                                    {{ t('broker.authRequired') }}
                                </span>
                                <div class="relative shrink-0">
                                    <button type="button" (click)="toggleMenu(conn.id)"
                                            class="w-8 h-8 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 flex items-center justify-center transition-colors">
                                        <i class="pi pi-ellipsis-h text-surface-400"></i>
                                    </button>
                                    @if (openMenuId() === conn.id) {
                                        <div class="absolute right-0 top-10 w-48 py-1 rounded-xl bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-sm z-50">
                                            <button type="button" (click)="triggerSync(conn)" class="w-full text-left px-4 py-2.5 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                                                <i class="pi pi-refresh mr-2 text-xs"></i>{{ t('broker.sync') }}
                                            </button>
                                            <button type="button" (click)="confirmDelete(conn)" class="w-full text-left px-4 py-2.5 text-sm text-negative dark:text-negative-400 hover:bg-negative-50 dark:hover:bg-negative-700/20 transition-colors">
                                                <i class="pi pi-trash mr-2 text-xs"></i>{{ t('broker.delete') }}
                                            </button>
                                        </div>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                }

                <!-- Active accounts section -->
                @if (activeConnections().length > 0) {
                    <h3 class="text-sm font-semibold text-surface-500 dark:text-surface-400 mb-3 uppercase tracking-wide">{{ t('broker.activeAccounts') }}</h3>
                    <div class="space-y-3">
                        @for (conn of activeConnections(); track conn.id) {
                            <div class="flex items-center gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                <div class="w-11 h-11 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-lg shrink-0">
                                    {{ providerFlag(conn.provider) }}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ providerName(conn.provider) }}</div>
                                    <div class="text-surface-400 text-xs mt-0.5">
                                        {{ conn.login }} ·
                                        @if (conn.status === 'pending') {
                                            <span class="text-amber-500">{{ t('broker.statusPending') }}</span>
                                        }
                                        @if (conn.status === 'connected') {
                                            <span class="text-positive">{{ t('broker.statusConnected') }}</span>
                                        }
                                        @if (conn.last_sync) {
                                            · {{ t('broker.lastSync') }}: {{ formatSyncTime(conn.last_sync) }}
                                        }
                                    </div>
                                </div>
                                <div class="relative shrink-0">
                                    <button type="button" (click)="toggleMenu(conn.id)"
                                            class="w-8 h-8 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 flex items-center justify-center transition-colors">
                                        <i class="pi pi-ellipsis-h text-surface-400"></i>
                                    </button>
                                    @if (openMenuId() === conn.id) {
                                        <div class="absolute right-0 top-10 w-48 py-1 rounded-xl bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-sm z-50">
                                            <button type="button" (click)="triggerSync(conn)" class="w-full text-left px-4 py-2.5 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                                                <i class="pi pi-refresh mr-2 text-xs"></i>{{ t('broker.sync') }}
                                            </button>
                                            <button type="button" (click)="confirmDelete(conn)" class="w-full text-left px-4 py-2.5 text-sm text-negative dark:text-negative-400 hover:bg-negative-50 dark:hover:bg-negative-700/20 transition-colors">
                                                <i class="pi pi-trash mr-2 text-xs"></i>{{ t('broker.delete') }}
                                            </button>
                                        </div>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                }
            }
        </div>
    `,
    host: {
        '(document:click)': 'onDocumentClick($event)',
    }
})
export class ConnectionsSettings implements OnInit {
    private router = inject(Router);
    private api = inject(ApiService);
    private i18n = inject(I18nService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    lang = 'fr';
    loading = signal(true);
    connections = signal<BrokerConnection[]>([]);
    openMenuId = signal<number | null>(null);

    errorConnections = computed(() => this.connections().filter(c => c.status === 'error' || c.status === 'disabled'));
    activeConnections = computed(() => this.connections().filter(c => c.status !== 'error' && c.status !== 'disabled'));

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.i18n.setLang(this.lang as 'fr' | 'en');
        this.loadConnections();
    }

    async loadConnections(): Promise<void> {
        this.loading.set(true);
        try {
            const data = await firstValueFrom(this.api.getBrokerConnections());
            this.connections.set(data);
        } catch {
            this.connections.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    providerName(provider: BrokerProvider): string {
        return PROVIDER_META[provider]?.name ?? provider;
    }

    providerFlag(provider: BrokerProvider): string {
        return PROVIDER_META[provider]?.flag ?? '🏦';
    }

    formatSyncTime(iso: string): string {
        const diff = Date.now() - new Date(iso).getTime();
        const hours = Math.floor(diff / 3_600_000);
        if (hours < 1) return 'il y a quelques minutes';
        if (hours < 24) return `il y a ${hours}h`;
        const days = Math.floor(hours / 24);
        return `il y a ${days}j`;
    }

    toggleMenu(id: number): void {
        this.openMenuId.set(this.openMenuId() === id ? null : id);
    }

    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        if (!target.closest('.pi-ellipsis-h') && !target.closest('[class*="absolute"]')) {
            this.openMenuId.set(null);
        }
    }

    async triggerSync(conn: BrokerConnection): Promise<void> {
        this.openMenuId.set(null);
        try {
            const updated = await firstValueFrom(this.api.syncBrokerConnection(conn.id));
            this.connections.update(list => list.map(c => c.id === conn.id ? updated : c));
            this.messageService.add({ severity: 'info', summary: this.t('broker.syncTriggered'), life: 3000 });
        } catch {
            this.messageService.add({ severity: 'error', summary: this.t('common.error'), detail: this.t('broker.syncFailed'), life: 4000 });
        }
    }

    confirmDelete(conn: BrokerConnection): void {
        this.openMenuId.set(null);
        this.confirmationService.confirm({
            header: this.t('broker.deleteConfirmTitle'),
            message: this.t('broker.deleteConfirmDetail'),
            acceptLabel: this.t('broker.delete'),
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: '!bg-red-600 !border-red-600',
            accept: () => this.deleteConnection(conn),
        });
    }

    async deleteConnection(conn: BrokerConnection): Promise<void> {
        try {
            await firstValueFrom(this.api.deleteBrokerConnection(conn.id));
            this.connections.update(list => list.filter(c => c.id !== conn.id));
            this.messageService.add({ severity: 'success', summary: this.t('broker.deleteSuccess'), life: 3000 });
        } catch {
            this.messageService.add({ severity: 'error', summary: this.t('common.error'), detail: this.t('broker.deleteFailed'), life: 4000 });
        }
    }

    addAccount(): void {
        this.router.navigate(['/', this.lang, 'pages', 'patrimoine', 'connect-broker']);
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
