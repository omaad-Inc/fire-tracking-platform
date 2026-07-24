import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { I18nService } from '../../../i18n/i18n.service';
import { NavService } from '../../../core/services/nav.service';
import { CoachingService } from '../../service/coaching.service';
import { CoachingRecommendation } from '../../../core/services/api.service';
import { UiCardComponent, EmptyStateComponent } from '../../../core/ui';
import { LoadErrorComponent } from '../../../core/components/load-error.component';

/**
 * Conseils surface (S6-3): the ranked coaching recommendations as actionable
 * cards. Each card states WHY (the recommendation's own numbers) and offers ONE
 * next action that deep-links to where the user acts on it. Dismissible with
 * memory. Calm all-clear when there is nothing to say.
 */
@Component({
    selector: 'app-coaching-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, UiCardComponent, EmptyStateComponent, LoadErrorComponent],
    template: `
        @if (error()) {
            <app-load-error (retry)="load()" />
        } @else if (loading()) {
            <div class="space-y-3">
                @for (i of [1,2,3]; track i) {
                    <div class="h-28 rounded-2xl bg-surface-200 dark:bg-surface-700 animate-pulse"></div>
                }
            </div>
        } @else if (coaching.recommendations().length === 0) {
            <app-empty-state icon="pi-check-circle" [title]="t('coaching.allClear.title')"
                             [message]="t('coaching.allClear.desc')" />
        } @else {
            <div class="space-y-3" role="list">
                @for (r of coaching.recommendations(); track r.id) {
                    <app-ui-card role="listitem" [class]="'border-l-4 ' + borderClass(r.severity)">
                        <div class="flex items-start gap-3 min-w-0">
                            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" [class]="iconBg(r.severity)">
                                <i class="pi text-sm" [class]="icon(r.severity) + ' ' + iconColor(r.severity)"></i>
                            </div>
                            <div class="min-w-0">
                                <div class="font-semibold text-surface-900 dark:text-surface-0">{{ coaching.title(r) }}</div>
                                <p class="text-sm text-surface-600 dark:text-surface-300 mt-1">{{ coaching.detail(r) }}</p>
                            </div>
                        </div>
                        <div class="mt-3 pl-12">
                            <button type="button" (click)="act(r)"
                                    class="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-ochre-400 hover:underline cursor-pointer">
                                {{ coaching.action(r) }} <i class="pi pi-arrow-right text-xs"></i>
                            </button>
                        </div>
                    </app-ui-card>
                }
            </div>
        }
    `,
})
export class CoachingPanel implements OnInit {
    coaching = inject(CoachingService);
    private i18n = inject(I18nService);
    private nav = inject(NavService);
    private router = inject(Router);

    loading = signal(true);
    error = signal(false);

    t(k: string, p?: Record<string, string | number>): string { return this.i18n.t(k, p); }

    ngOnInit() { this.load(); }

    async load() {
        this.error.set(false);
        if (this.coaching.recommendations().length === 0) this.loading.set(true);
        try {
            await this.coaching.load();
        } catch {
            if (this.coaching.recommendations().length === 0) this.error.set(true);
        } finally {
            this.loading.set(false);
        }
    }

    /** Navigate a recommendation's deep-link ("/pages/x?y=z"), lang-prefixed. */
    act(r: CoachingRecommendation) {
        const [path, query] = r.action_route.replace(/^\//, '').split('?');
        const segments = path.split('/').filter(Boolean);
        const queryParams: Record<string, string> = {};
        if (query) for (const pair of query.split('&')) {
            const [k, v] = pair.split('=');
            if (k) queryParams[k] = v ?? '';
        }
        this.router.navigate(this.nav.link(...segments), { queryParams });
    }

    borderClass(sev: string): string {
        return sev === 'high' ? 'border-l-negative' : sev === 'medium' ? 'border-l-ochre-500' : 'border-l-surface-300 dark:border-l-surface-600';
    }
    iconBg(sev: string): string {
        return sev === 'high' ? 'bg-negative/10' : sev === 'medium' ? 'bg-ochre-500/10' : 'bg-surface-200 dark:bg-surface-700';
    }
    iconColor(sev: string): string {
        return sev === 'high' ? 'text-negative' : sev === 'medium' ? 'text-ochre-600 dark:text-ochre-400' : 'text-surface-500 dark:text-surface-400';
    }
    icon(sev: string): string {
        return sev === 'high' ? 'pi-exclamation-triangle' : sev === 'medium' ? 'pi-info-circle' : 'pi-lightbulb';
    }
}
