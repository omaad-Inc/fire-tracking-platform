import {
    ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { firstValueFrom } from 'rxjs';

import { I18nService } from '../../i18n/i18n.service';
import { TokenService } from '../../core/services/token.service';
import { CurrencyService } from '../../core/services/currency.service';
import { DashboardService } from '../service/dashboard.service';
import { AssetsStateService } from '../service/assets-state.service';
import { ApiService } from '../../core/services/api.service';

/**
 * The first-run concierge (S12 Phase 6, tasks 2.7/2.8). Auto-launched full-screen
 * on first login (Welcome.finish -> /:lang/onboarding), behind ff_aiChat.
 *
 * Tap-first, DETERMINISTIC writes: the user taps chips + fills tiny forms, and each
 * write goes straight to POST /agents/onboarding/action, which runs the exact tool
 * through the audited Config pipeline (guards 8/9/10 + audit) with NO model call.
 * The concierge already knows what to write, so it never asks an LLM to translate a
 * tap into a tool call, removing every model-flakiness failure (no tool call,
 * duplicate calls, confirm parks) from the first agent a new user meets.
 *
 * Three beats + reveal + handoff. Currency/objective writes are fire-and-forget
 * (non-critical, optimistic advance); the asset write is gated with an inline retry;
 * completion always navigates so a rare failure never strands the user. The FE
 * renders the tap affordances and the net-worth reveal (0 -> X count-up). Skippable
 * at every step, no dead-ends.
 *
 * Catalog rule ([[catalog-scope-wa-first]]): the tiles only offer categories that
 * need NO predefined instrument list. BRVM stocks are deliberately absent — the
 * real BRVM flow needs the 47-instrument picker (ticker + price per share +
 * quantity, add-asset-page) and create_asset carries no ticker field, so a tile
 * here could only produce a tickerless stocks_brvm asset the quote engine can
 * never revalue. BRVM is added properly from inside the app.
 */

type Beat = 'currency' | 'asset' | 'reveal' | 'objective' | 'done';
type Ccy = 'XOF' | 'EUR';
type OnbTool = 'update_user_ai_profile' | 'create_asset' | 'mark_onboarding_complete';

interface Tile { key: string; label: string; category: string; icon: string; }
interface Objective { key: string; label: string; hint: string; icon: string; }

/** Total beats shown in the progress bar (currency, asset, objective). */
const STEPS = 3;

@Component({
    selector: 'app-onboarding-page',
    standalone: true,
    imports: [CommonModule, FormsModule, InputTextModule, RippleModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="onb-shell relative w-full flex items-center justify-center">
      <!-- Top bar: progress on the left, skip on the right. Skip is a real,
           readable control (never a dead-end, ratified): it lands on the
           dashboard and the nudge reopens the flow. -->
      <header class="onb-top absolute top-0 inset-x-0 flex items-center justify-between gap-4">
        <div class="flex flex-col gap-1.5 flex-1 max-w-[11rem]">
          <span class="text-[0.72rem] font-semibold tracking-wide text-white/55">
            {{ t('concierge.step', { n: stepIndex() + 1, total: steps }) }}
          </span>
          <div class="flex gap-1" role="progressbar"
               [attr.aria-valuenow]="stepIndex() + 1" [attr.aria-valuemin]="1" [attr.aria-valuemax]="steps">
            @for (i of stepList; track i) {
              <span class="h-1 flex-1 rounded-full transition-colors duration-300"
                    [class]="stepIndex() >= i ? 'bg-ochre-500' : 'bg-white/15'"></span>
            }
          </div>
        </div>
        <button type="button" (click)="skip()" [disabled]="streaming()"
                class="shrink-0 min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold
                       text-white/90 bg-white/10 border border-white/25 backdrop-blur
                       transition-colors hover:bg-white/20 hover:border-white/40 hover:text-white
                       disabled:opacity-40 disabled:pointer-events-none">
          {{ t('concierge.skip') }}
        </button>
      </header>

      <div class="onb-in w-full max-w-[26rem] flex flex-col gap-5">
        <!-- Header: sparkle + warm greeting -->
        <div class="text-center">
          <div class="onb-badge bg-ochre-500/20 text-ochre-300"><i class="pi pi-sparkles" aria-hidden="true"></i></div>
          <h1 class="text-[1.6rem] font-bold leading-tight tracking-tight text-white">
            {{ t('concierge.hello') }}<span *ngIf="firstName()"> {{ firstName() }}</span>
          </h1>
          <!-- Concierge line: the agent's streamed words, or the static beat prompt.
               Hidden on reveal/done, where the card carries its own caption. -->
          @if (beat() !== 'reveal' && beat() !== 'done') {
            <p class="mt-2.5 text-base leading-relaxed text-white/70">{{ conciergeLine() || t(promptKey()) }}</p>
          }
        </div>

        @if (error()) {
          <div role="alert"
               class="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-sm
                      bg-negative-500/10 border border-negative-500/30 text-negative-300">
            <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
            <span class="flex-1 text-left">{{ error() }}</span>
            <button type="button" (click)="retry()" class="shrink-0 font-semibold text-white underline">
              {{ t('concierge.retry') }}
            </button>
          </div>
        }

        <!-- ── Beat body ─────────────────────────────────────────────────── -->
        @switch (beat()) {

          @case ('currency') {
            <div class="flex flex-col gap-2.5">
              @for (c of currencies; track c.code) {
                <button type="button" pRipple (click)="pickCurrency(c.code)" [disabled]="streaming()"
                        class="onb-row" [class.onb-row-sel]="currency() === c.code">
                  <span class="onb-tok text-xs font-bold">{{ symbolOf(c.code) }}</span>
                  <span class="flex-1 text-left text-[0.98rem] font-semibold">{{ c.label }}</span>
                  <i class="pi pi-check shrink-0 !text-sm text-ochre-400 transition-opacity"
                     [class.opacity-0]="currency() !== c.code" aria-hidden="true"></i>
                </button>
              }
            </div>
          }

          @case ('asset') {
            @if (!selectedTile()) {
              <!-- Tiles show instantly: the currency write is fire-and-forget and
                   never gates this step. -->
              <div class="grid grid-cols-2 gap-2.5">
                @for (tile of tiles(); track tile.key; let idx = $index) {
                  <button type="button" pRipple (click)="selectTile(tile)"
                          class="onb-tile onb-tile-in group"
                          [style.animation-delay]="(idx * 0.03) + 's'">
                    <span class="onb-tok transition-colors group-hover:bg-ochre-500/30">
                      <i class="pi {{ tile.icon }}" aria-hidden="true"></i>
                    </span>
                    <span class="text-[0.8rem] font-medium leading-snug">{{ tile.label }}</span>
                  </button>
                }
              </div>
              @if (addedCount() > 0) {
                <button type="button" pRipple (click)="goObjective()"
                        class="onb-btn text-white bg-white/5 border border-white/25 hover:bg-white/10 hover:border-white/40">
                  {{ t('concierge.asset.enough') }}
                  <i class="pi pi-arrow-right !text-sm" aria-hidden="true"></i>
                </button>
              }
            } @else {
              <!-- Amount-first form: the amount is the hero (grouped live as it is
                   typed), the name is prefilled from the tile and stays editable. -->
              <div class="flex flex-col gap-2">
                <div class="onb-amount-box flex items-baseline justify-center gap-3 px-4 py-4 rounded-2xl mb-1
                            bg-white/5 border border-white/15 transition-colors">
                  <input #amountInput type="text" inputmode="numeric" autocomplete="off"
                         class="onb-amount flex-1 min-w-0 w-full bg-transparent border-0 outline-none p-0
                                text-[2rem] font-bold tracking-tight tabular-nums text-right text-white"
                         [attr.aria-label]="t('concierge.form.amountLabel')"
                         [placeholder]="t('concierge.form.amountPlaceholder')"
                         [value]="amountText()" [disabled]="streaming()"
                         (input)="onAmountInput($event)" (keyup.enter)="submitAsset()" />
                  <span class="shrink-0 text-base font-semibold"
                        [class]="assetAmount() !== null ? 'text-ochre-300' : 'text-white/55'">{{ symbolOf(currency()) }}</span>
                </div>

                <label for="onb-name" class="text-[0.78rem] font-semibold text-white/60">{{ t('concierge.form.nameLabel') }}</label>
                <input id="onb-name" #nameInput pInputText type="text"
                       class="w-full !bg-white/5 !text-white !border !border-white/20 !rounded-xl !px-4 !py-3 !text-[0.95rem] focus:!border-ochre-500/70 focus:!shadow-none"
                       [ngModel]="assetName()" (ngModelChange)="assetName.set($event)"
                       [disabled]="streaming()" (keyup.enter)="submitAsset()" />

                <button type="button" pRipple (click)="submitAsset()" [disabled]="!canSaveAsset() || streaming()"
                        class="onb-btn onb-btn-primary mt-2.5">
                  @if (streaming()) { <i class="pi pi-spin pi-spinner !text-sm" aria-hidden="true"></i> }
                  {{ t('concierge.form.save') }}
                </button>
                <button type="button" (click)="cancelTile()" [disabled]="streaming()" class="onb-btn onb-btn-ghost">
                  {{ t('concierge.form.back') }}
                </button>
              </div>
            }
          }

          @case ('reveal') {
            <div class="flex flex-col items-center gap-2 text-center">
              <span class="text-[0.95rem] text-white/70">{{ t('concierge.reveal.caption') }}</span>
              <span class="text-[2.4rem] font-extrabold tracking-tight tabular-nums leading-tight text-white">
                {{ revealDisplay() }}<span class="ml-1.5 text-base font-semibold text-white/60">{{ symbolOf(currency()) }}</span>
              </span>
              <button type="button" pRipple (click)="goObjective()" [disabled]="streaming()"
                      class="onb-btn onb-btn-primary mt-4">
                {{ t('concierge.reveal.continue') }}
                <i class="pi pi-arrow-right !text-sm" aria-hidden="true"></i>
              </button>
              <button type="button" (click)="addAnother()" [disabled]="streaming()" class="onb-btn onb-btn-ghost">
                {{ t('concierge.reveal.addAnother') }}
              </button>
            </div>
          }

          @case ('objective') {
            <div class="flex flex-col gap-2.5">
              @for (o of objectives(); track o.key) {
                <button type="button" pRipple (click)="pickObjective(o)" [disabled]="streaming()" class="onb-row">
                  <span class="onb-tok"><i class="pi {{ o.icon }}" aria-hidden="true"></i></span>
                  <span class="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                    <span class="text-[0.98rem] font-semibold">{{ o.label }}</span>
                    <span class="text-[0.78rem] leading-snug text-white/55">{{ o.hint }}</span>
                  </span>
                  <i class="pi pi-chevron-right shrink-0 !text-xs text-white/35" aria-hidden="true"></i>
                </button>
              }
            </div>
            <button type="button" (click)="finishNoObjective()" [disabled]="streaming()" class="onb-btn onb-btn-ghost">
              {{ t('concierge.objective.later') }}
            </button>
          }

          @case ('done') {
            <div class="flex flex-col items-center gap-2 text-center">
              <div class="onb-badge bg-positive-500/20 text-positive-300"><i class="pi pi-check" aria-hidden="true"></i></div>
              <span class="text-[0.95rem] text-white/70">{{ t('concierge.done') }}</span>
            </div>
          }
        }
      </div>
    </div>
  `,
    styles: [`
    /* Only what Tailwind utilities cannot express (safe-area env(), the shell
       gradient, keyframes) or what would be repeated on a dozen elements.
       Everything else is utility classes — component styles are budgeted. */
    :host { display: block; }
    .onb-shell {
      min-height: 100dvh;
      padding: calc(4.5rem + env(safe-area-inset-top)) 1.25rem calc(1.5rem + env(safe-area-inset-bottom));
      background: radial-gradient(120% 120% at 50% 0%, #24365a 0%, #1A2740 45%, #10182a 100%);
    }
    .onb-top { padding: calc(1rem + env(safe-area-inset-top)) 1.25rem 0; }

    /* Shared shapes (repeated on every row / tile / button). */
    .onb-badge {
      width: 3.25rem; height: 3.25rem; margin: 0 auto 0.9rem; border-radius: 1rem;
      display: inline-flex; align-items: center; justify-content: center; font-size: 1.35rem;
    }
    .onb-tok {
      flex: none; width: 2.5rem; height: 2.5rem; border-radius: 0.75rem;
      display: inline-flex; align-items: center; justify-content: center;
      background: rgb(199 123 60 / 0.18); color: #DFB78A;
    }
    .onb-row, .onb-tile {
      background: rgb(255 255 255 / 0.05); border: 1px solid rgb(255 255 255 / 0.12);
      color: #fff; cursor: pointer; transition: background .18s, border-color .18s, transform .18s;
    }
    .onb-row { display: flex; align-items: center; gap: 0.85rem; width: 100%; padding: 0.9rem 1rem; border-radius: 1rem; }
    .onb-tile {
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
      padding: 1rem 0.5rem; border-radius: 1rem; text-align: center;
    }
    .onb-row:hover:not(:disabled), .onb-tile:hover:not(:disabled) {
      background: rgb(199 123 60 / 0.12); border-color: rgb(199 123 60 / 0.45);
    }
    .onb-row:active:not(:disabled), .onb-tile:active:not(:disabled) { transform: scale(0.98); }
    .onb-row:disabled, .onb-tile:disabled { opacity: 0.5; cursor: default; }
    .onb-row-sel { background: rgb(199 123 60 / 0.16); border-color: #C77B3C; }

    .onb-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      width: 100%; min-height: 48px; padding: 0.85rem 1.25rem; border-radius: 9999px;
      font-size: 0.98rem; font-weight: 600; cursor: pointer;
      transition: background .18s, border-color .18s, color .18s, transform .18s;
    }
    .onb-btn:active:not(:disabled) { transform: scale(0.985); }
    .onb-btn:disabled { cursor: default; opacity: 0.45; }
    /* WCAG (tailwind.config.js): an ochre-500 fill takes DARK text, never white. */
    .onb-btn-primary { background: #C77B3C; color: #2D1B0E; box-shadow: 0 14px 30px -16px rgb(199 123 60 / 0.95); }
    .onb-btn-primary:hover:not(:disabled) { background: #D8A369; }
    .onb-btn-primary:disabled { box-shadow: none; }
    .onb-btn-ghost { background: transparent; color: rgb(255 255 255 / 0.6); min-height: 44px; }
    .onb-btn-ghost:hover:not(:disabled) { color: #fff; }

    /* One focus affordance for the hero amount: the bare input hands its ring to
       the box around it (same ochre + halo as the app-wide :focus-visible ring,
       which stays untouched for every other control). */
    .onb-amount:focus-visible { outline: none; }
    .onb-amount-box:focus-within {
      border-color: #C77B3C; background: rgb(199 123 60 / 0.1);
      box-shadow: 0 0 0 3px rgb(216 163 105 / 0.25);
    }
    .onb-amount::placeholder { color: rgb(255 255 255 / 0.28); font-weight: 600; }

    .onb-in { animation: onbIn .4s ease-out both; }
    .onb-tile-in { animation: onbTileIn .32s ease-out both; }
    @keyframes onbIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes onbTileIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) {
      .onb-in, .onb-tile-in { animation: none; }
      .onb-row, .onb-tile, .onb-btn { transition: none; }
    }
  `],
})
export class OnboardingPage implements OnDestroy {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private tokens = inject(TokenService);
    private currencySvc = inject(CurrencyService);
    private dashboard = inject(DashboardService);
    private assetsState = inject(AssetsStateService);
    private api = inject(ApiService);

    t = (k: string, p?: Record<string, string | number>) => this.i18n.t(k, p);

    readonly steps = STEPS;
    readonly stepList = Array.from({ length: STEPS }, (_, i) => i);

    // ── State ──────────────────────────────────────────────────────────────
    readonly beat = signal<Beat>('currency');
    readonly currency = signal<Ccy>('XOF');
    readonly conciergeLine = signal('');
    readonly streaming = signal(false);
    readonly error = signal<string | null>(null);
    readonly addedCount = signal(0);
    /** Sum of the amounts the user actually typed, in their chosen currency. The
     *  reveal uses THIS, not the EUR-base net worth, to avoid the XOF->EUR->XOF
     *  round-trip drift (75000 -> 75002). Onboarding has no debts, so net worth
     *  equals the sum of assets added. */
    private readonly enteredTotal = signal(0);

    readonly selectedTile = signal<Tile | null>(null);
    readonly assetName = signal('');
    readonly assetAmount = signal<number | null>(null);
    /** What the amount field DISPLAYS: the same grouped format the reveal and the
     *  rest of the app use (100 000, not 100000). assetAmount stays the raw number
     *  sent to the API, so the write payload is unchanged. */
    readonly amountText = signal('');
    readonly revealDisplay = signal('');

    private readonly amountInput = viewChild<ElementRef<HTMLInputElement>>('amountInput');
    private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

    /** The last gated write (the asset), replayed by retry() after a failure. */
    private lastWrite: { tool: OnbTool; args: Record<string, unknown>; onOk: () => void } | null = null;
    private raf: number | null = null;
    private focusTimer: ReturnType<typeof setTimeout> | null = null;

    readonly currencies = [
        { code: 'XOF' as Ccy, label: 'FCFA (XOF)' },
        { code: 'EUR' as Ccy, label: 'Euro (EUR)' },
    ];

    readonly firstName = computed(() => this.tokens.user()?.first_name?.trim() || '');

    /** Only categories that need NO predefined instrument list (see the class
     *  doc): BRVM lives in the app's picker, never here. */
    readonly tiles = computed<Tile[]>(() => {
        const T = (k: string) => this.i18n.t(k);
        return [
            { key: 'wave', label: T('concierge.tiles.wave'), category: 'mobile_money', icon: 'pi-wallet' },
            { key: 'om', label: T('concierge.tiles.orangeMoney'), category: 'mobile_money', icon: 'pi-mobile' },
            { key: 'bank', label: T('concierge.tiles.bank'), category: 'savings_account', icon: 'pi-building' },
            { key: 'realestate', label: T('concierge.tiles.realEstate'), category: 'real_estate', icon: 'pi-home' },
            { key: 'vehicle', label: T('concierge.tiles.vehicle'), category: 'vehicle', icon: 'pi-car' },
            { key: 'cash', label: T('concierge.tiles.cash'), category: 'cash', icon: 'pi-money-bill' },
            { key: 'tontine', label: T('concierge.tiles.tontine'), category: 'tontine', icon: 'pi-users' },
            { key: 'other', label: T('concierge.tiles.other'), category: 'other', icon: 'pi-ellipsis-h' },
        ];
    });

    readonly objectives = computed<Objective[]>(() => {
        const T = (k: string) => this.i18n.t(k);
        return [
            { key: 'financial_freedom', label: T('concierge.objectives.freedom'), hint: T('concierge.objectives.freedomHint'), icon: 'pi-flag' },
            { key: 'buy_property', label: T('concierge.objectives.property'), hint: T('concierge.objectives.propertyHint'), icon: 'pi-home' },
            { key: 'build_savings', label: T('concierge.objectives.savings'), hint: T('concierge.objectives.savingsHint'), icon: 'pi-shield' },
        ];
    });

    readonly stepIndex = computed(() => {
        switch (this.beat()) {
            case 'currency': return 0;
            case 'asset': return 1;
            case 'reveal': return 1;
            case 'objective': return 2;
            case 'done': return 2;
        }
    });

    readonly promptKey = computed(() => {
        switch (this.beat()) {
            case 'currency': return 'concierge.currency.prompt';
            case 'asset': return this.selectedTile() ? 'concierge.form.prompt' : 'concierge.asset.prompt';
            case 'reveal': return 'concierge.reveal.caption';
            case 'objective': return 'concierge.objective.prompt';
            case 'done': return 'concierge.done';
        }
    });

    readonly canSaveAsset = computed(() => {
        const a = this.assetAmount();
        return !!this.assetName().trim() && a != null && a > 0;
    });

    ngOnDestroy(): void {
        if (this.raf != null && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.raf);
        if (this.focusTimer != null) clearTimeout(this.focusTimer);
    }

    /** Display symbol for a currency the concierge offers. Read from the LOCAL
     *  pick, not CurrencyService, whose config still reflects the saved profile
     *  while the (fire-and-forget) currency write is in flight. */
    symbolOf(code: Ccy): string { return code === 'EUR' ? '€' : 'FCFA'; }

    // ── Beat (a): currency ─────────────────────────────────────────────────
    pickCurrency(code: Ccy): void {
        if (this.streaming()) return;
        this.currency.set(code);
        // Advance to the asset beat INSTANTLY (tiles show immediately, no wait).
        // Currency is non-critical (new users default to XOF) and stored locally,
        // so its write is fire-and-forget: a failure never blocks the flow.
        this.error.set(null);
        this.beat.set('asset');
        this.write('update_user_ai_profile', { preferred_currency: code });
    }

    // ── Beat (b): first asset via a tile ───────────────────────────────────
    selectTile(tile: Tile): void {
        if (this.streaming()) return;
        this.selectedTile.set(tile);
        this.assetName.set(tile.key === 'other' ? '' : tile.label);
        this.setAmount(null);
        this.error.set(null);
        // "Autre" needs a name first; every other tile is prefilled, so the amount
        // is the only thing left to type.
        this.focusField(tile.key === 'other' ? 'name' : 'amount');
    }
    cancelTile(): void { this.selectedTile.set(null); this.setAmount(null); }

    /**
     * Amount keystroke: keep only digits (onboarding captures whole units — the
     * reveal and every money surface round to 0 decimals anyway), re-group with
     * the app's own formatter, and restore the caret by digit position so typing
     * mid-number does not jump to the end.
     */
    onAmountInput(ev: Event): void {
        const el = ev.target as HTMLInputElement;
        const raw = el.value;
        const caret = el.selectionStart ?? raw.length;
        const digitsBeforeCaret = (raw.slice(0, caret).match(/\d/g) || []).length;

        const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15);
        const value = digits ? Number(digits) : null;
        this.assetAmount.set(value);
        const formatted = value === null ? '' : this.currencySvc.formatDisplayNumber(value);
        this.amountText.set(formatted);

        // The [value] binding only writes when the signal CHANGES, so a keystroke
        // that leaves the formatted text identical (a stray letter) would linger
        // in the DOM. Write it back ourselves, then place the caret.
        el.value = formatted;
        let pos = formatted.length, seen = 0;
        for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) {
                seen++;
                if (seen === digitsBeforeCaret) { pos = i + 1; break; }
            }
        }
        if (digitsBeforeCaret === 0) pos = 0;
        try { el.setSelectionRange(pos, pos); } catch { /* not supported */ }
    }

    private setAmount(value: number | null): void {
        this.assetAmount.set(value);
        this.amountText.set(value === null ? '' : this.currencySvc.formatDisplayNumber(value));
    }

    /** Focus the field the user is expected to fill next (the keyboard opens on
     *  the amount, Revolut-style). Deferred: the form renders on the next tick. */
    private focusField(which: 'amount' | 'name'): void {
        if (typeof window === 'undefined') return;
        if (this.focusTimer != null) clearTimeout(this.focusTimer);
        this.focusTimer = setTimeout(() => {
            const el = which === 'name' ? this.nameInput() : this.amountInput();
            el?.nativeElement?.focus();
        }, 60);
    }

    submitAsset(): void {
        if (!this.canSaveAsset() || this.streaming()) return;
        const tile = this.selectedTile()!;
        const name = this.assetName().trim();
        const amount = this.assetAmount()!;
        this.gatedWrite(
            'create_asset',
            { name, category: tile.category, current_value: amount, currency: this.currency() },
            () => {
                this.addedCount.update(n => n + 1);
                this.enteredTotal.update(t => t + amount);
                this.reveal();
            },
        );
    }

    addAnother(): void {
        this.selectedTile.set(null);
        this.assetName.set('');
        this.setAmount(null);
        this.conciergeLine.set('');
        this.beat.set('asset');
    }

    private reveal(): void {
        this.selectedTile.set(null);
        // Refresh the app's data views in the background so patrimoine/net worth
        // are fresh when the user lands on the dashboard, but reveal the EXACT
        // amount entered (sum, in the chosen currency) rather than the EUR-base
        // net worth, which round-trips XOF->EUR->XOF and drifts by a few units.
        this.assetsState.notifyAssetsUpdated();
        void this.dashboard.loadDashboard();
        this.beat.set('reveal');
        this.animateReveal(this.enteredTotal());
    }

    private animateReveal(target: number): void {
        const start = performance?.now?.() ?? 0;
        const dur = 850;
        const step = (now: number) => {
            const t = start ? Math.min(1, (now - start) / dur) : 1;
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            this.revealDisplay.set(this.currencySvc.formatDisplayNumber(target * eased));
            if (t < 1 && typeof requestAnimationFrame !== 'undefined') {
                this.raf = requestAnimationFrame(step);
            } else {
                this.revealDisplay.set(this.currencySvc.formatDisplayNumber(target));
            }
        };
        if (typeof requestAnimationFrame !== 'undefined') this.raf = requestAnimationFrame(step);
        else this.revealDisplay.set(this.currencySvc.formatDisplayNumber(target));
    }

    // ── Beat (c): objective (optional) ─────────────────────────────────────
    goObjective(): void { this.error.set(null); this.conciergeLine.set(''); this.beat.set('objective'); }

    pickObjective(o: Objective): void {
        if (this.streaming()) return;
        // Optimistic: show the celebratory "done" screen instantly. The objective
        // is optional, so its write is fire-and-forget (never blocks), then we hand
        // off. The done beat shows its own copy.
        this.beat.set('done');
        this.write('update_user_ai_profile', { objective: o.key });
        this.handoff();
    }
    finishNoObjective(): void {
        if (this.streaming()) return;
        this.handoff();
    }

    // ── Handoff ────────────────────────────────────────────────────────────
    private async handoff(): Promise<void> {
        this.beat.set('done');
        // Mark complete, then ALWAYS navigate: the asset is already saved, so a
        // rare completion failure must never strand the user on the done screen
        // (a missed flag only re-prompts onboarding on the next login).
        try { await this.write('mark_onboarding_complete', {}); } catch { /* proceed */ }
        this.goDashboard();
    }

    private goDashboard(): void {
        // Completion sets the backend onboarding_complete flag, which is what the
        // guard checks (should_onboard -> false), so NO session flag is needed
        // here. Setting one would wrongly block a legitimate re-onboard after a
        // reset (sessionStorage survives a refresh). Skip() is the only path that
        // needs the per-session suppression.
        this.router.navigate(['/', this.lang()], { replaceUrl: true });
    }

    skip(): void {
        if (this.streaming()) return;
        // A skip does NOT set the backend flag, so without a per-session marker the
        // guard would bounce the user straight back here. Suppress it for this
        // session only; next login re-prompts (resume, ratified decision 9).
        try { sessionStorage.setItem('omaad_onb_skipped', '1'); } catch { /* no storage */ }
        this.router.navigate(['/', this.lang()], { replaceUrl: true });
    }

    /** Replay the last gated write (the asset) after an inline error. */
    retry(): void {
        this.error.set(null);
        const w = this.lastWrite;
        if (w) this.gatedWrite(w.tool, w.args, w.onOk);
    }

    // ── Deterministic write plumbing (no LLM) ──────────────────────────────
    private lang(): string {
        const m = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return m ? m[1] : (this.i18n.lang?.() ?? 'fr');
    }

    /**
     * Fire-and-forget write: run the tool, ignore the outcome. Used for the
     * non-critical currency/objective steps where the beat already advanced and a
     * failure must NEVER surface (currency defaults to XOF; objective is optional).
     */
    private write(tool: OnbTool, args: Record<string, unknown>): void {
        firstValueFrom(this.api.onboardingAction(tool, args)).catch(() => { /* non-blocking */ });
    }

    /**
     * Gated write for the ONE required step (the asset): show a spinner, advance
     * only on a confirmed ok, and surface an inline retry on failure (which is rare
     * now that the write is a deterministic REST call, not a model turn).
     */
    private async gatedWrite(tool: OnbTool, args: Record<string, unknown>, onOk: () => void): Promise<void> {
        this.lastWrite = { tool, args, onOk };
        this.error.set(null);
        this.streaming.set(true);
        try {
            const res = await firstValueFrom(this.api.onboardingAction(tool, args));
            if (res?.status === 'ok') onOk();
            else this.error.set(this.t('concierge.error'));
        } catch {
            this.error.set(this.t('concierge.error'));
        } finally {
            this.streaming.set(false);
        }
    }
}
