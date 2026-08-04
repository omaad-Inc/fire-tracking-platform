import {
    ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
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
 */

type Beat = 'currency' | 'asset' | 'reveal' | 'objective' | 'done';
type Ccy = 'XOF' | 'EUR';
type OnbTool = 'update_user_ai_profile' | 'create_asset' | 'mark_onboarding_complete';

interface Tile { key: string; label: string; category: string; icon: string; }
interface Objective { key: string; label: string; }

@Component({
    selector: 'app-onboarding-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, RippleModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
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
              <!-- Tiles show instantly: the currency write is fire-and-forget and
                   never gates this step. -->
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
export class OnboardingPage implements OnDestroy {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private tokens = inject(TokenService);
    private currencySvc = inject(CurrencyService);
    private dashboard = inject(DashboardService);
    private assetsState = inject(AssetsStateService);
    private api = inject(ApiService);

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

    /** The last gated write (the asset), replayed by retry() after a failure. */
    private lastWrite: { tool: OnbTool; args: Record<string, unknown>; onOk: () => void } | null = null;
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

    ngOnDestroy(): void {
        if (this.raf != null && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.raf);
    }

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
        this.assetAmount.set(null);
        this.error.set(null);
    }
    cancelTile(): void { this.selectedTile.set(null); }

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
