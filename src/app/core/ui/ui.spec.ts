import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
    ChipComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    SectionHeaderComponent,
    StatCardComponent,
    UiCardComponent,
} from './index';

/** Host that mounts every design-system primitive together (Sprint 2). */
@Component({
    standalone: true,
    imports: [
        PageHeaderComponent, SectionHeaderComponent, UiCardComponent,
        StatCardComponent, EmptyStateComponent, ChipComponent,
    ],
    template: `
        <app-page-header eyebrow="Patrimoine" title="Mes actifs" subtitle="Vue d'ensemble">
            <button actions>Ajouter</button>
        </app-page-header>
        <app-section-header title="Répartition" subtitle="Par catégorie"></app-section-header>
        <app-ui-card [interactive]="true"><p>card body</p></app-ui-card>
        <app-stat-card label="Patrimoine net" icon="pi-wallet" [trend]="4.2" hint="30j">
            <span>12 345 €</span>
        </app-stat-card>
        <app-empty-state icon="pi-inbox" title="Aucun actif" message="Ajoutez-en un.">
            <button>Ajouter</button>
        </app-empty-state>
        <app-chip label="Tontine" tone="ochre"></app-chip>
    `,
})
class HostComponent {}

describe('design-system UI primitives', () => {
    it('render together without error and project their content', () => {
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;

        expect(el.querySelector('app-page-header h1')?.textContent).toContain('Mes actifs');
        expect(el.querySelector('app-section-header h2')?.textContent).toContain('Répartition');
        expect(el.querySelector('app-stat-card')?.textContent).toContain('12 345');
        // Trend renders with a sign.
        expect(el.querySelector('app-stat-card')?.textContent).toContain('+4.2%');
        expect(el.querySelector('app-empty-state')?.textContent).toContain('Aucun actif');
        expect(el.querySelector('app-chip')?.textContent).toContain('Tontine');
        // Projected actions/CTA present.
        expect(el.querySelector('app-page-header [actions]')?.textContent).toContain('Ajouter');
    });

    it('chip applies a tone class', () => {
        const fixture = TestBed.createComponent(ChipComponent);
        fixture.componentInstance.label = 'X';
        fixture.componentInstance.tone = 'positive';
        fixture.detectChanges();
        const span: HTMLElement = fixture.nativeElement.querySelector('span');
        expect(span.className).toContain('positive');
    });
});
