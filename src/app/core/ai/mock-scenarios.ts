import { ChatStreamEvent } from './chat-events';

/**
 * Scripted SSE replays for the MockChatDriver (S12 Phase 1, plan step 9).
 *
 * Every UI state the chat surface must handle is demoable from one of these
 * scenarios, on device, without any backend. Amounts are written the way the
 * server will emit them: pre-formatted, non-breaking spaces, display currency.
 *
 * NOTE: these strings are DEMO CONTENT (fake model output), not app chrome.
 * App chrome (labels, buttons, notices) lives in fr.ts/en.ts.
 */

export type MockScenarioId =
    | 'auto'
    | 'plain'
    | 'long'
    | 'write_undo'
    | 'bulk_confirm'
    | 'error_midstream'
    | 'quota_warning'
    | 'quota_reached'
    | 'disclaimer';

export interface MockStep {
    /** ms to wait before emitting this event. */
    delay: number;
    event: ChatStreamEvent;
}

export interface MockScript {
    steps: MockStep[];
    /** Continuation after confirm(card_id, approved=true). */
    onApprove?: MockStep[];
    /** Continuation after confirm(card_id, approved=false). */
    onCancel?: MockStep[];
}

type Lang = 'fr' | 'en';

const NBSP = ' ';

/** Split text into word-ish chunks emitted as text_delta steps. */
function deltas(text: string, cadence = 24): MockStep[] {
    const parts = text.match(/\S+\s*/g) ?? [];
    const steps: MockStep[] = [];
    let buffer = '';
    parts.forEach((word, i) => {
        buffer += word;
        // Emit every ~2 words for a natural streaming feel.
        if (i % 2 === 1 || i === parts.length - 1) {
            steps.push({ delay: cadence, event: { type: 'text_delta', text: buffer } });
            buffer = '';
        }
    });
    return steps;
}

const stop = (usage = ''): MockStep => ({ delay: 120, event: { type: 'message_stop', usage_summary: usage } });

// ─── Scenarios ───────────────────────────────────────────────────────────────

function plain(lang: Lang): MockScript {
    const text = lang === 'fr'
        ? `Ton patrimoine net est de 12${NBSP}450${NBSP}000${NBSP}FCFA aujourd'hui. Il a progressé de +2,3% sur les 30 derniers jours, porté principalement par ton portefeuille BRVM.`
        : `Your net worth stands at 12,450,000${NBSP}FCFA today. It grew +2.3% over the last 30 days, driven mainly by your BRVM portfolio.`;
    return {
        steps: [
            { delay: 350, event: { type: 'routed', agent: 'assistant' } },
            ...deltas(text),
            stop('1 240 tokens'),
        ],
    };
}

function long(lang: Lang): MockScript {
    const text = lang === 'fr'
        ? `Voici comment lire ton allocation actuelle.\n\n**Répartition par classe d'actifs :**\n- Immobilier : 62% (75${NBSP}000${NBSP}000${NBSP}FCFA)\n- Actions BRVM : 18% (21${NBSP}800${NBSP}000${NBSP}FCFA)\n- Épargne et liquidités : 12% (14${NBSP}500${NBSP}000${NBSP}FCFA)\n- Tontine : 8% (9${NBSP}700${NBSP}000${NBSP}FCFA)\n\nDeux observations importantes :\n\n**1. Concentration immobilière.** À 62%, l'immobilier domine ton patrimoine. C'est courant à Dakar, mais cela limite ta liquidité en cas d'imprévu.\n\n**2. Ton coussin de liquidités est sain.** 12% en épargne disponible couvre environ 6 mois de tes dépenses moyennes, ce qui est une bonne base avant d'investir davantage.\n\nSi tu veux, je peux comparer cette allocation à un profil FIRE type pour ton âge et tes objectifs.`
        : `Here is how to read your current allocation.\n\n**Breakdown by asset class:**\n- Real estate: 62% (75,000,000${NBSP}FCFA)\n- BRVM stocks: 18% (21,800,000${NBSP}FCFA)\n- Savings and cash: 12% (14,500,000${NBSP}FCFA)\n- Tontine: 8% (9,700,000${NBSP}FCFA)\n\nTwo important observations:\n\n**1. Real estate concentration.** At 62%, real estate dominates your wealth. That is common in Dakar, but it limits your liquidity if something unexpected happens.\n\n**2. Your cash cushion is healthy.** 12% in available savings covers about 6 months of your average spending, a good base before investing more.\n\nIf you want, I can compare this allocation to a typical FIRE profile for your age and goals.`;
    return {
        steps: [
            { delay: 350, event: { type: 'routed', agent: 'assistant' } },
            ...deltas(text, 18),
            stop('3 980 tokens'),
        ],
    };
}

function writeUndo(lang: Lang): MockScript {
    const fr = lang === 'fr';
    const intro = fr ? `Je crée ça pour toi tout de suite.` : `Creating that for you right away.`;
    const outro = fr
        ? `C'est fait. Ta maison à Dakar est maintenant dans ton patrimoine, catégorie Immobilier. Tu peux annuler cette création directement sur la carte ci-dessus si besoin.`
        : `Done. Your house in Dakar is now part of your patrimony under Real estate. You can undo this creation directly on the card above if needed.`;
    return {
        steps: [
            { delay: 350, event: { type: 'routed', agent: 'config' } },
            ...deltas(intro),
            { delay: 500, event: { type: 'tool_use', tool: 'create_asset', args_preview: fr ? 'Maison · Dakar · Immobilier' : 'House · Dakar · Real estate', card_id: 'card-1' } },
            { delay: 1400, event: { type: 'tool_result', card_id: 'card-1', status: 'ok', summary: fr ? `Maison, Dakar · 75${NBSP}000${NBSP}000${NBSP}FCFA` : `House, Dakar · 75,000,000${NBSP}FCFA`, undo_token: 'undo-mock-1' } },
            ...deltas(outro),
            stop('2 130 tokens'),
        ],
    };
}

function bulkConfirm(lang: Lang): MockScript {
    const fr = lang === 'fr';
    const intro = fr
        ? `J'ai préparé les 3 transactions de ton relevé. Vérifie le détail avant que je les enregistre :`
        : `I prepared the 3 transactions from your statement. Review the details before I save them:`;
    const approved = fr
        ? `Les 3 transactions sont enregistrées. Ton solde Wave a été mis à jour en conséquence.`
        : `All 3 transactions are saved. Your Wave balance has been updated accordingly.`;
    const cancelled = fr
        ? `D'accord, je n'ai rien enregistré. Dis-moi ce que tu veux corriger et je reprépare la liste.`
        : `Okay, nothing was saved. Tell me what you want to fix and I will prepare the list again.`;
    return {
        steps: [
            { delay: 350, event: { type: 'routed', agent: 'config' } },
            ...deltas(intro),
            { delay: 500, event: { type: 'tool_use', tool: 'bulk_import', args_preview: fr ? '3 transactions · Wave' : '3 transactions · Wave', card_id: 'card-2' } },
            { delay: 900, event: { type: 'confirm_required', card_id: 'card-2', diff: [
                { op: 'create', label: fr ? `Salaire · +850${NBSP}000${NBSP}FCFA` : `Salary · +850,000${NBSP}FCFA`, detail: fr ? 'Revenus · 28 juil.' : 'Income · Jul 28' },
                { op: 'create', label: fr ? `Loyer · -250${NBSP}000${NBSP}FCFA` : `Rent · -250,000${NBSP}FCFA`, detail: fr ? 'Logement · 29 juil.' : 'Housing · Jul 29' },
                { op: 'create', label: fr ? `Tontine · -50${NBSP}000${NBSP}FCFA` : `Tontine · -50,000${NBSP}FCFA`, detail: fr ? 'Épargne · 30 juil.' : 'Savings · Jul 30' },
            ] } },
        ],
        onApprove: [
            { delay: 1200, event: { type: 'tool_result', card_id: 'card-2', status: 'ok', summary: fr ? `3 transactions créées · solde Wave mis à jour` : `3 transactions created · Wave balance updated`, undo_token: 'undo-mock-2' } },
            ...deltas(approved),
            stop('2 840 tokens'),
        ],
        onCancel: [
            { delay: 400, event: { type: 'tool_result', card_id: 'card-2', status: 'cancelled', summary: fr ? 'Import annulé, aucune écriture' : 'Import cancelled, nothing written' } },
            ...deltas(cancelled),
            stop('1 460 tokens'),
        ],
    };
}

function errorMidstream(lang: Lang): MockScript {
    const text = lang === 'fr'
        ? `Je regarde ça. Ton portefeuille BRVM contient 4 lignes, la plus`
        : `Looking into it. Your BRVM portfolio holds 4 positions, the largest`;
    return {
        steps: [
            { delay: 350, event: { type: 'routed', agent: 'assistant' } },
            ...deltas(text),
            { delay: 700, event: { type: 'error', code: 'UPSTREAM_UNAVAILABLE', message: lang === 'fr' ? `Le service IA est momentanément indisponible.` : `The AI service is temporarily unavailable.` } },
        ],
    };
}

function quotaWarning(lang: Lang): MockScript {
    const fr = lang === 'fr';
    const text = fr
        ? `Oui. Ton taux d'épargne du mois est de 31%, au-dessus de ta moyenne des 6 derniers mois (26%).`
        : `Yes. Your savings rate this month is 31%, above your 6-month average (26%).`;
    return {
        steps: [
            { delay: 350, event: { type: 'routed', agent: 'assistant' } },
            ...deltas(text),
            { delay: 200, event: { type: 'notice', kind: 'quota_warning', message: fr ? `Il te reste 8 messages IA sur ta période en cours.` : `You have 8 AI messages left in your current period.` } },
            stop('980 tokens'),
        ],
    };
}

function quotaReached(lang: Lang): MockScript {
    return {
        steps: [
            { delay: 400, event: { type: 'error', code: 'QUOTA_REACHED', message: lang === 'fr' ? `Tu as utilisé tous tes messages IA pour cette période.` : `You have used all your AI messages for this period.` } },
        ],
    };
}

function disclaimer(lang: Lang): MockScript {
    const fr = lang === 'fr';
    const text = fr
        ? `Ta diversification est correcte mais perfectible. 62% de ton patrimoine est immobilier : envisage de renforcer progressivement tes lignes BRVM (via ta SGI) et ton épargne de précaution avant tout nouvel achat immobilier. À ton rythme d'épargne actuel, ton objectif FIRE à 45 ans reste atteignable si tu maintiens un taux d'épargne d'au moins 30%.`
        : `Your diversification is decent but improvable. 62% of your wealth is real estate: consider gradually strengthening your BRVM positions (through your SGI) and your emergency savings before any new property purchase. At your current savings pace, your FIRE goal at 45 remains reachable if you keep a savings rate of at least 30%.`;
    return {
        steps: [
            { delay: 350, event: { type: 'routed', agent: 'assistant' } },
            ...deltas(text),
            { delay: 250, event: { type: 'notice', kind: 'disclaimer_cima' } },
            stop('2 410 tokens'),
        ],
    };
}

// ─── Resolution ──────────────────────────────────────────────────────────────

const BUILDERS: Record<Exclude<MockScenarioId, 'auto'>, (lang: Lang) => MockScript> = {
    plain,
    long,
    write_undo: writeUndo,
    bulk_confirm: bulkConfirm,
    error_midstream: errorMidstream,
    quota_warning: quotaWarning,
    quota_reached: quotaReached,
    disclaimer,
};

export const MOCK_SCENARIO_IDS: MockScenarioId[] = [
    'auto', 'plain', 'long', 'write_undo', 'bulk_confirm',
    'error_midstream', 'quota_warning', 'quota_reached', 'disclaimer',
];

/** Heuristic used in 'auto' mode so free typing during a demo feels alive. */
function detect(message: string): Exclude<MockScenarioId, 'auto'> {
    const m = message.toLowerCase();
    if (/(ajoute|add |acheté|bought|salaire|salary|reçu|received)/.test(m)) return 'write_undo';
    if (/(import|relevé|statement|bulk|csv)/.test(m)) return 'bulk_confirm';
    if (/(diversifi|fire|score|conseil|advice|stratégie|strategy)/.test(m)) return 'disclaimer';
    if (/(allocation|répartition|breakdown|explique|explain)/.test(m)) return 'long';
    return 'plain';
}

export function buildScript(scenario: MockScenarioId, message: string, lang: Lang): MockScript {
    const id = scenario === 'auto' ? detect(message) : scenario;
    return BUILDERS[id](lang);
}
