import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { NavService } from '../../../core/services/nav.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { TokenService } from '../../../core/services/token.service';
import { DiscoverService } from '../../service/discover.service';
import { DiscoverCard } from '../../../core/services/api.service';

/**
 * Visual per card. `photo` = a licensed photo rendition produced by
 * tools/discover-images.sh (full-bleed, Revolut-style); `shot` = one of the
 * marketing product screenshots (assets/marketing/<name>.webp), used until a
 * photo exists for that card. Add a photo by dropping <key>.jpg in
 * tools/discover-src and setting `photo: '<key>'` here.
 */
const VISUALS: Record<DiscoverCard['key'], { photo?: string; shot?: string }> = {
    brvm_performance: { photo: 'brvm_performance' },   // Abidjan flyover, BRVM's home (Pexels, Silvere Meya)
    brvm_alert:       { shot: 'marches' },
    ai_assistant:     { shot: 'assistant' },
    premium_advisor:  { shot: 'assistant' },
    weekly_recap:     { photo: 'weekly_recap' },    // seaside couple at dusk, silhouettes (Pixabay, ChristianBodhi)
    monthly_pdf:      { shot: 'patrimoine' },
    keep_pro:         { shot: 'synthese' },
};

/**
 * Home "Découvrir" carousel (Revolut home-card pattern, owner ask 2026-11-09).
 *
 * Up to three closable cards, one per viewport on a phone (scroll-snap, dots),
 * two-up from `sm`. Each card: a tier chip, a headline carrying the member's
 * own number, one qualifier, one action row, a close button. Which cards and
 * in which mode (discover vs convert) is the server's call; this component
 * renders copy from `discover.cards.<key>` with the server's params and
 * reports impressions, taps and closes so the funnel can be read.
 *
 * Renders nothing until the cards arrive (a promotional surface earns no
 * skeleton), and nothing at all for members the server gives no card.
 */
@Component({
    selector: 'app-discover-widget',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    template: `
        @if (cards().length) {
            <section class="omaad-fade-in" [attr.aria-label]="t('discover.label')" data-testid="discover">
                <div #track (scroll)="onScroll()"
                     class="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
                     style="scrollbar-width:none; -ms-overflow-style:none;">
                    @for (c of cards(); track c.key; let i = $index) {
                        <article class="relative isolate overflow-hidden snap-center shrink-0 w-[86%] sm:w-[calc(50%-8px)] rounded-[22px] min-h-[340px] sm:min-h-[320px] flex flex-col shadow-card"
                                 [ngClass]="surface(c)" [attr.data-testid]="'discover-card-' + c.key">

                            <!-- Visual layer. Photo mode: full-bleed, graded navy so white type
                                 reads anywhere (Revolut). Screenshot mode: the real product
                                 screen, tilted, bleeding off the bottom-right corner. -->
                            @if (photo(c); as ph) {
                                <img [src]="ph.src" [srcset]="ph.srcset" sizes="(min-width: 640px) 50vw, 86vw"
                                     width="1200" height="750" alt="" aria-hidden="true" loading="lazy" decoding="async"
                                     class="absolute inset-0 -z-10 w-full h-full object-cover" />
                                <div class="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true"
                                     style="background: linear-gradient(180deg, rgba(26,39,64,0.94) 0%, rgba(26,39,64,0.88) 30%, rgba(26,39,64,0.62) 50%, rgba(26,39,64,0.28) 68%, rgba(26,39,64,0.84) 100%)"></div>
                            } @else {
                                <div class="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true" [style.background]="glow(c)"></div>
                                @if (shot(c); as sh) {
                                    <img [src]="sh" width="780" height="1688" alt="" aria-hidden="true" loading="lazy" decoding="async"
                                         class="absolute -z-10 right-[-6%] top-[44%] w-[50%] sm:w-[46%] rounded-[18px] shadow-2xl pointer-events-none select-none"
                                         style="transform: rotate(-7deg); box-shadow: 0 24px 48px -12px rgba(0,0,0,0.45)" />
                                }
                            }

                            <button type="button" (click)="dismiss(c, i)" [attr.aria-label]="t('discover.close')"
                                    class="omaad-press absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                                    [ngClass]="dark(c) ? 'bg-warm-900/10 text-warm-900/70 hover:bg-warm-900/20' : 'bg-black/25 text-white/85 hover:bg-black/40 hover:text-white'">
                                <i class="pi pi-times text-[11px]" aria-hidden="true"></i>
                            </button>

                            <div class="relative p-5 pr-14 pb-0">
                                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider backdrop-blur-md"
                                      [ngClass]="chip(c)">
                                    @if (c.tier !== 'free') { <i class="pi pi-crown !text-[9px]" aria-hidden="true"></i> }
                                    {{ t('discover.tier.' + c.tier) }}
                                </span>
                                <h3 class="mt-3 text-[22px] sm:text-2xl font-bold leading-[1.15] tracking-tight max-w-[20ch]"
                                    [ngClass]="[dark(c) ? 'text-warm-900' : 'text-white', photo(c) ? 'ink-shadow' : '']">{{ title(c) }}</h3>
                                <!-- On a photo the qualifier is near-white with a shadow: white/75 over a
                                     bright sky was the one line nobody could read (owner, 2026-11-09). -->
                                <p class="mt-2 text-[14px] leading-relaxed max-w-[30ch] font-medium"
                                   [ngClass]="[dark(c) ? 'text-warm-900/80' : photo(c) ? 'text-white/95 ink-shadow' : 'text-white/80']">{{ sub(c) }}</p>
                            </div>

                            <div class="relative flex-1"></div>

                            <!-- The one action, Revolut's bottom row: glass, icon, label, chevron. -->
                            <div class="relative p-3 pt-0 z-10">
                                <button type="button" (click)="open(c, i)"
                                        class="omaad-press w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left backdrop-blur-xl transition-colors cursor-pointer border"
                                        [ngClass]="dark(c)
                                            ? 'bg-warm-900/10 hover:bg-warm-900/15 text-warm-900 border-warm-900/10'
                                            : 'bg-white/[0.14] hover:bg-white/[0.22] text-white border-white/15'">
                                    <span class="w-8 h-8 rounded-full grid place-items-center shrink-0"
                                          [ngClass]="dark(c) ? 'bg-warm-900/10' : 'bg-white/15'">
                                        <i class="pi text-[13px]" [ngClass]="icon(c)" aria-hidden="true"></i>
                                    </span>
                                    <span class="flex-1 text-[15px] font-semibold leading-tight">{{ cta(c) }}</span>
                                    <i class="pi pi-chevron-right text-xs opacity-70" aria-hidden="true"></i>
                                </button>
                            </div>
                        </article>
                    }
                </div>

                @if (cards().length > 1) {
                    <div class="flex justify-center gap-1.5 mt-3" [class.sm:hidden]="cards().length <= 2" aria-hidden="true">
                        @for (c of cards(); track c.key; let i = $index) {
                            <span class="h-1.5 rounded-full transition-all duration-300 ease-standard"
                                  [ngClass]="i === active() ? 'w-4 bg-brand-700 dark:bg-ochre-400' : 'w-1.5 bg-surface-300 dark:bg-surface-700'"></span>
                        }
                    </div>
                }
            </section>
        }
    `,
    styles: [`
        /* Type over photography: a tight shadow for edge contrast plus a wide
           navy halo that quietly lifts the text off a bright sky. */
        .ink-shadow { text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45), 0 0 18px rgba(26, 39, 64, 0.55); }
    `],
})
export class DiscoverWidget implements OnInit {
    private i18n = inject(I18nService);
    private nav = inject(NavService);
    private router = inject(Router);
    private analytics = inject(AnalyticsService);
    private token = inject(TokenService);
    private discover = inject(DiscoverService);

    readonly cards = this.discover.cards;
    readonly active = signal(0);
    private track = viewChild<ElementRef<HTMLElement>>('track');
    private shown = new Set<string>();

    private readonly lang = computed(() => this.i18n.lang());

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    ngOnInit(): void {
        this.discover.load().then((res) => {
            // One impression per card per session: the carousel sits above the
            // fold on every home open, so "shown" means "the response rendered".
            res.cards.forEach((c, i) => {
                if (this.shown.has(c.key)) return;
                this.shown.add(c.key);
                this.analytics.track('discover_card_shown', { key: c.key, mode: res.mode, position: i });
            });
        }).catch(() => null);
    }

    onScroll(): void {
        const el = this.track()?.nativeElement;
        if (!el || !el.firstElementChild) return;
        const w = (el.firstElementChild as HTMLElement).offsetWidth + 12;
        this.active.set(Math.min(this.cards().length - 1, Math.max(0, Math.round(el.scrollLeft / w))));
    }

    open(c: DiscoverCard, position: number): void {
        this.analytics.track('discover_card_clicked', { key: c.key, mode: this.discover.mode(), position, action: c.action });
        void this.router.navigate(this.nav.link(...c.route), { queryParams: c.query ?? undefined });
    }

    dismiss(c: DiscoverCard, position: number): void {
        this.analytics.track('discover_card_dismissed', { key: c.key, mode: this.discover.mode(), position });
        void this.discover.dismiss(c.key);
    }

    // ── copy ────────────────────────────────────────────────────────────────

    title(c: DiscoverCard): string { return this.t(`discover.cards.${c.key}.title`, this.params(c)); }
    sub(c: DiscoverCard): string { return this.t(`discover.cards.${c.key}.sub`, this.params(c)); }

    cta(c: DiscoverCard): string {
        // Without the entitlement every Pro card is a door to the plans page,
        // so the action says so instead of promising to open the feature.
        if (c.action === 'upgrade' && c.key !== 'keep_pro' && c.key !== 'premium_advisor') {
            return this.t('discover.action.upgrade');
        }
        return this.t(`discover.cards.${c.key}.cta`, this.params(c));
    }

    private params(c: DiscoverCard): Record<string, string | number> {
        const p: Record<string, string | number> = { ...c.params };
        if (c.key === 'keep_pro') {
            p['price'] = this.price(c);
            p['date'] = c.params['ends_at'] ? this.day(String(c.params['ends_at'])) : '';
        }
        if (c.key === 'monthly_pdf' && c.params['month']) {
            p['month'] = this.month(String(c.params['month']));
        }
        return p;
    }

    private price(c: DiscoverCard): string {
        const eur = this.token.user()?.preferred_currency === 'EUR';
        const locale = this.lang() === 'fr' ? 'fr-FR' : 'en-GB';
        if (eur) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(c.params['price_eur']))} €`;
        return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(c.params['price_xof']))} F CFA`;
    }

    private day(iso: string): string {
        return new Date(iso).toLocaleDateString(this.lang() === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long' });
    }

    private month(ym: string): string {
        const [y, m] = ym.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString(this.lang() === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long' });
    }

    // ── look ────────────────────────────────────────────────────────────────

    /** Tier-tinted grounds, the same identity as the subscription hero and
     *  the plans page: Pro = navy gradient, Premium = deep navy, the free news
     *  card = ochre with dark text (ochre never carries white text). In photo
     *  mode the ground is the graded photo itself. */
    surface(c: DiscoverCard): string {
        if (this.photo(c)) return 'bg-brand-800 text-white';
        switch (c.tier) {
            case 'premium': return 'bg-brand-950 text-white border border-brand-700/50';
            case 'pro':     return 'bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-white';
            default:        return 'bg-gradient-to-br from-ochre-400 to-ochre-500 text-warm-900';
        }
    }

    glow(c: DiscoverCard): string {
        return c.tier === 'free'
            ? 'radial-gradient(90% 90% at 92% -10%, rgba(255,255,255,0.30) 0%, transparent 60%)'
            : 'radial-gradient(90% 90% at 92% -10%, rgba(216,163,105,0.26) 0%, transparent 60%), radial-gradient(70% 80% at 0% 100%, rgba(91,132,196,0.18) 0%, transparent 60%)';
    }

    /** A licensed photo rendition exists for this card (tools/discover-images.sh). */
    photo(c: DiscoverCard): { src: string; srcset: string } | null {
        const v = VISUALS[c.key];
        if (!v?.photo) return null;
        const base = `assets/discover/${v.photo}`;
        return { src: `${base}-1200.webp`, srcset: `${base}-800.webp 800w, ${base}-1200.webp 1200w` };
    }

    /** Otherwise the real product screen stands in for the photo. */
    shot(c: DiscoverCard): string | null {
        const v = VISUALS[c.key];
        return v?.shot ? `assets/marketing/${v.shot}.webp` : null;
    }

    chip(c: DiscoverCard): string {
        return this.dark(c) ? 'bg-warm-900/10 text-warm-900' : 'bg-white/15 text-white/90';
    }

    /** Dark ink only on the ochre ground: a free card WITHOUT a photo. Every
     *  photo card is graded navy, so its type is white whatever the tier. */
    dark(c: DiscoverCard): boolean {
        return c.tier === 'free' && !this.photo(c);
    }

    icon(c: DiscoverCard): string {
        switch (c.key) {
            case 'brvm_performance': return 'pi-chart-line';
            case 'brvm_alert':       return 'pi-bell';
            case 'monthly_pdf':      return 'pi-file-pdf';
            case 'ai_assistant':     return 'pi-sparkles';
            case 'premium_advisor':  return 'pi-sparkles';
            case 'weekly_recap':     return 'pi-envelope';
            default:                 return 'pi-crown';
        }
    }
}
