import {
    ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';

import { I18nService } from '../../i18n/i18n.service';
import { TokenService } from '../../core/services/token.service';
import { CurrencyService } from '../../core/services/currency.service';
import { DashboardService } from '../service/dashboard.service';
import { AssetsStateService } from '../service/assets-state.service';
import { ApiService } from '../../core/services/api.service';
import { SseChatDriver } from '../../core/ai/sse-chat-driver';
import { ChatStreamEvent } from '../../core/ai/chat-events';
import { ChatTurnHandle } from '../../core/ai/chat-stream-driver';

/**
 * The first-run concierge (S12 Phase 6, tasks 2.7/2.8). Auto-launched full-screen
 * on first login (Welcome.finish -> /:lang/onboarding), behind ff_aiChat.
 *
 * Tap-first hybrid (ratified): the user mostly taps chips + fills tiny forms; the
 * onboarding AGENT does EVERY write via its tools through the Config pipeline. We
 * drive the SSE transport DIRECTLY (not the bubble thread) and pass
 * context={onboarding:true, first_name} so the backend keeps every turn on the
 * onboarding agent even after the first asset exists (the completion FLAG ends it).
 *
 * Three beats + reveal + handoff. Each beat sends ONE turn and advances when its
 * tool_result(ok) lands, so turns stay serialized (one write at a time). The agent
 * speaks (streamed conciergeLine); the FE renders the tap affordances and the
 * net-worth reveal (0 -> X count-up). Skippable at every step, no dead-ends.
 */

type Beat = 'currency' | 'asset' | 'reveal' | 'objective' | 'done';
type Ccy = 'XOF' | 'EUR';

interface Tile { key: string; label: string; category: string; icon: string; }
interface Objective { key: string; label: string; }

@Component({
    selector: 'app-onboarding-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, RippleModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // Isolated SSE driver instance for this page's turn state.
    providers: [SseChatDriver],
    template: `
    <div class="onb-shell">
      <!-- Skip: never a dead-end (ratified). Lands on the dashboard; the nudge reopens. -->
      <button type="button" class="onb-skip" (click)="skip()" [disabled]="streaming()">
        {{ t('concierge.skip') }}
      </button>

      <div class="onb-card">
        <!-- Header: sparkle + warm greeting + progress dots -->
        <div class="text-center">
          <div class="onb-badge"><i class="pi pi-sparkles" aria-hidden="true"></i></div>
          <h1 class="onb-title">
            {{ t('concierge.hello') }}<span *ngIf="firstName()"> {{ firstName() }}</span>
          </h1>
          <div class="onb-dots" aria-hidden="true">
            @for (i of [0,1,2]; track i) {
              <span class="onb-dot" [class.on]="stepIndex() >= i" [class.cur]="stepIndex() === i"></span>
            }
          </div>
        </div>

        <!-- Concierge line: the agent's streamed words, or the static beat prompt.
             Hidden on reveal/done, where the card carries its own caption. -->
        @if (beat() !== 'reveal' && beat() !== 'done') {
          <p class="onb-line" [class.dim]="!conciergeLine()">
            {{ conciergeLine() || t(promptKey()) }}
          </p>
        }

        @if (error()) {
          <div class="onb-error">
            <span>{{ error() }}</span>
            <button type="button" class="onb-retry" (click)="retry()">{{ t('concierge.retry') }}</button>
          </div>
        }

        <!-- ── Beat body ─────────────────────────────────────────────────── -->
        @switch (beat()) {

          @case ('currency') {
            <div class="onb-chips">
              @for (c of currencies; track c.code) {
                <button type="button" pRipple class="onb-chip"
                        [class.sel]="currency() === c.code"
                        [disabled]="streaming()"
                        (click)="pickCurrency(c.code)">
                  {{ c.label }}
                </button>
              }
            </div>
          }

          @case ('asset') {
            @if (!selectedTile()) {
              @if (streaming()) {
                <!-- The currency write is in flight (it gates the tiles). Show a
                     calm spinner instead of greyed, non-tappable tiles. -->
                <div class="onb-loading">
                  <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
                  <span>{{ t('concierge.loading') }}</span>
                </div>
              } @else {
                <div class="onb-tiles">
                  @for (tile of tiles(); track tile.key) {
                    <button type="button" pRipple class="onb-tile"
                            (click)="selectTile(tile)">
                      <i class="pi {{ tile.icon }}" aria-hidden="true"></i>
                      <span>{{ tile.label }}</span>
                    </button>
                  }
                </div>
                @if (addedCount() > 0) {
                  <button type="button" class="onb-secondary" (click)="goObjective()">
                    {{ t('concierge.asset.enough') }}
                  </button>
                }
              }
            } @else {
              <!-- Tiny inline form: name (prefilled, editable) + amount, currency prefilled -->
              <div class="onb-form">
                <label class="onb-flabel">{{ t('concierge.form.nameLabel') }}</label>
                <input pInputText type="text" class="onb-input"
                       [ngModel]="assetName()" (ngModelChange)="assetName.set($event)"
                       [disabled]="streaming()" />
                <label class="onb-flabel">{{ t('concierge.form.amountLabel') }} ({{ currency() }})</label>
                <input pInputText type="number" inputmode="numeric" class="onb-input"
                       [placeholder]="t('concierge.form.amountPlaceholder')"
                       [ngModel]="assetAmount()" (ngModelChange)="assetAmount.set($event)"
                       [disabled]="streaming()" (keyup.enter)="submitAsset()" />
                <div class="onb-form-actions">
                  <button type="button" class="onb-secondary" (click)="cancelTile()" [disabled]="streaming()">
                    {{ t('concierge.form.back') }}
                  </button>
                  <button pButton pRipple type="button" [label]="t('concierge.form.save')"
                          class="onb-primary" [loading]="streaming()"
                          [disabled]="!canSaveAsset() || streaming()" (click)="submitAsset()"></button>
                </div>
              </div>
            }
          }

          @case ('reveal') {
            <div class="onb-reveal">
              <span class="onb-reveal-cap">{{ t('concierge.reveal.caption') }}</span>
              <span class="onb-reveal-value">{{ revealDisplay() }}</span>
              <div class="onb-form-actions onb-center">
                <button type="button" class="onb-secondary" (click)="addAnother()" [disabled]="streaming()">
                  {{ t('concierge.reveal.addAnother') }}
                </button>
                <button pButton pRipple type="button" [label]="t('concierge.reveal.continue')"
                        class="onb-primary" (click)="goObjective()" [disabled]="streaming()"></button>
              </div>
            </div>
          }

          @case ('objective') {
            <div class="onb-chips onb-wrap">
              @for (o of objectives(); track o.key) {
                <button type="button" pRipple class="onb-chip"
                        [disabled]="streaming()" (click)="pickObjective(o)">
                  {{ o.label }}
                </button>
              }
            </div>
            <button type="button" class="onb-secondary" (click)="finishNoObjective()" [disabled]="streaming()">
              {{ t('concierge.objective.later') }}
            </button>
          }

          @case ('done') {
            <div class="onb-reveal">
              <div class="onb-badge onb-ok"><i class="pi pi-check" aria-hidden="true"></i></div>
              <span class="onb-reveal-cap">{{ t('concierge.done') }}</span>
            </div>
          }
        }
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; }
    .onb-shell {
      position: relative; min-height: 100dvh; width: 100%;
      display: flex; align-items: center; justify-content: center;
      padding: 1.25rem;
      background: radial-gradient(120% 120% at 50% 0%, #24365a 0%, #1A2740 45%, #10182a 100%);
    }
    .onb-skip {
      position: absolute; top: max(0.9rem, env(safe-area-inset-top)); right: 1rem;
      color: rgba(255,255,255,0.6); font-size: 0.85rem; cursor: pointer;
      background: transparent; border: 0;
    }
    .onb-skip:hover { color: rgba(255,255,255,0.9); }
    .onb-skip:disabled { opacity: 0.4; cursor: default; }

    .onb-card {
      width: 100%; max-width: 30rem; display: flex; flex-direction: column; gap: 1.25rem;
      animation: onbIn 0.4s ease-out both;
    }
    @keyframes onbIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

    .onb-badge {
      width: 3.25rem; height: 3.25rem; margin: 0 auto 0.9rem; border-radius: 1rem;
      display: inline-flex; align-items: center; justify-content: center;
      background: rgba(199,123,60,0.18); color: #E4A96B; font-size: 1.35rem;
    }
    .onb-badge.onb-ok { background: rgba(52,199,120,0.16); color: #4ade80; }
    .onb-title { color: #fff; font-size: 1.6rem; font-weight: 700; line-height: 1.2; }

    .onb-dots { display: flex; gap: 0.4rem; justify-content: center; margin-top: 0.9rem; }
    .onb-dot { width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: rgba(255,255,255,0.2); transition: all .3s; }
    .onb-dot.on { background: #C77B3C; }
    .onb-dot.cur { transform: scale(1.25); box-shadow: 0 0 0 4px rgba(199,123,60,0.18); }

    .onb-line { color: rgba(255,255,255,0.92); text-align: center; font-size: 1.02rem; line-height: 1.5; min-height: 1.5em; }
    .onb-line.dim { color: rgba(255,255,255,0.72); }

    .onb-error {
      display: flex; align-items: center; justify-content: center; gap: 0.6rem;
      color: #fca5a5; font-size: 0.85rem;
    }
    .onb-retry { color: #fff; text-decoration: underline; background: transparent; border: 0; cursor: pointer; }

    .onb-chips { display: flex; gap: 0.6rem; justify-content: center; }
    .onb-chips.onb-wrap { flex-wrap: wrap; }
    .onb-chip {
      padding: 0.7rem 1.1rem; border-radius: 9999px; cursor: pointer;
      background: rgba(255,255,255,0.06); color: #fff;
      border: 1.5px solid rgba(255,255,255,0.18); font-weight: 600; font-size: 0.95rem;
      transition: all .18s;
    }
    .onb-chip:hover:not(:disabled) { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.35); }
    .onb-chip.sel { background: #C77B3C; border-color: #C77B3C; }
    .onb-chip:disabled { opacity: 0.5; cursor: default; }

    .onb-tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
    @media (min-width: 420px) { .onb-tiles { grid-template-columns: repeat(4, 1fr); } }
    .onb-tile {
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      padding: 0.85rem 0.4rem; border-radius: 0.9rem; cursor: pointer;
      background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.14);
      color: #fff; font-size: 0.78rem; text-align: center; transition: all .18s;
    }
    .onb-tile i { font-size: 1.15rem; color: #E4A96B; }
    .onb-tile:hover:not(:disabled) { background: rgba(199,123,60,0.14); border-color: rgba(199,123,60,0.5); transform: translateY(-2px); }
    .onb-tile:disabled { opacity: 0.5; cursor: default; }

    .onb-loading {
      display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
      padding: 1.5rem 0; color: rgba(255,255,255,0.75);
    }
    .onb-loading i { font-size: 1.5rem; color: #E4A96B; }
    .onb-loading span { font-size: 0.9rem; }

    .onb-form { display: flex; flex-direction: column; gap: 0.35rem; }
    .onb-flabel { color: rgba(255,255,255,0.7); font-size: 0.8rem; margin-top: 0.4rem; }
    .onb-input {
      width: 100%; background: rgba(255,255,255,0.06) !important; color: #fff !important;
      border: 1.5px solid rgba(255,255,255,0.2) !important; border-radius: 0.7rem !important;
      padding: 0.7rem 0.9rem !important;
    }
    .onb-form-actions { display: flex; gap: 0.6rem; justify-content: space-between; align-items: center; margin-top: 0.9rem; }
    .onb-form-actions.onb-center { justify-content: center; }
    .onb-secondary { color: rgba(255,255,255,0.7); background: transparent; border: 0; cursor: pointer; font-size: 0.9rem; }
    .onb-secondary:hover:not(:disabled) { color: #fff; }
    .onb-secondary:disabled { opacity: 0.4; cursor: default; }
    .onb-primary { --p-button-background: #C77B3C; --p-button-border-color: #C77B3C; --p-button-hover-background: #b06d33; border-radius: 9999px !important; }

    .onb-reveal { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; }
    .onb-reveal-cap { color: rgba(255,255,255,0.75); font-size: 0.95rem; }
    .onb-reveal-value {
      color: #fff; font-size: 2.25rem; font-weight: 800; letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
  `],
})
export class OnboardingPage implements OnInit, OnDestroy {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private tokens = inject(TokenService);
    private currencySvc = inject(CurrencyService);
    private dashboard = inject(DashboardService);
    private assetsState = inject(AssetsStateService);
    private api = inject(ApiService);
    private driver = inject(SseChatDriver);

    t = (k: string) => this.i18n.t(k);

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
    readonly revealDisplay = signal('');

    private handle: ChatTurnHandle | null = null;
    private toolByCard: Record<string, string> = {};
    private lastMessage = '';
    private raf: number | null = null;

    readonly currencies = [
        { code: 'XOF' as Ccy, label: 'FCFA (XOF)' },
        { code: 'EUR' as Ccy, label: 'Euro (EUR)' },
    ];

    readonly firstName = computed(() => this.tokens.user()?.first_name?.trim() || '');

    readonly tiles = computed<Tile[]>(() => {
        const T = (k: string) => this.i18n.t(k);
        return [
            { key: 'wave', label: T('concierge.tiles.wave'), category: 'mobile_money', icon: 'pi-wallet' },
            { key: 'om', label: T('concierge.tiles.orangeMoney'), category: 'mobile_money', icon: 'pi-mobile' },
            { key: 'bank', label: T('concierge.tiles.bank'), category: 'savings_account', icon: 'pi-building' },
            { key: 'realestate', label: T('concierge.tiles.realEstate'), category: 'real_estate', icon: 'pi-home' },
            { key: 'brvm', label: T('concierge.tiles.brvm'), category: 'stocks_brvm', icon: 'pi-chart-line' },
            { key: 'cash', label: T('concierge.tiles.cash'), category: 'cash', icon: 'pi-money-bill' },
            { key: 'tontine', label: T('concierge.tiles.tontine'), category: 'tontine', icon: 'pi-users' },
            { key: 'other', label: T('concierge.tiles.other'), category: 'other', icon: 'pi-ellipsis-h' },
        ];
    });

    readonly objectives = computed<Objective[]>(() => {
        const T = (k: string) => this.i18n.t(k);
        return [
            { key: 'financial_freedom', label: T('concierge.objectives.freedom') },
            { key: 'buy_property', label: T('concierge.objectives.property') },
            { key: 'build_savings', label: T('concierge.objectives.savings') },
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

    ngOnInit(): void {
        // Pre-warm the onboarding prompt cache so the FIRST tap (currency) hits a
        // warm cache (~2-3s) instead of the cold start (~10-20s) that otherwise
        // gates the asset tiles. Fire-and-forget: warming is best-effort server-side.
        this.api.warmOnboarding().subscribe({ error: () => { /* non-fatal */ } });
    }

    ngOnDestroy(): void {
        this.handle?.cancel();
        if (this.raf != null && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.raf);
    }

    // ── Beat (a): currency ─────────────────────────────────────────────────
    pickCurrency(code: Ccy): void {
        if (this.streaming()) return;
        this.currency.set(code);
        const label = this.currencies.find(c => c.code === code)?.label ?? code;
        // Optimistic: show the asset beat instantly. The write runs in the
        // background; the tiles are disabled while it streams (so no concurrent
        // turn can abort it), then enable on completion. Currency is also stored
        // locally, so a failed write is non-blocking (the asset form still uses it).
        this.conciergeLine.set('');
        this.beat.set('asset');
        this.sendTurn(this.msg('currency', label), 'update_user_ai_profile', () => {}, true);
    }

    // ── Beat (b): first asset via a tile ───────────────────────────────────
    selectTile(tile: Tile): void {
        if (this.streaming()) return;
        this.selectedTile.set(tile);
        this.assetName.set(tile.key === 'other' ? '' : tile.label);
        this.assetAmount.set(null);
        this.error.set(null);
    }
    cancelTile(): void { this.selectedTile.set(null); }

    submitAsset(): void {
        if (!this.canSaveAsset() || this.streaming()) return;
        const tile = this.selectedTile()!;
        const name = this.assetName().trim();
        const amount = this.assetAmount()!;
        this.sendTurn(
            this.msg('asset', name, amount, tile.category),
            'create_asset',
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
        this.assetAmount.set(null);
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
        // Optimistic: show the celebratory "done" screen instantly, then run the
        // objective write and the handoff in the background (silent, the done beat
        // shows its own copy). The objective is optional, so it never blocks.
        this.beat.set('done');
        this.sendTurn(this.msg('objective', o.label), 'update_user_ai_profile', () => this.handoff(), true);
    }
    finishNoObjective(): void {
        if (this.streaming()) return;
        this.handoff();
    }

    // ── Handoff ────────────────────────────────────────────────────────────
    private handoff(): void {
        this.beat.set('done');
        // Silent: the done beat hides the concierge line; we only need the write.
        this.sendTurn(this.msg('handoff'), 'mark_onboarding_complete', () => this.goDashboard(), true);
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
        this.handle?.cancel();
        // A skip does NOT set the backend flag, so without a per-session marker the
        // guard would bounce the user straight back here. Suppress it for this
        // session only; next login re-prompts (resume, ratified decision 9).
        try { sessionStorage.setItem('omaad_onb_skipped', '1'); } catch { /* no storage */ }
        this.router.navigate(['/', this.lang()], { replaceUrl: true });
    }

    retry(): void {
        this.error.set(null);
        if (this.lastMessage) this.rawSend(this.lastMessage, this.lastExpect, this.lastOnOk, this.lastSilent);
    }

    // ── Turn plumbing ──────────────────────────────────────────────────────
    private lastExpect = '';
    private lastOnOk: () => void = () => {};
    private lastSilent = false;

    private sendTurn(message: string, expect: string, onOk: () => void, silent = false): void {
        this.lastMessage = message;
        this.rawSend(message, expect, onOk, silent);
    }

    private rawSend(message: string, expect: string, onOk: () => void, silent = false): void {
        this.lastExpect = expect;
        this.lastOnOk = onOk;
        this.lastSilent = silent;
        this.error.set(null);
        // A silent (optimistic background) write must not overwrite the beat we
        // already advanced to, so keep the concierge line as-is for it.
        if (!silent) this.conciergeLine.set('');
        this.toolByCard = {};
        this.streaming.set(true);
        let done = false;
        const context: Record<string, unknown> = { onboarding: true };
        const fn = this.firstName();
        if (fn) context['first_name'] = fn;

        this.handle = this.driver.startTurn(
            message,
            (e: ChatStreamEvent) => {
                switch (e.type) {
                    case 'text_delta':
                        if (!silent) this.conciergeLine.update(v => v + e.text);
                        break;
                    case 'tool_use':
                        this.toolByCard[e.card_id] = e.tool;
                        break;
                    case 'tool_result':
                        if (e.status === 'ok' && this.toolByCard[e.card_id] === expect && !done) {
                            done = true;
                            onOk();
                        } else if (e.status === 'error') {
                            this.error.set(this.t('concierge.error'));
                        }
                        break;
                    case 'error':
                        this.error.set(this.t('concierge.error'));
                        break;
                }
            },
            () => {
                this.streaming.set(false);
                // The turn ended without the expected write: let the user retry.
                if (!done && !this.error()) this.error.set(this.t('concierge.error'));
            },
            context,
        );
    }

    // ── Messages the agent maps to tool calls (prompt-driven) ──────────────
    private lang(): string {
        const m = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return m ? m[1] : (this.i18n.lang?.() ?? 'fr');
    }

    private msg(kind: 'currency' | 'asset' | 'objective' | 'handoff', a?: string, amount?: number, category?: string): string {
        const fr = this.lang() === 'fr';
        switch (kind) {
            case 'currency':
                return fr ? `Je choisis la devise: ${a}.` : `I choose the currency: ${a}.`;
            case 'asset':
                return fr
                    ? `Ajoute cet actif: ${a}, montant ${amount} ${this.currency()} (categorie ${category}).`
                    : `Add this asset: ${a}, amount ${amount} ${this.currency()} (category ${category}).`;
            case 'objective':
                return fr ? `Mon objectif principal: ${a}.` : `My main goal: ${a}.`;
            case 'handoff':
                return fr ? `J'ai terminé, tu peux finaliser la configuration.` : `I'm done, you can finalize the setup.`;
        }
    }
}
