import { Component, inject, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';

// Routes where the FAB should NOT appear (detail pages, settings)
const HIDE_FAB_PATTERNS = [
    '/patrimoine/assets/',
    '/patrimoine/category/',
    '/patrimoine/add-asset',
    '/settings/',
    '/pages/plans',
];

@Component({
    selector: 'app-fab',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (showFab) {
            <button
                class="fab-button lg:hidden fixed right-5 z-50 w-14 h-14 rounded-full bg-brand-700 hover:bg-brand-800 text-white shadow-xl hover:shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95"
                (click)="action.emit()"
                [attr.aria-label]="i18n.t('quickAdd.fabLabel')"
            >
                <i class="pi pi-plus text-xl"></i>
            </button>
        }
    `,
    styles: [`
        .fab-button {
            /* Sits just above the bottom nav (70px) with a 12px gap */
            bottom: calc(70px + 12px + env(safe-area-inset-bottom, 0px));
        }
    `]
})
export class AppFab implements OnInit {
    @Output() action = new EventEmitter<void>();

    private router = inject(Router);
    readonly i18n = inject(I18nService);
    showFab = true;

    ngOnInit() {
        this.updateVisibility(this.router.url);
        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe((e: NavigationEnd) => this.updateVisibility(e.urlAfterRedirects));
    }

    private updateVisibility(url: string) {
        this.showFab = !HIDE_FAB_PATTERNS.some(p => url.includes(p));
    }
}
