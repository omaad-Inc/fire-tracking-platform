import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AppAmountComponent } from './app-amount.component';
import { CurrencyService } from '../services/currency.service';
import { ApiService } from '../services/api.service';
import { TokenService } from '../services/token.service';
import { AnalyticsService } from '../services/analytics.service';
import { ShareContextService } from '../services/share-context.service';

/**
 * `<app-amount>` is ~90% of the money surface: every net worth, every row,
 * every KPI tile goes through it. It used to hardcode `maximumFractionDigits: 0`
 * plus a `Math.round`, which is what rendered a 539,69 € rent as "540 €".
 * These tests pin the derived width and the hero split.
 */
@Component({
    standalone: true,
    imports: [AppAmountComponent],
    // animate=false: the count-up is a reveal, not behaviour under test.
    template: `<app-amount [value]="v" [hero]="hero" [decimals]="decimals" [animate]="false" />`,
})
class Host {
    v = 0;
    hero = false;
    decimals: number | undefined = undefined;
}

function setup(currency: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        imports: [Host],
        providers: [
            CurrencyService,
            { provide: ApiService, useValue: { getFxRates: () => of({ rates: {}, as_of: '' }), updateProfile: () => of({}) } },
            { provide: TokenService, useValue: { user: () => ({ preferred_currency: currency }), setUser: () => {} } },
            { provide: AnalyticsService, useValue: { track: () => {} } },
            { provide: ShareContextService, useValue: { active: () => false, currency: () => 'EUR' } },
        ],
    });
    return TestBed.createComponent(Host);
}

/** Rendered text with the count-up settled. */
function render(fx: ReturnType<typeof setup>): string {
    fx.detectChanges();
    TestBed.flushEffects();
    fx.detectChanges();
    return (fx.nativeElement.textContent ?? '').trim();
}

describe('AppAmountComponent (decimal width)', () => {
    it('keeps the cents of a EUR amount that has them', () => {
        const fx = setup('EUR');
        fx.componentInstance.v = 539.69;
        expect(render(fx)).toBe('539,69€');
    });

    it('shows no decimals on a whole EUR amount', () => {
        const fx = setup('EUR');
        fx.componentInstance.v = 14;
        expect(render(fx)).toBe('14€');
    });

    it('keeps a trailing zero inside the minor unit', () => {
        const fx = setup('EUR');
        fx.componentInstance.v = 518.90;
        expect(render(fx)).toBe('518,90€');
    });

    it('never grows a centime on FCFA', () => {
        const fx = setup('XOF');
        fx.componentInstance.v = 100;          // 65 595.7 FCFA
        expect(render(fx)).toBe('65 596FCFA');
    });

    it('honors an explicit width for a rollup', () => {
        const fx = setup('EUR');
        fx.componentInstance.v = 539.69;
        fx.componentInstance.decimals = 0;
        expect(render(fx)).toBe('540€');
    });
});

describe('AppAmountComponent (hero split)', () => {
    it('splits the minor unit into its own span, separator included', () => {
        const fx = setup('EUR');
        fx.componentInstance.v = 1234.56;
        fx.componentInstance.hero = true;
        fx.detectChanges();
        TestBed.flushEffects();
        fx.detectChanges();

        const spans: HTMLElement[] = Array.from(fx.nativeElement.querySelectorAll('span'));
        const minor = spans.find(s => s.className.includes('0.55em'));
        expect(minor).toBeTruthy();
        expect(minor!.textContent).toBe(',56');
        expect(fx.nativeElement.textContent.trim()).toBe('1 234,56€');
    });

    it('draws no decimal span at all when the amount is whole', () => {
        const fx = setup('EUR');
        fx.componentInstance.v = 1234;
        fx.componentInstance.hero = true;
        fx.detectChanges();
        TestBed.flushEffects();
        fx.detectChanges();

        const spans: HTMLElement[] = Array.from(fx.nativeElement.querySelectorAll('span'));
        expect(spans.some(s => s.className.includes('0.55em'))).toBe(false);
        expect(fx.nativeElement.textContent.trim()).toBe('1 234€');
    });

    it('draws no decimal span for a currency with no minor unit', () => {
        const fx = setup('XOF');
        fx.componentInstance.v = 100;
        fx.componentInstance.hero = true;
        fx.detectChanges();
        TestBed.flushEffects();
        fx.detectChanges();

        const spans: HTMLElement[] = Array.from(fx.nativeElement.querySelectorAll('span'));
        expect(spans.some(s => s.className.includes('0.55em'))).toBe(false);
    });
});
