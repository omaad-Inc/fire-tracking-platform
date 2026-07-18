import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ShareContextService } from '../../core/services/share-context.service';
import { I18nService } from '../../i18n/i18n.service';

/**
 * Passcode gate for a code-protected shared portfolio. On success it loads the
 * frozen bundle (with the code) into share mode and enters the read-only app.
 */
@Component({
    selector: 'app-share-code-gate',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    template: `
        <div class="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-4">
            <div class="w-full max-w-sm text-center">
                <div class="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center mx-auto mb-4">
                    <i class="pi pi-lock text-2xl text-brand-700 dark:text-ochre-400"></i>
                </div>
                <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ t('shareGate.title') }}</h1>
                <p class="text-sm text-surface-500 dark:text-surface-400 mb-5">{{ t('shareGate.prompt') }}</p>
                <input [(ngModel)]="code" type="password" (keyup.enter)="submit()"
                       class="w-full text-center tracking-widest bg-surface-0 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-xl px-4 py-3 mb-3 text-surface-900 dark:text-surface-0"
                       [placeholder]="t('shareGate.placeholder')" />
                @if (error()) { <p class="text-xs text-negative mb-3">{{ t('shareGate.wrong') }}</p> }
                <button (click)="submit()" [disabled]="busy() || !code"
                        class="w-full px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                    @if (busy()) { <i class="pi pi-spin pi-spinner"></i> } @else { {{ t('shareGate.submit') }} }
                </button>
            </div>
        </div>
    `,
})
export class ShareCodeGate {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private api = inject(ApiService);
    private share = inject(ShareContextService);
    private i18n = inject(I18nService);

    code = '';
    busy = signal(false);
    error = signal(false);

    t(k: string) { return this.i18n.t(k); }

    async submit() {
        const token = this.route.parent?.snapshot.paramMap.get('token')
            ?? this.route.snapshot.paramMap.get('token') ?? '';
        this.busy.set(true);
        this.error.set(false);
        try {
            const bundle = await firstValueFrom(this.api.getPublicPortfolio(token, this.code));
            this.share.activate(token, bundle);
            this.router.navigate(['/share', token]);
        } catch {
            this.error.set(true);
        } finally {
            this.busy.set(false);
        }
    }
}
