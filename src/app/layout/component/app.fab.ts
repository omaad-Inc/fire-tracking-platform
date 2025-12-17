import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-fab',
    standalone: true,
    imports: [CommonModule],
    template: `
        <!-- Floating Action Button - Mobile Only -->
        <button
            class="fab-button lg:hidden fixed right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-contrast shadow-xl shadow-primary/30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
            [class.fab-expanded]="isExpanded"
            (click)="toggleOrEmit()"
            aria-label="Add asset"
        >
            <i class="pi pi-plus text-xl transition-transform duration-300" [class.rotate-45]="isExpanded"></i>
        </button>
    `,
    styles: [`
        .fab-button {
            bottom: calc(5rem + env(safe-area-inset-bottom, 0px) + 1rem);
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        .fab-button:not(:hover) {
            animation: pulse 3s ease-in-out infinite;
        }
        
        .fab-button:hover {
            animation: none;
        }
    `]
})
export class AppFab {
    @Output() addAsset = new EventEmitter<void>();
    
    isExpanded = false;

    toggleOrEmit(): void {
        this.addAsset.emit();
    }
}

