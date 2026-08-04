import { TestBed } from '@angular/core/testing';
import { ChatEmptyStateComponent } from './chat-empty-state';
import { I18nService } from '../../../i18n/i18n.service';

/**
 * The teaching empty state must show the assistant greeting plus four starter
 * chips covering the four things it can do (asset, transaction, goal,
 * question), including the asset-purchase example that a brand-new user needs
 * to discover the write path.
 */
describe('ChatEmptyStateComponent (teaching empty state)', () => {
    async function setup() {
        TestBed.configureTestingModule({ imports: [ChatEmptyStateComponent] });
        await TestBed.inject(I18nService).loadLang('fr');
        const fixture = TestBed.createComponent(ChatEmptyStateComponent);
        fixture.detectChanges();
        return fixture;
    }

    afterEach(() => TestBed.resetTestingModule());

    it('shows four starter chips including the asset-purchase example', async () => {
        const fixture = await setup();
        const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
        expect(buttons.length).toBe(4);
        const text = (fixture.nativeElement as HTMLElement).textContent || '';
        expect(text).toContain('acheté une maison');
    });

    it('emits the tapped prompt via (pick)', async () => {
        const fixture = await setup();
        const picked: string[] = [];
        fixture.componentInstance.pick.subscribe((p) => picked.push(p));

        const first = (fixture.nativeElement as HTMLElement).querySelector('button')!;
        first.click();

        expect(picked.length).toBe(1);
        expect(picked[0]).toContain('acheté une maison');
    });

    it('leads with advice once the portfolio is populated (both agents represented)', async () => {
        TestBed.configureTestingModule({ imports: [ChatEmptyStateComponent] });
        await TestBed.inject(I18nService).loadLang('fr');
        const fixture = TestBed.createComponent(ChatEmptyStateComponent);
        fixture.componentRef.setInput('populated', true);
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        const buttons = el.querySelectorAll('button');
        expect(buttons.length).toBe(4);
        const text = el.textContent || '';
        // Advice is surfaced (diversification question), and a recording example
        // stays the top chip so config remains a first-class suggestion.
        expect(text).toContain('diversifié');
        expect(buttons[0].textContent || '').toContain('Ajoute une dépense');
    });
});
