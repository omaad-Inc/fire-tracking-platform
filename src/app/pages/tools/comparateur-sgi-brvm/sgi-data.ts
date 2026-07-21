import dataset from './data/sgi.json';

/**
 * Données du comparateur SGI, migrées TELLES QUELLES depuis l'app React
 * (comparateur-sgi-brvm). `sgi.json` est une copie byte-identique du fichier
 * source ; aucun chiffre ne doit être modifié à la main ici.
 */

export interface SgiFee {
    label: string;
    base: string;
    value: string;
    max: string | null;
}

export interface Sgi {
    id: string;
    nom: string;
    pays: string | null;
    note: number | null;
    rang_richbourse: number | null;
    tarif_status: 'complet' | 'absent';
    courtage_pct: number | null;
    tenue_gratuite: boolean | null;
    min_ouverture: string | null;
    frais_ouverture: string | null;
    decision: string | null;
    agrement: string | null;
    note_extra: string | null;
    fees: SgiFee[];
    source_pdf: string | null;
}

export interface SgiMeta {
    source: string;
    regulateur: string;
    total_sgi: number;
    avec_tarifs_detailles: number;
    avertissement: string;
    maj: string;
}

export const META: SgiMeta = dataset.meta;
export const SGIS: Sgi[] = dataset.sgis as Sgi[];

export const PDF_BASE = '/pdfs-sgi/';

export const withTarifs = SGIS.filter((s) => s.tarif_status === 'complet');

// SGI au courtage le plus bas (pour la médaille « le moins cher »)
export const cheapestCourtage: number | null = (() => {
    const vals = withTarifs.map((s) => s.courtage_pct).filter((v): v is number => v != null);
    return vals.length ? Math.min(...vals) : null;
})();

export const COUNTRIES: string[] = [...new Set(SGIS.map((s) => s.pays).filter((p): p is string => !!p))].sort();

export const getById = (id: string): Sgi | undefined => SGIS.find((s) => s.id === id);

export const fmtPct = (v: number | null | undefined): string | null =>
    v == null ? null : `${String(v).replace('.', ',')} %`;

export const findFee = (sgi: Sgi, kw: string): string | null => {
    const k = kw.toLowerCase();
    const f = (sgi.fees || []).find((x) => x.label.toLowerCase().includes(k));
    return f ? f.value : null;
};

export const isFree = (val: string | null): boolean => !!val && /gratuit|n[ée]ant/i.test(val);

// rangées clés du comparateur
export const COMPARE_ROWS: { key: string; label: string }[] = [
    { key: 'transactions ordinaires', label: 'Courtage (ordinaire)' },
    { key: 'sur dossier', label: 'Courtage (sur dossier)' },
    { key: 'garde', label: 'Droits de garde' },
    { key: 'tenue de compte', label: 'Tenue de compte' },
    { key: 'gestion sous mandat', label: 'Gestion sous mandat' },
    { key: 'transfert', label: 'Transfert de titres' },
];
