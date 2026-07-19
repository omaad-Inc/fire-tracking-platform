import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { SeoService } from '../../../core/services/seo.service';
import { SgiCard } from './components/sgi-card';
import { SgiComparePanel } from './components/compare-panel';
import { SgiToolTopbar } from './components/tool-topbar';
import { LiteYoutube } from './components/lite-youtube';
import { COUNTRIES, META, SGIS, Sgi, cheapestCourtage } from './sgi-data';

const PER_PAGE = 9;

const SORTS = [
    { k: 'defaut', label: 'Pertinence' },
    { k: 'courtage', label: 'Courtage ↑' },
    { k: 'note', label: 'Mieux notées' },
    { k: 'nom', label: 'A→Z' }
] as const;
type SortKey = (typeof SORTS)[number]['k'];

const PAGE_TITLE = 'Comparateur des 41 SGI de la BRVM — frais, ouverture, garde (gratuit) | Omaad';
const PAGE_DESC =
    "Compare gratuitement les grilles tarifaires officielles des 41 SGI (courtiers) de la BRVM : frais d'ouverture, courtage, droits de garde, tenue de compte. Sans inscription.";
const CANONICAL = 'https://omaad.africa/outils/comparateur-sgi-brvm';
const OG_IMAGE = 'https://omaad.africa/og/comparateur-sgi-og-1200x630.png';

const NEWSLETTER_URL = 'https://fireafrica.beehiiv.com/subscribe?utm_source=omaad&utm_medium=outil&utm_campaign=comparateur-sgi';
const YOUTUBE_URL = 'https://www.youtube.com/@fire_africa';

const FAQ: { q: string; a: string }[] = [
    {
        q: "Qu'est-ce qu'une SGI ?",
        a: "Une SGI (Société de Gestion et d'Intermédiation) est un intermédiaire financier agréé par l'AMF-UMOA (ex-CREPMF), seul habilité à ouvrir des comptes-titres, exécuter des ordres de bourse et conserver des titres à la BRVM. Pour acheter des actions ou des obligations à la BRVM, passer par une SGI est obligatoire. Il en existe 41 dans les 8 pays de l'UEMOA."
    },
    {
        q: "Combien coûte l'ouverture d'un compte-titres à la BRVM ?",
        a: "Souvent 0 FCFA : de nombreuses SGI n'exigent aucuns frais d'ouverture, et certaines n'imposent aucun dépôt minimum. D'autres demandent un dépôt initial qui peut atteindre plusieurs centaines de milliers de FCFA. Comparez la ligne « frais d'ouverture / dépôt minimum » avant de choisir."
    },
    {
        q: 'Peut-on ouvrir un compte à distance ou depuis la diaspora ?',
        a: "Oui. Plusieurs SGI acceptent un dossier d'ouverture envoyé par email (pièce d'identité, justificatifs, formulaire signé), sans se déplacer. C'est un critère clé pour la diaspora : vérifiez-le directement auprès de la SGI avant de constituer votre dossier."
    },
    {
        q: 'Les tarifs des SGI sont-ils réglementés ?',
        a: "Les tarifs sont fixés librement par chaque SGI, puis homologués par l'AMF-UMOA, le régulateur du marché financier de l'UEMOA. Les grilles publiées sont des plafonds : ils varient fortement d'une SGI à l'autre et sont souvent négociables."
    }
];

const CRITERIA: { t: string; d: string }[] = [
    { t: "L'agrément AMF-UMOA", d: "Le filtre non négociable. Seule une SGI agréée (ex-CREPMF) peut détenir tes titres en toute sécurité. Ne passe jamais par un intermédiaire non agréé." },
    { t: 'Les frais de courtage', d: "Prélevés à chaque achat/vente. D'une SGI à l'autre, ils vont d'environ 0,65 % à 1 % — soit, pour les mêmes ordres, un écart qui peut peser lourd sur le long terme." },
    { t: "Le dépôt minimum à l'ouverture", d: "Très variable selon la SGI. Il détermine si tu peux commencer petit. Regarde aussi les éventuels frais d'ouverture de compte." },
    { t: 'Droits de garde & tenue de compte', d: 'Les frais récurrents (conservation des titres, tenue de compte) grignotent le rendement année après année. Plusieurs SGI offrent la tenue de compte gratuite.' },
    { t: "L'accès à distance / diaspora", d: "Toutes les SGI n'acceptent pas les dossiers depuis l'étranger. Vérifie l'ouverture en ligne et l'acceptation des non-résidents — un atout clé pour la diaspora." },
    { t: 'La plateforme', d: "Passage d'ordres en ligne, application mobile, suivi du portefeuille en temps réel : le confort fait que tu investis vraiment, au lieu de procrastiner." },
    { t: 'Le service client & le conseil', d: "Réactivité (WhatsApp, e-mail), qualité de l'accompagnement et des analyses. Précieux quand on débute et qu'on part de zéro." }
];

@Component({
    selector: 'app-comparateur-sgi-brvm',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterModule, InputTextModule, SgiCard, SgiComparePanel, SgiToolTopbar, LiteYoutube],
    template: `
        <div class="min-h-screen bg-surface-0 dark:bg-surface-900">
            <app-sgi-tool-topbar />

            <main class="mx-auto max-w-7xl px-5 pb-32 sm:px-6">

                <!-- ═══ HERO ═══ -->
                <header class="pb-4 pt-8 sm:pt-12">
                    <div class="mb-5 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.30em] text-ochre-600 dark:text-ochre-400">
                        <span class="h-px w-8 bg-ochre-500"></span> Omaad — Outils
                    </div>
                    <h1 class="max-w-[18ch] text-[clamp(34px,6vw,64px)] font-bold leading-[1.05] tracking-tight text-surface-900 dark:text-surface-0">
                        Comparateur des <em class="not-italic text-ochre-600 dark:text-ochre-400">41 SGI</em> de la BRVM
                    </h1>
                    <p class="mt-5 max-w-[58ch] text-[clamp(15px,2.4vw,18px)] text-surface-600 dark:text-surface-300">
                        Une SGI (Société de Gestion et d'Intermédiation) est l'intermédiaire agréé chez qui tu ouvres
                        ton compte-titres pour investir à la BRVM. Compare leurs frais officiels, côte à côte, gratuitement et sans inscription.
                    </p>
                    <div class="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-ochre-600 dark:text-ochre-400">
                        <i class="pi pi-verified text-sm" aria-hidden="true"></i> Tarifs vérifiés sur les grilles officielles homologuées
                    </div>

                    <div class="mt-8 grid grid-cols-2 overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 sm:flex">
                        <div class="border-r border-surface-200 dark:border-surface-700 px-6 py-5 sm:flex-1">
                            <div class="text-[clamp(26px,4vw,38px)] font-extrabold leading-none tabular-nums text-surface-900 dark:text-surface-0">{{ meta.total_sgi }}</div>
                            <div class="mt-2 text-[11.5px] uppercase tracking-[0.10em] text-surface-500 dark:text-surface-400">SGI référencées</div>
                        </div>
                        <div class="px-6 py-5 sm:flex-1 sm:border-r sm:border-surface-200 sm:dark:border-surface-700">
                            <div class="text-[clamp(26px,4vw,38px)] font-extrabold leading-none tabular-nums text-surface-900 dark:text-surface-0">{{ meta.avec_tarifs_detailles }}</div>
                            <div class="mt-2 text-[11.5px] uppercase tracking-[0.10em] text-surface-500 dark:text-surface-400">avec tarifs détaillés</div>
                        </div>
                        <div class="col-span-2 border-t border-surface-200 dark:border-surface-700 px-6 py-5 sm:col-span-1 sm:flex-1 sm:border-t-0">
                            <div class="text-[clamp(18px,3vw,24px)] font-extrabold leading-none text-surface-900 dark:text-surface-0">{{ meta.regulateur }}</div>
                            <div class="mt-2 text-[11.5px] uppercase tracking-[0.10em] text-surface-500 dark:text-surface-400">régulateur</div>
                        </div>
                    </div>
                </header>

                <!-- ═══ CONTROLS ═══ -->
                <div class="mt-7 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-3 shadow-card sm:p-3.5">
                    <div class="flex items-center gap-2.5">
                        <div class="relative flex flex-1 items-center">
                            <i class="pi pi-search pointer-events-none absolute left-4 text-surface-400" aria-hidden="true"></i>
                            <input type="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="Rechercher une SGI…"
                                   aria-label="Rechercher une SGI"
                                   class="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 py-3.5 pl-11 pr-4 text-[15px]
                                          text-surface-900 dark:text-surface-0 placeholder:text-surface-400 focus:border-ochre-500 focus:outline-none" />
                        </div>
                        <button type="button" (click)="filtersOpen.set(!filtersOpen())"
                                class="flex items-center gap-2 rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 px-3.5 py-3.5
                                       text-[13px] font-medium text-surface-900 dark:text-surface-0 sm:hidden">
                            <i class="pi pi-sliders-h text-sm" aria-hidden="true"></i>
                            Filtres{{ activeFilters() ? ' (' + activeFilters() + ')' : '' }}
                            <i class="pi pi-chevron-down text-xs transition-transform" [class.rotate-180]="filtersOpen()" aria-hidden="true"></i>
                        </button>
                    </div>

                    <div [class]="(filtersOpen() ? 'grid ' : 'hidden ') + 'gap-3 sm:!grid'">
                        <div class="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-0.5">
                            <button type="button" (click)="pays.set('')"
                                    [class]="chipClass(!pays())">Tous</button>
                            @for (c of countries; track c) {
                                <button type="button" (click)="pays.set(c)" [class]="chipClass(pays() === c)">{{ c }}</button>
                            }
                        </div>
                        <div class="flex flex-wrap items-center gap-2.5">
                            <div class="no-scrollbar flex max-w-full overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 p-0.5">
                                @for (s of sorts; track s.k) {
                                    <button type="button" (click)="sort.set(s.k)"
                                            class="whitespace-nowrap rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors"
                                            [class]="sort() === s.k ? 'bg-ochre-500 font-semibold text-warm-900' : 'text-surface-500 dark:text-surface-400'">
                                        {{ s.label }}
                                    </button>
                                }
                            </div>
                            <label class="inline-flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-surface-600 dark:text-surface-300">
                                <input type="checkbox" [ngModel]="onlyTarifs()" (ngModelChange)="onlyTarifs.set($event)" class="peer hidden" />
                                <span class="relative h-[23px] w-10 flex-none rounded-full bg-surface-300 dark:bg-surface-600 transition-colors
                                             after:absolute after:left-[2.5px] after:top-[2.5px] after:h-[18px] after:w-[18px] after:rounded-full
                                             after:bg-white after:transition-transform peer-checked:bg-ochre-500 peer-checked:after:translate-x-[17px]"></span>
                                Tarifs détaillés
                            </label>
                            <span class="ml-auto whitespace-nowrap text-[12.5px] text-surface-500 dark:text-surface-400">
                                {{ filtered().length }} résultat{{ filtered().length > 1 ? 's' : '' }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- ═══ GRID ═══ -->
                @if (view().length) {
                    <div #grid class="mt-6 grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
                        @for (s of view(); track s.id) {
                            <app-sgi-card [sgi]="s" [cheapest]="cheapest" />
                        }
                    </div>
                } @else {
                    <p class="py-[70px] text-center text-[15px] text-surface-500 dark:text-surface-400">Aucune SGI ne correspond à ta recherche.</p>
                }

                <!-- ═══ PAGINATION ═══ -->
                @if (pages() > 1) {
                    <nav class="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                        <button type="button" [disabled]="page() === 1" (click)="goPage(page() - 1)" aria-label="Précédent" [class]="pageBtnClass(false)">
                            <i class="pi pi-chevron-left text-sm" aria-hidden="true"></i>
                        </button>
                        <div class="hidden items-center gap-2 sm:flex">
                            @for (n of pageNumbers(); track $index) {
                                @if (n === '…') {
                                    <span class="px-1 text-surface-400">…</span>
                                } @else {
                                    <button type="button" (click)="goPage(+n)" [class]="pageBtnClass(+n === page())">{{ n }}</button>
                                }
                            }
                        </div>
                        <span class="px-2 text-sm text-surface-500 dark:text-surface-400 sm:hidden">Page {{ page() }} / {{ pages() }}</span>
                        <button type="button" [disabled]="page() === pages()" (click)="goPage(page() + 1)" aria-label="Suivant" [class]="pageBtnClass(false)">
                            <i class="pi pi-chevron-right text-sm" aria-hidden="true"></i>
                        </button>
                    </nav>
                }

                <!-- ═══ GUIDE : COMMENT CHOISIR ═══ -->
                <section class="mx-auto mt-20 max-w-[820px]">
                    <h2 class="text-[clamp(24px,4vw,34px)] font-bold leading-tight text-surface-900 dark:text-surface-0">
                        Comment choisir sa SGI à la BRVM&nbsp;?
                    </h2>
                    <div class="mt-5 space-y-4 text-[15.5px] leading-relaxed text-surface-600 dark:text-surface-300">
                        <p>
                            Pour investir à la BRVM — la Bourse Régionale des Valeurs Mobilières, commune aux 8 pays de
                            l'UEMOA —, impossible de passer un ordre directement : il faut obligatoirement ouvrir un
                            compte-titres auprès d'une <strong class="text-surface-900 dark:text-surface-0">SGI (Société de Gestion et
                            d'Intermédiation)</strong> agréée par l'AMF-UMOA, le régulateur du marché financier régional.
                        </p>
                        <p>
                            Il en existe <strong class="text-surface-900 dark:text-surface-0">41</strong>, réparties entre Abidjan, Dakar,
                            Cotonou, Lomé, Ouagadougou, Bamako, Niamey et Bissau. Leurs tarifs sont homologués par le
                            régulateur, mais ils varient fortement d'une SGI à l'autre : à ordres identiques, les frais
                            payés peuvent aller du simple au quintuple. Choisir sa SGI, c'est donc d'abord comparer les
                            frais qui pèsent sur le rendement, puis les critères pratiques : dépôt minimum, ouverture à
                            distance, plateforme, service client. Ce comparateur gratuit met les grilles officielles des
                            41 SGI côte à côte, pour décider en connaissance de cause.
                        </p>
                    </div>

                    <h2 class="mt-14 text-[clamp(22px,3.5vw,30px)] font-bold leading-tight text-surface-900 dark:text-surface-0">
                        Les 4 lignes à comparer
                    </h2>
                    <ol class="mt-5 space-y-4">
                        @for (line of fourLines; track $index) {
                            <li class="flex gap-4 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-5">
                                <span class="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-700 text-sm font-bold text-white">{{ $index + 1 }}</span>
                                <div>
                                    <h3 class="font-semibold text-surface-900 dark:text-surface-0">{{ line.t }}</h3>
                                    <p class="mt-1 text-[14.5px] leading-relaxed text-surface-600 dark:text-surface-300">{{ line.d }}</p>
                                </div>
                            </li>
                        }
                    </ol>
                    <p class="mt-5 rounded-2xl border-l-[3px] border-ochre-500 bg-ochre-50 dark:bg-ochre-700/10 px-5 py-4 text-[14.5px] leading-relaxed text-surface-700 dark:text-surface-200">
                        <strong>Deux questions bonus</strong> à poser avant de signer : l'ouverture à distance est-elle
                        possible&nbsp;? Et combien coûte la clôture du compte, ou son transfert vers une autre SGI&nbsp;?
                    </p>

                    <h2 class="mt-14 text-[clamp(22px,3.5vw,30px)] font-bold leading-tight text-surface-900 dark:text-surface-0">
                        Les 7 critères qui font vraiment la différence
                    </h2>
                    <div class="mt-5 space-y-3">
                        @for (c of criteria; track $index) {
                            <div class="flex gap-4 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-800 p-5">
                                <span class="text-lg font-bold text-ochre-600 dark:text-ochre-400">{{ ($index + 1).toString().padStart(2, '0') }}</span>
                                <div>
                                    <h3 class="font-semibold text-surface-900 dark:text-surface-0">{{ c.t }}</h3>
                                    <p class="mt-1 text-[14.5px] leading-relaxed text-surface-600 dark:text-surface-300">{{ c.d }}</p>
                                </div>
                            </div>
                        }
                    </div>
                </section>

                <!-- ═══ VIDÉOS ═══ -->
                <section class="mx-auto mt-20 max-w-[820px]">
                    <h2 class="text-[clamp(22px,3.5vw,30px)] font-bold leading-tight text-surface-900 dark:text-surface-0">
                        En vidéo : choisir sa SGI et ouvrir son compte
                    </h2>
                    <div class="mt-6 grid gap-6 sm:grid-cols-2">
                        <app-lite-youtube videoId="bf3g-dXMOys" videoTitle="Comment choisir sa SGI à la BRVM" />
                        <app-lite-youtube videoId="bLUip8sHSUE" videoTitle="Ouvrir son compte-titres à la BRVM (retour d'expérience)" />
                    </div>
                    <p class="mt-4 text-[14px] text-surface-600 dark:text-surface-300">
                        Plus de vidéos sur l'investissement à la BRVM sur
                        <a [href]="youtubeUrl" target="_blank" rel="noopener" class="font-semibold text-ochre-600 underline dark:text-ochre-400">la chaîne YouTube FIRE Africa</a>.
                    </p>
                </section>

                <!-- ═══ MÉTHODOLOGIE ═══ -->
                <section class="mx-auto mt-20 max-w-[820px]">
                    <h2 class="text-[clamp(22px,3.5vw,30px)] font-bold leading-tight text-surface-900 dark:text-surface-0">
                        D'où viennent ces données&nbsp;?
                    </h2>
                    <div class="mt-5 space-y-4 text-[15px] leading-relaxed text-surface-600 dark:text-surface-300">
                        <p>
                            Les tarifs affichés proviennent des <strong class="text-surface-900 dark:text-surface-0">grilles tarifaires
                            officielles des SGI, homologuées par l'AMF-UMOA</strong> (ex-CREPMF), collectées et recoupées
                            manuellement : chaque grille a été lue et saisie à la main depuis le PDF officiel — y compris
                            des documents scannés. Aucun chiffre n'est estimé ni extrapolé, et chaque tarif renvoie à son
                            PDF source, consultable depuis la fiche de la SGI. La liste des SGI (nom, pays, note) provient
                            du répertoire public de richbourse.com.
                        </p>
                        <p class="rounded-2xl border-2 border-ochre-500/60 bg-ochre-50 dark:bg-ochre-700/10 px-5 py-4 font-semibold text-surface-900 dark:text-surface-0">
                            🤝 Aucun partenariat avec aucune SGI : ce comparateur est 100&nbsp;% indépendant. Aucune SGI ne
                            paie pour y figurer ni pour y être mieux classée.
                        </p>
                        <ul class="ml-5 list-disc space-y-1.5 text-[14.5px]">
                            <li><strong class="text-surface-900 dark:text-surface-0">{{ meta.avec_tarifs_detailles }} SGI sur {{ meta.total_sgi }}</strong> disposent à ce jour d'une grille détaillée ici ; les autres n'affichent que les infos de base.</li>
                            <li>Un PDF fourni sous le nom «&nbsp;Africaine de Bourse&nbsp;» contenait en réalité la grille d'<strong class="text-surface-900 dark:text-surface-0">Attijari Securities West Africa</strong> → tarif attribué à Attijari.</li>
                            <li>Le document <strong class="text-surface-900 dark:text-surface-0">Hudson &amp; Cie</strong> ne contenait pas sa grille → tarif marqué indisponible.</li>
                            <li>Les tarifs sont des <strong class="text-surface-900 dark:text-surface-0">plafonds homologués</strong> : certains sont négociables et peuvent évoluer.</li>
                        </ul>
                    </div>
                </section>

                <!-- ═══ FAQ ═══ -->
                <section class="mx-auto mt-20 max-w-[820px]">
                    <h2 class="text-[clamp(22px,3.5vw,30px)] font-bold leading-tight text-surface-900 dark:text-surface-0">
                        Questions fréquentes
                    </h2>
                    <div class="mt-6 space-y-3">
                        @for (item of faq; track $index) {
                            <details class="group rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-5">
                                <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-surface-900 dark:text-surface-0">
                                    <h3 class="text-[15.5px] font-semibold">{{ item.q }}</h3>
                                    <i class="pi pi-chevron-down text-xs text-surface-400 transition-transform group-open:rotate-180" aria-hidden="true"></i>
                                </summary>
                                <p class="mt-3 text-[14.5px] leading-relaxed text-surface-600 dark:text-surface-300">{{ item.a }}</p>
                            </details>
                        }
                    </div>
                </section>

                <!-- ═══ NEWSLETTER CTA ═══ -->
                <section class="mx-auto mt-20 max-w-[820px] rounded-3xl bg-brand-700 p-7 sm:p-9">
                    <h2 class="text-2xl font-bold text-white">Aller plus loin</h2>
                    <p class="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-surface-200">
                        Le pas-à-pas détaillé (quel intermédiaire selon ton profil, comment ouvrir ton compte, comparatif
                        complet) vit dans la newsletter FIRE Africa.
                    </p>
                    <div class="mt-5 flex flex-wrap gap-3">
                        <a [href]="newsletterUrl" target="_blank" rel="noopener"
                           class="inline-flex items-center gap-2 rounded-xl bg-ochre-500 px-5 py-3 text-sm font-semibold text-warm-900 transition-colors hover:bg-ochre-400">
                            S'abonner à la newsletter <span aria-hidden="true">→</span>
                        </a>
                        <a [href]="youtubeUrl" target="_blank" rel="noopener"
                           class="inline-flex items-center gap-2 rounded-xl border border-surface-400/40 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                            <i class="pi pi-youtube" aria-hidden="true"></i> La chaîne FIRE Africa
                        </a>
                    </div>
                </section>

                <!-- ═══ FOOTER NOTE ═══ -->
                <footer class="mx-auto mt-16 max-w-[820px] border-t border-surface-200 dark:border-surface-700 py-9 text-[13px] text-surface-500 dark:text-surface-400">
                    <p class="max-w-[75ch]">{{ meta.avertissement }}</p>
                    <p class="mt-2 text-[12px]">Source : {{ meta.source }} · Mise à jour {{ meta.maj }}.</p>
                    <p class="mt-3.5 text-[15px] italic text-ochre-600 dark:text-ochre-400">Devenez le roi de votre patrimoine. — FIRE Africa × Omaad</p>
                </footer>
            </main>

            <app-sgi-compare-panel />
        </div>
    `
})
export class ComparateurSgiBrvmPage implements OnDestroy {
    private seo = inject(SeoService);
    private gridRef = viewChild<ElementRef<HTMLElement>>('grid');

    meta = META;
    countries = COUNTRIES;
    sorts = SORTS;
    cheapest = cheapestCourtage;
    faq = FAQ;
    criteria = CRITERIA;
    newsletterUrl = NEWSLETTER_URL;
    youtubeUrl = YOUTUBE_URL;

    fourLines = [
        { t: "Frais d'ouverture et dépôt minimum", d: "Souvent 0 F, parfois plusieurs centaines de milliers de FCFA selon la SGI. C'est le ticket d'entrée : il détermine si tu peux commencer petit." },
        { t: 'Courtage par ordre', d: "De 0,2 % à 1 % selon la SGI, auxquels s'ajoute 0,3 % de commission de bourse fixe, identique partout. Prélevé à chaque achat et à chaque vente." },
        { t: 'Droits de garde', d: 'De 0,05 % à 0,5 % par an selon la SGI : la conservation de tes titres, facturée chaque année sur la valeur du portefeuille.' },
        { t: 'Tenue de compte', d: "De 0 à 25 000 F par an. Plusieurs SGI l'offrent — sur le long terme, la différence se voit." }
    ];

    // ── état de l'outil (mêmes règles que l'app React d'origine) ──
    q = signal('');
    pays = signal('');
    sort = signal<SortKey>('defaut');
    onlyTarifs = signal(false);
    filtersOpen = signal(false);
    page = signal(1);

    activeFilters = computed(() => (this.pays() ? 1 : 0) + (this.onlyTarifs() ? 1 : 0) + (this.sort() !== 'defaut' ? 1 : 0));

    filtered = computed<Sgi[]>(() => {
        const q = this.q().toLowerCase();
        let r = SGIS.filter(
            (s) =>
                (!q || s.nom.toLowerCase().includes(q)) &&
                (!this.pays() || s.pays === this.pays()) &&
                (!this.onlyTarifs() || s.tarif_status === 'complet')
        );
        const col = new Intl.Collator('fr');
        const sort = this.sort();
        if (sort === 'nom') r = [...r].sort((a, b) => col.compare(a.nom, b.nom));
        else if (sort === 'note') r = [...r].sort((a, b) => (b.note || 0) - (a.note || 0));
        else if (sort === 'courtage') r = [...r].sort((a, b) => (a.courtage_pct ?? 99) - (b.courtage_pct ?? 99));
        return r;
    });

    pages = computed(() => Math.ceil(this.filtered().length / PER_PAGE));
    view = computed(() => this.filtered().slice((this.page() - 1) * PER_PAGE, this.page() * PER_PAGE));

    pageNumbers = computed<(number | '…')[]>(() => {
        const nums: (number | '…')[] = [];
        const win = 1;
        for (let i = 1; i <= this.pages(); i++) {
            if (i === 1 || i === this.pages() || (i >= this.page() - win && i <= this.page() + win)) nums.push(i);
            else if (nums[nums.length - 1] !== '…') nums.push('…');
        }
        return nums;
    });

    constructor() {
        this.seo.apply({ title: PAGE_TITLE, description: PAGE_DESC, canonical: CANONICAL, image: OG_IMAGE });
        this.seo.setJsonLd('jsonld-faq-sgi', {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a }
            }))
        });

        // retour page 1 quand un filtre change
        effect(() => {
            this.q(); this.pays(); this.sort(); this.onlyTarifs();
            this.page.set(1);
        });
    }

    ngOnDestroy(): void {
        this.seo.removeJsonLd('jsonld-faq-sgi');
    }

    goPage(n: number): void {
        this.page.set(n);
        // changement de page = clic utilisateur uniquement (jamais de scroll au montage)
        requestAnimationFrame(() => this.gridRef()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }

    chipClass(active: boolean): string {
        return (
            'whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ' +
            (active
                ? 'border-ochre-500 bg-ochre-500 font-semibold text-warm-900'
                : 'border-surface-200 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-surface-600 dark:text-surface-300 hover:border-ochre-400')
        );
    }

    pageBtnClass(current: boolean): string {
        return (
            'flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors disabled:opacity-30 ' +
            (current
                ? 'bg-ochre-500 text-warm-900 font-semibold'
                : 'border border-surface-200 dark:border-surface-600 bg-surface-0 dark:bg-surface-800 text-surface-700 dark:text-surface-200 enabled:hover:border-ochre-400')
        );
    }
}
