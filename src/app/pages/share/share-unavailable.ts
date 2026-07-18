import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../i18n/i18n.service';

/** Shown when a shared link is expired, revoked, or not found. No app shell. */
@Component({
    selector: 'app-share-unavailable',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-4">
            <div class="text-center max-w-sm">
                <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                    <i class="pi text-2xl text-surface-400" [ngClass]="icon()"></i>
                </div>
                <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ t(titleKey()) }}</h1>
                <p class="text-sm text-surface-500 dark:text-surface-400 mb-5">{{ t(descKey()) }}</p>
                <a [routerLink]="['/']" class="text-sm font-semibold text-brand-700 dark:text-ochre-400 hover:underline">
                    {{ t('shareView.joinCtaButton') }}
                </a>
            </div>
        </div>
    `,
})
export class ShareUnavailable {
    private route = inject(ActivatedRoute);
    private i18n = inject(I18nService);

    private qp = toSignal(this.route.queryParamMap);
    reason = computed(() => this.qp()?.get('reason') ?? 'notFound');

    icon = computed(() => this.reason() === 'expired' ? 'pi-clock'
        : this.reason() === 'revoked' ? 'pi-ban' : 'pi-link');
    titleKey = computed(() => `shareUnavailable.${this.reason()}Title`);
    descKey = computed(() => `shareUnavailable.${this.reason()}Desc`);

    t(k: string) { return this.i18n.t(k); }
}
