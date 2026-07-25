import { Injectable, computed, signal } from '@angular/core';
import { IRVM_DEFAUT_PCT, PHASES, TITRE_MAP } from './data/referentiel';

/**
 * Le plan de l'utilisateur : 100% côté client, persisté en localStorage sous
 * clé versionnée (`omaad_plan_v1`). Décision produit (plan d'intégration §V1) :
 * pas de serveur pour les anonymes ; la sauvegarde en compte Omaad est le pont
 * de conversion V2. Export/import JSON comme filet de portabilité.
 */

export interface PlanLine {
    ticker: string;
    nom: string;
    qty: number;
    /** Prix de revient unitaire (FCFA). */
    pru: number;
    /** Cours actuel saisi par l'utilisateur (FCFA) ; sinon prix de référence daté, sinon PRU. */
    prix: number | null;
    /** Yield brut % saisi par l'utilisateur ; sinon yield de référence daté. */
    yieldPct: number | null;
}

export interface PlanState {
    version: 1;
    updatedAt: string;
    phase: number;
    /** Grille de poids cibles (%), pré-remplie par le template de la phase, éditable. */
    weights: Record<string, number>;
    dcaMonthly: number;
    taxRatePct: number;
    /** Objectif de revenu passif net (FCFA/mois). */
    targetMonthlyIncome: number;
    lines: PlanLine[];
    /** Règles écrites personnelles (libres). */
    rules: string[];
}

const STORAGE_KEY = 'omaad_plan_v1';

export function defaultPlan(): PlanState {
    const phase1 = PHASES[0];
    return {
        version: 1,
        updatedAt: new Date().toISOString(),
        phase: 1,
        weights: { ...phase1.weights },
        dcaMonthly: 50_000,
        taxRatePct: IRVM_DEFAUT_PCT,
        targetMonthlyIncome: 100_000,
        lines: [],
        rules: [],
    };
}

export interface LineView extends PlanLine {
    prixEffectif: number;
    yieldEffectif: number;
    valeur: number;
    investi: number;
    allocPct: number;
    ciblePct: number;
    /** allocation - cible, en points de pourcentage. */
    ecartPp: number;
}

@Injectable({ providedIn: 'root' })
export class PlanService {
    readonly plan = signal<PlanState>(this.load());

    /** True dès que le visiteur a modifié quelque chose (≠ plan par défaut). */
    readonly hasCustomPlan = computed(() => this.plan().lines.length > 0 || this.plan().rules.length > 0);

    readonly totalValue = computed(() => this.lineViews().reduce((s, l) => s + l.valeur, 0));
    readonly totalInvested = computed(() => this.lineViews().reduce((s, l) => s + l.investi, 0));

    readonly lineViews = computed<LineView[]>(() => {
        const p = this.plan();
        const raw = p.lines.map((l) => {
            const ref = TITRE_MAP[l.ticker];
            const prixEffectif = l.prix ?? ref?.prixRef ?? l.pru;
            const yieldEffectif = l.yieldPct ?? ref?.yieldRef ?? 0;
            return { ...l, prixEffectif, yieldEffectif, valeur: l.qty * prixEffectif, investi: l.qty * l.pru };
        });
        const total = raw.reduce((s, l) => s + l.valeur, 0);
        return raw.map((l) => {
            const allocPct = total > 0 ? Math.round((l.valeur / total) * 100) : 0;
            const ciblePct = p.weights[l.ticker] ?? 0;
            return { ...l, allocPct, ciblePct, ecartPp: allocPct - ciblePct };
        });
    });

    /** Yield brut pondéré par la grille de poids cible (%). */
    readonly weightedYieldGross = computed(() => {
        const p = this.plan();
        const entries = Object.entries(p.weights);
        const totalW = entries.reduce((s, [, w]) => s + w, 0);
        if (totalW <= 0) return 0;
        const acc = entries.reduce((s, [ticker, w]) => {
            const line = p.lines.find((l) => l.ticker === ticker);
            const y = line?.yieldPct ?? TITRE_MAP[ticker]?.yieldRef ?? 0;
            return s + w * y;
        }, 0);
        return +(acc / totalW).toFixed(2);
    });

    private load(): PlanState {
        if (typeof localStorage === 'undefined') return defaultPlan();
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaultPlan();
            const parsed = JSON.parse(raw);
            if (parsed?.version !== 1) return defaultPlan();
            return { ...defaultPlan(), ...parsed };
        } catch {
            return defaultPlan();
        }
    }

    private persist(next: PlanState): void {
        this.plan.set(next);
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch { /* stockage plein ou bloqué : l'état reste en mémoire */ }
    }

    update(patch: Partial<Omit<PlanState, 'version'>>): void {
        this.persist({ ...this.plan(), ...patch, version: 1, updatedAt: new Date().toISOString() });
    }

    /** Adopte la grille de poids du template pour une phase (écrase les poids). */
    applyPhaseTemplate(phase: number): void {
        const tpl = PHASES.find((p) => p.phase === phase) ?? PHASES[0];
        this.update({ phase: tpl.phase, weights: { ...tpl.weights } });
    }

    setWeight(ticker: string, weight: number): void {
        const weights = { ...this.plan().weights };
        if (weight <= 0) delete weights[ticker];
        else weights[ticker] = Math.min(100, Math.round(weight));
        this.update({ weights });
    }

    upsertLine(line: PlanLine): void {
        const lines = [...this.plan().lines];
        const i = lines.findIndex((l) => l.ticker === line.ticker);
        if (i >= 0) lines[i] = line;
        else lines.push(line);
        this.update({ lines });
    }

    removeLine(ticker: string): void {
        this.update({ lines: this.plan().lines.filter((l) => l.ticker !== ticker) });
    }

    addRule(text: string): void {
        const t = text.trim();
        if (!t) return;
        this.update({ rules: [...this.plan().rules, t] });
    }

    removeRule(index: number): void {
        this.update({ rules: this.plan().rules.filter((_, i) => i !== index) });
    }

    reset(): void {
        this.persist(defaultPlan());
    }

    exportJson(): string {
        return JSON.stringify(this.plan(), null, 2);
    }

    /** Retourne null si OK, sinon un message d'erreur. */
    importJson(raw: string): string | null {
        try {
            const parsed = JSON.parse(raw);
            if (parsed?.version !== 1 || !Array.isArray(parsed.lines)) {
                return 'Fichier non reconnu : export de plan Omaad attendu (version 1).';
            }
            this.persist({ ...defaultPlan(), ...parsed, version: 1, updatedAt: new Date().toISOString() });
            return null;
        } catch {
            return 'JSON invalide.';
        }
    }
}
