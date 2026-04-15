import { Component, inject, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

// Routes where the FAB should NOT appear (detail pages, settings)
const HIDE_FAB_PATTERNS = [
    '/patrimoine/assets/',
    '/patrimoine/category/',
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
                class="fab-button lg:hidden fixed right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
                (click)="addAsset.emit()"
                aria-label="Ajouter un actif"
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
    @Output() addAsset = new EventEmitter<void>();

    private router = inject(Router);
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
