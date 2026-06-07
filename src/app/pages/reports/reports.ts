import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    TransactionsService, TransactionRecord, MonthlySummary, CATEGORY_CONFIG
} from '../service/transactions.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';

// ── Sankey types ─────────────────────────────────────────────────────────────
interface SNode { id: string; label: string; amount: number; color: string; x: number; y: number; h: number; }
interface SLink { d: string; color: string; }
interface SLabel { x: number; y: number; anchor: 'end' | 'start'; name: string; value: string; color: string; }
interface Sankey { leftNodes: SNode[]; rightNodes: SNode[]; links: SLink[]; labels: SLabel[]; }

// ── SVG layout constants (viewBox 1000 × 300) ────────────────────────────────
const VW = 1000, VH = 300;
const LBL_W  = 140;          // label zone width on each side
const NODE_W  = 14;          // narrow node block (Finary style)
const NODE_GAP = 5;          // px gap between stacked blocks
const LEFT_X  = LBL_W;      // left block x  = 140
const RIGHT_X = VW - LBL_W - NODE_W; // right block x = 846
const SRC_X   = LEFT_X + NODE_W;     // ribbon start x = 154
const TGT_X   = RIGHT_X;             // ribbon end x   = 846
const CP_X    = (SRC_X + TGT_X) / 2; // bezier ctrl x = 500

const fmt = (n: number) =>
    n >= 10000 ? `${(n / 1000).toFixed(0)}k €` :
    n >= 1000  ? `${(n / 1000).toFixed(1)}k €` : `${Math.round(n)} €`;

const trunc = (s: string, len = 12) =>
    s.length > len ? s.slice(0, len - 1) + '…' : s;

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, AppAmountComponent],
    template: `
    <div class="flex flex-col gap-6">

        <!-- Header + period nav -->
        <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0 m-0">Rapports</h1>
                <p class="text-surface-500 dark:text-surface-400 text-sm mt-0.5">Flux financiers mensuels</p>
            </div>
            <div class="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 rounded-xl px-1 py-1 border border-surface-200 dark:border-surface-800">
                <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                        (click)="prevMonth()">
                    <i class="pi pi-chevron-left text-sm text-surface-600 dark:text-surface-300"></i>
                </button>
                <span class="px-3 text-sm font-semibold text-surface-900 dark:text-surface-0 min-w-[140px] text-center">
                    {{ monthLabel() }}
                </span>
                <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                        (click)="nextMonth()" [disabled]="isCurrentMonth()" [ngClass]="isCurrentMonth() ? 'opacity-40' : ''">
                    <i class="pi pi-chevron-right text-sm text-surface-600 dark:text-surface-300"></i>
                </button>
            </div>
        </div>

        <!-- KPI cards (equal height h-[110px]) -->
        @if (loading()) {
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                @for (i of [1,2,3,4]; track i) {
                    <div class="h-[110px] bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
                }
            </div>
        } @else if (summary()) {
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <!-- Revenus -->
                <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 h-[110px] flex flex-col justify-between transition-shadow hover:shadow-sm">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Revenus</span>
                        <div class="w-8 h-8 rounded-xl bg-positive/10 dark:bg-positive/15 flex items-center justify-center">
                            <i class="pi pi-arrow-down-left text-positive text-xs"></i>
                        </div>
                    </div>
                    <div>
                        <div class="text-xl font-bold text-positive">+<app-amount [value]="summary()!.income" /></div>
                        <p class="text-xs text-surface-500 mt-0.5">{{ incomeCount() }} opération{{ incomeCount() !== 1 ? 's' : '' }}</p>
                    </div>
                </div>
                <!-- Dépenses -->
                <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 h-[110px] flex flex-col justify-between transition-shadow hover:shadow-sm">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Dépenses</span>
                        <div class="w-8 h-8 rounded-xl bg-negative/10 dark:bg-negative/15 flex items-center justify-center">
                            <i class="pi pi-arrow-up-right text-negative text-xs"></i>
                        </div>
                    </div>
                    <div>
                        <div class="text-xl font-bold text-negative">−<app-amount [value]="summary()!.expenses" /></div>
                        <p class="text-xs text-surface-500 mt-0.5">{{ summary()!.count - incomeCount() }} opération{{ (summary()!.count - incomeCount()) !== 1 ? 's' : '' }}</p>
                    </div>
                </div>
                <!-- Solde net -->
                <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 h-[110px] flex flex-col justify-between transition-shadow hover:shadow-sm">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Solde net</span>
                        <div class="w-8 h-8 rounded-xl flex items-center justify-center"
                             [ngClass]="summary()!.net >= 0 ? 'bg-brand-100 dark:bg-brand-700/20' : 'bg-negative/10 dark:bg-negative/15'">
                            <i class="pi text-xs" [ngClass]="summary()!.net >= 0 ? 'pi-trending-up text-brand-700 dark:text-ochre-400' : 'pi-trending-down text-negative'"></i>
                        </div>
                    </div>
                    <div>
                        <div class="text-xl font-bold" [ngClass]="summary()!.net >= 0 ? 'text-surface-900 dark:text-surface-0' : 'text-negative'">
                            {{ summary()!.net >= 0 ? '+' : '−' }}<app-amount [value]="summary()!.net" />
                        </div>
                        <p class="text-xs text-surface-500 mt-0.5">{{ summary()!.net >= 0 ? 'Bilan positif' : 'Bilan négatif' }}</p>
                    </div>
                </div>
                <!-- Taux d'épargne -->
                <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 h-[110px] flex flex-col justify-between transition-shadow hover:shadow-sm">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Taux d'épargne</span>
                        <div class="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center">
                            <i class="pi pi-percentage text-brand-700 dark:text-ochre-400 text-xs"></i>
                        </div>
                    </div>
                    <div>
                        <div class="text-xl font-bold text-surface-900 dark:text-surface-0">{{ savingsRate() }}%</div>
                        <div class="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full mt-2 overflow-hidden">
                            <div class="h-full bg-brand-700 dark:bg-ochre-400 rounded-full" [style.width]="savingsRate() + '%'"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── Sankey cash-flow chart ─────────────────────────────── -->
            <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-6 overflow-hidden">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-5">Flux de trésorerie</h2>

                @if (!sankey() || sankey()!.links.length === 0) {
                    <div class="flex flex-col items-center justify-center py-14 text-surface-400">
                        <i class="pi pi-chart-bar text-4xl mb-3 opacity-30"></i>
                        <p class="text-sm">Aucune donnée ce mois-ci</p>
                    </div>
                } @else {
                    <!--
                        Single SVG — viewBox 1000×300, stretches to 100% width at fixed 300px height.
                        Layout: [labels 140px][node 14px][~692px ribbons][node 14px][labels 140px]
                    -->
                    <svg width="100%" height="300"
                         viewBox="0 0 1000 300"
                         preserveAspectRatio="none"
                         style="display:block; overflow:visible">

                        <defs>
                            <!-- Per-link gradient: income color fading toward target -->
                            @for (lnk of sankey()!.links; track $index) {
                                <linearGradient [attr.id]="'g'+$index" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%"   [attr.stop-color]="lnk.color" stop-opacity="0.55"/>
                                    <stop offset="100%" [attr.stop-color]="lnk.color" stop-opacity="0.20"/>
                                </linearGradient>
                            }
                        </defs>

                        <!-- 1) Ribbons (drawn first, behind nodes) -->
                        @for (lnk of sankey()!.links; track $index) {
                            <path [attr.d]="lnk.d" [attr.fill]="'url(#g'+$index+')'" stroke="none"/>
                        }

                        <!-- 2a) Left node blocks -->
                        @for (n of sankey()!.leftNodes; track n.id) {
                            <rect [attr.x]="n.x" [attr.y]="n.y" [attr.width]="14" [attr.height]="n.h"
                                  [attr.fill]="n.color" rx="2" opacity="0.9"/>
                        }
                        <!-- 2b) Right node blocks -->
                        @for (n of sankey()!.rightNodes; track n.id) {
                            <rect [attr.x]="n.x" [attr.y]="n.y" [attr.width]="14" [attr.height]="n.h"
                                  [attr.fill]="n.color" rx="2" opacity="0.9"/>
                        }

                        <!-- 3) Labels -->
                        @for (lbl of sankey()!.labels; track lbl.name) {
                            <text [attr.x]="lbl.x" [attr.y]="lbl.y"
                                  [attr.text-anchor]="lbl.anchor"
                                  dominant-baseline="middle"
                                  font-family="system-ui, -apple-system, sans-serif"
                                  font-size="11"
                                  font-weight="600"
                                  [attr.fill]="lbl.color">
                                {{ lbl.name }}
                                <tspan [attr.x]="lbl.x" dy="14" font-size="10" font-weight="400" fill-opacity="0.65">
                                    {{ lbl.value }}
                                </tspan>
                            </text>
                        }

                    </svg>
                }
            </div>

            <!-- ── Expense breakdown ─────────────────────────────────── -->
            <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-6">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-5">Répartition des dépenses</h2>
                @if (summary()!.byCategory.length === 0) {
                    <p class="text-surface-500 text-sm text-center py-6">Aucune dépense ce mois-ci</p>
                } @else {
                    <div class="space-y-4">
                        @for (cat of summary()!.byCategory; track cat.category) {
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <div class="flex items-center gap-2">
                                        <div class="w-7 h-7 rounded-lg flex items-center justify-center"
                                             [style.background]="cat.color + '20'">
                                            <i [class]="getCatIcon(cat.category) + ' text-xs'" [style.color]="cat.color"></i>
                                        </div>
                                        <span class="text-sm text-surface-600 dark:text-surface-300">{{ cat.label }}</span>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-xs text-surface-500">{{ cat.pct }}%</span>
                                        <span class="text-sm font-semibold text-surface-900 dark:text-surface-0 min-w-[70px] text-right">
                                            <app-amount [value]="cat.amount" />
                                        </span>
                                    </div>
                                </div>
                                <div class="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                                    <div class="h-full rounded-full transition-all duration-700"
                                         [style.width]="cat.pct + '%'" [style.background]="cat.color"></div>
                                </div>
                            </div>
                        }
                    </div>
                }
            </div>
        }

    </div>
    `
})
export class ReportsPage implements OnInit {
    private svc = inject(TransactionsService);

    private _year  = signal(new Date().getFullYear());
    private _month = signal(new Date().getMonth() + 1);
    loading = signal(true);
    summary = signal<MonthlySummary | null>(null);
    private _allRecords = signal<TransactionRecord[]>([]);

    // ── Period ────────────────────────────────────────────────────
    readonly selectedYearMonth = computed(() => `${this._year()}-${String(this._month()).padStart(2,'0')}`);
    readonly monthLabel = computed(() =>
        new Date(this._year(), this._month()-1, 1)
            .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            .replace(/^\w/, c => c.toUpperCase())
    );
    readonly isCurrentMonth = computed(() => {
        const n = new Date();
        return this._year() === n.getFullYear() && this._month() === n.getMonth()+1;
    });
    readonly savingsRate = computed(() => {
        const s = this.summary();
        if (!s || s.income <= 0) return 0;
        return Math.max(0, Math.min(100, Math.round(s.net / s.income * 100)));
    });
    readonly incomeCount = computed(() => {
        const ym = this.selectedYearMonth();
        return this._allRecords().filter(r => r.date.startsWith(ym) && r.type === 'Income').length;
    });

    // ── Sankey data ───────────────────────────────────────────────
    readonly sankey = computed((): Sankey | null => {
        const s = this.summary();
        if (!s || s.income === 0) return null;

        const ym = this.selectedYearMonth();
        const recs = this._allRecords().filter(r => r.date.startsWith(ym));

        // ── Income nodes (left) ───────────────────────────────────
        const incomeByCat: Record<string, number> = {};
        for (const r of recs.filter(r => r.type === 'Income')) {
            const cat = r.category || 'other_income';
            incomeByCat[cat] = (incomeByCat[cat] || 0) + r.amount;
        }
        const totalIncome = Object.values(incomeByCat).reduce((a,b)=>a+b, 0);
        if (totalIncome === 0) return null;

        // ppu: pixels per unit of income (based on full VH, gaps ignored for scaling)
        const ppu = VH / totalIncome;

        const incEntries = Object.entries(incomeByCat).sort((a,b)=>b[1]-a[1]);
        let ly = 0;
        const incNodes: SNode[] = incEntries.map(([cat, amt]) => {
            const h = Math.max(3, amt * ppu);
            const node: SNode = {
                id: cat, label: CATEGORY_CONFIG[cat]?.label || cat, amount: amt,
                color: CATEGORY_CONFIG[cat]?.color || '#5B7FD4', x: LEFT_X, y: ly, h
            };
            ly += h + NODE_GAP;
            return node;
        });

        // ── Expense nodes (right) ─────────────────────────────────
        const expItems = [
            ...s.byCategory.map(c => ({
                id: c.category, label: c.label, amount: c.amount, color: c.color
            })),
            ...(s.net > 0 ? [{ id: '__savings__', label: 'Épargne nette', amount: s.net, color: '#6AAE82' }] : [])
        ];

        let ry = 0;
        const expNodes: SNode[] = expItems.map(exp => {
            const h = Math.max(3, exp.amount * ppu);
            const node: SNode = { ...exp, x: RIGHT_X, y: ry, h };
            ry += h + NODE_GAP;
            return node;
        });

        // ── Cross-ribbon links ────────────────────────────────────
        //
        //  For each (income_i × expense_j) pair:
        //    flow = income_i × expense_j / totalIncome
        //    Positions WITHIN income_i node: stacked by expense order  → sy0, sy1
        //    Positions WITHIN expense_j node: stacked by income order  → ty0, ty1
        //
        //  Because sy-order (expense index) ≠ ty-order (income index),
        //  ribbons connect at different Y on each side → creates the real S-curve crossing.
        //
        const srcOff: Record<string, number> = {};
        const dstOff: Record<string, number> = {};
        incNodes.forEach(n => srcOff[n.id] = 0);
        expNodes.forEach(n => dstOff[n.id] = 0);

        const links: SLink[] = [];
        for (const src of incNodes) {
            for (const dst of expNodes) {
                const flow = src.amount * dst.amount / totalIncome;
                const fh = flow * ppu;
                if (fh < 0.8) continue; // skip hairline ribbons

                const sy0 = src.y + srcOff[src.id];
                const sy1 = sy0 + fh;
                srcOff[src.id] += fh;

                const ty0 = dst.y + dstOff[dst.id];
                const ty1 = ty0 + fh;
                dstOff[dst.id] += fh;

                // Cubic bezier ribbon path
                // Top:    M sx,sy0  C CP_X,sy0  CP_X,ty0  tx,ty0
                // Bottom: L tx,ty1  C CP_X,ty1  CP_X,sy1  sx,sy1
                const d = `M${SRC_X},${sy0} C${CP_X},${sy0} ${CP_X},${ty0} ${TGT_X},${ty0}` +
                           ` L${TGT_X},${ty1} C${CP_X},${ty1} ${CP_X},${sy1} ${SRC_X},${sy1}Z`;

                links.push({ d, color: src.color });
            }
        }

        // ── Labels ────────────────────────────────────────────────
        const MIN_H_FOR_LABEL = 18;
        const labels: SLabel[] = [
            // Income labels → right-aligned, just left of left block
            ...incNodes
                .filter(n => n.h >= MIN_H_FOR_LABEL)
                .map(n => ({
                    x: LEFT_X - 8,
                    y: n.y + n.h / 2 - 6,
                    anchor: 'end' as const,
                    name: trunc(n.label),
                    value: fmt(n.amount),
                    color: n.color,
                })),
            // Expense labels → left-aligned, just right of right block
            ...expNodes
                .filter(n => n.h >= MIN_H_FOR_LABEL)
                .map(n => ({
                    x: RIGHT_X + NODE_W + 8,
                    y: n.y + n.h / 2 - 6,
                    anchor: 'start' as const,
                    name: trunc(n.label),
                    value: fmt(n.amount),
                    color: n.color,
                })),
        ];

        // All nodes together (positioning handled via the template using id prefix)
        return { leftNodes: incNodes, rightNodes: expNodes, links, labels };
    });

    // ── Navigation & lifecycle ─────────────────────────────────────
    prevMonth() {
        let m = this._month()-1, y = this._year();
        if (m < 1) { m=12; y--; }
        this._month.set(m); this._year.set(y); this.load();
    }
    nextMonth() {
        if (this.isCurrentMonth()) return;
        let m = this._month()+1, y = this._year();
        if (m > 12) { m=1; y++; }
        this._month.set(m); this._year.set(y); this.load();
    }
    ngOnInit() { this.load(); }
    private async load() {
        this.loading.set(true);
        try {
            const [recs, s] = await Promise.all([
                this.svc.getRecords(),
                this.svc.getMonthlySummary(this.selectedYearMonth())
            ]);
            this._allRecords.set(recs);
            this.summary.set(s);
        } finally { this.loading.set(false); }
    }
    getCatIcon(cat: string) { return CATEGORY_CONFIG[cat]?.icon || 'pi pi-circle'; }
}
