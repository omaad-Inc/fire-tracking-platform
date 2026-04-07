import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';

interface ContactForm {
    fullName: string;
    email: string;
    company: string;
    sector: string;
    needType: string;
    description: string;
    source: string;
}

@Component({
    selector: 'app-advisory',
    standalone: true,
    imports: [
        CommonModule, RouterModule, FormsModule, ButtonModule, RippleModule,
        InputTextModule, TextareaModule, SelectModule, TopbarWidget, FooterWidget
    ],
    template: `
        <div class="min-h-screen">

            <!-- Fixed topbar -->
            <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-surface-200/50 dark:border-white/10">
                <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
            </div>
            <div class="h-20"></div>

            <!-- ══════════════════════════════════════════
                 BLOC 1 — HERO (dark navy)
            ══════════════════════════════════════════ -->
            <section class="relative overflow-hidden bg-slate-950 py-28 px-6 lg:px-20">
                <!-- Background glow -->
                <div class="absolute inset-0 pointer-events-none overflow-hidden">
                    <div class="absolute -top-32 left-1/3 w-[600px] h-[600px] rounded-full opacity-20"
                         style="background: radial-gradient(circle, #6366f1 0%, transparent 70%)"></div>
                    <div class="absolute top-1/2 right-0 w-96 h-96 rounded-full opacity-10"
                         style="background: radial-gradient(circle, #06b6d4 0%, transparent 70%)"></div>
                </div>

                <div class="relative max-w-5xl mx-auto text-center">
                    <!-- Overline -->
                    <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-6">
                        Cabinet de conseil Data & IA
                    </p>

                    <h1 class="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                        Partenaire de votre<br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                            transformation Data & IA
                        </span>
                    </h1>

                    <p class="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        De la stratégie à la mise en œuvre, nous concevons des plateformes data modernes
                        et des solutions IA pour accélérer l'innovation en Afrique de l'Ouest.
                    </p>

                    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                        <button pButton pRipple label="DISCUTER D'UN PROJET"
                                (click)="scrollTo('contact')"
                                class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-semibold
                                       !tracking-wide !px-8 !py-3 !rounded-lg
                                       hover:!shadow-xl hover:!shadow-indigo-500/30 transition-all duration-300">
                        </button>
                        <button pButton pRipple label="NOS OFFRES"
                                (click)="scrollTo('offres')"
                                class="!bg-white/10 !border !border-white/20 !text-white !font-semibold
                                       !tracking-wide !px-8 !py-3 !rounded-lg
                                       hover:!bg-white/20 transition-all duration-300">
                        </button>
                    </div>

                    <!-- Tech tags row — Modeo style -->
                    <div class="flex flex-wrap items-center justify-center gap-3">
                        @for (tag of heroTags; track tag) {
                            <span class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10
                                         text-slate-300 text-sm font-medium tracking-wide">
                                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                {{ tag }}
                            </span>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════════════════════════════════════
                 BLOC 2 — CE QUI NOUS DISTINGUE (white)
                 Modeo-style: 5 interactive tabs
            ══════════════════════════════════════════ -->
            <section class="bg-white dark:bg-slate-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <!-- Section header -->
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">
                            CE QUI NOUS DISTINGUE
                        </p>
                        <h2 class="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight max-w-2xl">
                            Pourquoi les entreprises africaines travaillent avec nous
                        </h2>
                    </div>

                    <!-- Tab navigation -->
                    <div class="flex flex-wrap gap-2 mb-10 border-b border-slate-200 dark:border-slate-700 pb-0">
                        @for (diff of differentiators; track diff.id; let i = $index) {
                            <button (click)="activeTab.set(i)"
                                    class="px-5 py-3 text-sm font-semibold tracking-wide rounded-t-lg transition-all duration-200 border-b-2 -mb-px"
                                    [class]="activeTab() === i
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300'">
                                {{ diff.tab }}
                            </button>
                        }
                    </div>

                    <!-- Tab content -->
                    @for (diff of differentiators; track diff.id; let i = $index) {
                        @if (activeTab() === i) {
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                                <div>
                                    <h3 class="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-5">
                                        {{ diff.title }}
                                    </h3>
                                    <p class="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mb-8">
                                        {{ diff.desc }}
                                    </p>
                                    <button pButton pRipple label="DISCUTER D'UN PROJET"
                                            (click)="scrollTo('contact')"
                                            class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-semibold
                                                   !tracking-wide !px-8 !py-3 !rounded-lg
                                                   hover:!shadow-lg hover:!shadow-indigo-500/30 transition-all duration-300">
                                    </button>
                                </div>
                                <!-- Visual card -->
                                <div class="relative rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 p-10 flex items-center justify-center min-h-[280px]">
                                    <div class="text-center">
                                        <div class="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                                             [style.background]="diff.iconBg">
                                            <i [class]="diff.icon + ' text-white text-3xl'"></i>
                                        </div>
                                        <div class="flex flex-wrap gap-2 justify-center">
                                            @for (kw of diff.keywords; track kw) {
                                                <span class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200
                                                             text-sm font-semibold tracking-wide shadow-sm">
                                                    {{ kw }}
                                                </span>
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }
                    }
                </div>
            </section>

            <!-- ══════════════════════════════════════════
                 BLOC 3 — NOS OFFRES (light grey)
            ══════════════════════════════════════════ -->
            <section id="offres" class="bg-slate-100 dark:bg-slate-800/50 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">
                            CONSTRUIRE VOS FONDATIONS DATA
                        </p>
                        <h2 class="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight max-w-2xl">
                            Ce que nous faisons
                        </h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-4 text-lg max-w-xl">
                            Des missions calibrées selon vos besoins. Chaque engagement commence par un appel de cadrage gratuit.
                        </p>
                    </div>

                    <div class="space-y-6">
                        @for (offer of offers; track offer.title) {
                            <div class="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col lg:flex-row"
                                 [class.ring-2]="offer.featured"
                                 [class.ring-indigo-500]="offer.featured">

                                <!-- Left — colored illustration area -->
                                <div class="lg:w-80 flex-shrink-0 flex flex-col items-center justify-center p-10 min-h-[200px]"
                                     [style.background]="offer.illustrationBg">
                                    <div class="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                                        <i [class]="offer.icon + ' text-white text-2xl'"></i>
                                    </div>
                                    @if (offer.featured) {
                                        <span class="px-4 py-1.5 rounded-lg bg-white/20 text-white text-xs font-bold tracking-widest uppercase">
                                            Le plus demandé
                                        </span>
                                    }
                                </div>

                                <!-- Right — white content area -->
                                <div class="flex-1 p-8 lg:p-10 flex flex-col justify-between">
                                    <div>
                                        <span class="text-xs font-bold tracking-[0.2em] uppercase text-indigo-500 mb-3 block">
                                            {{ offer.eyebrow }}
                                        </span>
                                        <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">{{ offer.title }}</h3>
                                        <p class="text-slate-500 dark:text-slate-400 text-sm mb-1 font-medium">{{ offer.duration }}</p>
                                        <p class="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">{{ offer.desc }}</p>

                                        <!-- Tags -->
                                        <div class="flex flex-wrap gap-2 mb-8">
                                            @for (tag of offer.tags; track tag) {
                                                <span class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800
                                                             text-slate-700 dark:text-slate-300 text-xs font-semibold tracking-wide">
                                                    {{ tag }}
                                                </span>
                                            }
                                        </div>
                                    </div>

                                    <button pButton pRipple [label]="offer.cta"
                                            [routerLink]="[currentLang, 'advisory', offer.route]"
                                            class="self-start !bg-transparent !border !border-slate-300 dark:!border-slate-600
                                                   !text-slate-700 dark:!text-slate-200 !font-semibold !tracking-wide
                                                   !rounded-lg hover:!border-indigo-500 hover:!text-indigo-600
                                                   dark:hover:!text-indigo-400 transition-all duration-200">
                                    </button>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════════════════════════════════════
                 BLOC 4 — MID-PAGE CTA PUSH (dark navy)
            ══════════════════════════════════════════ -->
            <section class="bg-slate-950 py-20 px-6 lg:px-20">
                <div class="max-w-4xl mx-auto text-center">
                    <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4">
                        UN PROJET EN TÊTE ?
                    </p>
                    <h2 class="text-3xl md:text-4xl font-bold text-white mb-6">
                        Vous avez un projet data en tête ?<br>Parlons-en !
                    </h2>
                    <button pButton pRipple label="PRENDRE CONTACT AVEC UN EXPERT DATA"
                            (click)="scrollTo('contact')"
                            class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-bold
                                   !tracking-wide !px-10 !py-4 !rounded-lg !text-base
                                   hover:!shadow-xl hover:!shadow-indigo-500/30 transition-all duration-300">
                    </button>
                </div>
            </section>

            <!-- ══════════════════════════════════════════
                 BLOC 5 — NOS ENJEUX / SECTEURS CLIENTS (light grey)
                 Modeo-style split cards with tags
            ══════════════════════════════════════════ -->
            <section class="bg-slate-100 dark:bg-slate-800/50 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">
                            CHAQUE MARCHÉ A SES RÉALITÉS
                        </p>
                        <h2 class="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight max-w-2xl">
                            Nos secteurs cibles
                        </h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-4 text-lg max-w-xl">
                            Nous connaissons les acteurs, les contraintes et les enjeux data de chaque secteur en Afrique de l'Ouest.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        @for (sector of sectors; track sector.title) {
                            <div class="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
                                <!-- Top — colored icon area -->
                                <div class="flex items-center justify-center py-10 min-h-[140px]"
                                     [style.background]="sector.illustrationBg">
                                    <div class="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                                        <i [class]="sector.icon + ' text-white text-2xl'"></i>
                                    </div>
                                </div>

                                <!-- Bottom — content area -->
                                <div class="flex-1 p-6 flex flex-col">
                                    <h4 class="text-base font-bold text-slate-900 dark:text-white mb-1">{{ sector.title }}</h4>
                                    <p class="text-slate-400 text-xs mb-4 leading-relaxed">{{ sector.examples }}</p>
                                    <!-- Need tags -->
                                    <div class="flex flex-wrap gap-2 mt-auto">
                                        @for (need of sector.needs; track need) {
                                            <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800
                                                         text-slate-700 dark:text-slate-300 text-xs font-semibold tracking-wide">
                                                {{ need }}
                                            </span>
                                        }
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════════════════════════════════════
                 BLOC 6 — EXPERTISE TECHNIQUE (dark navy)
            ══════════════════════════════════════════ -->
            <section class="bg-slate-950 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4">
                            MODERN DATA STACK
                        </p>
                        <h2 class="text-4xl md:text-5xl font-bold text-white leading-tight max-w-2xl">
                            Notre expertise technique
                        </h2>
                    </div>

                    <div class="space-y-8">
                        @for (group of expertiseGroups; track group.label) {
                            <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <span class="text-xs font-bold tracking-[0.15em] uppercase text-slate-500 w-44 shrink-0">
                                    {{ group.label }}
                                </span>
                                <div class="flex flex-wrap gap-2">
                                    @for (tech of group.techs; track tech) {
                                        <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 border border-white/10
                                                     text-slate-300 text-sm font-medium">
                                            <span class="w-1.5 h-1.5 rounded-full shrink-0" [class]="group.dotClass"></span>
                                            {{ tech }}
                                        </span>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════════════════════════════════════
                 BLOC 7 — PROCESSUS (white)
            ══════════════════════════════════════════ -->
            <section class="bg-white dark:bg-slate-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="text-center mb-16">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">
                            SIMPLE ET TRANSPARENT
                        </p>
                        <h2 class="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                            Comment ça marche
                        </h2>
                        <p class="text-slate-500 dark:text-slate-400 text-lg">
                            De la prise de contact au démarrage de mission en 4 étapes.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        @for (step of steps; track step.num) {
                            <div class="relative rounded-3xl bg-slate-100 dark:bg-slate-800 p-8">
                                <!-- Step number badge -->
                                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6 font-bold text-xl text-white"
                                     style="background: linear-gradient(135deg, #6366f1, #06b6d4)">
                                    {{ step.num }}
                                </div>
                                <h4 class="font-bold text-slate-900 dark:text-white mb-3 text-lg">{{ step.title }}</h4>
                                <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{{ step.desc }}</p>

                                <!-- Connector arrow (desktop only) -->
                                @if (step.num !== '4') {
                                    <div class="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                                        <div class="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                                            <i class="pi pi-arrow-right text-white text-xs"></i>
                                        </div>
                                    </div>
                                }
                            </div>
                        }
                    </div>

                    <div class="text-center mt-14">
                        <button pButton pRipple label="PRENDRE CONTACT"
                                (click)="scrollTo('contact')"
                                class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-bold
                                       !tracking-wide !px-10 !py-4 !rounded-lg !text-base
                                       hover:!shadow-xl hover:!shadow-indigo-500/30 transition-all duration-300">
                        </button>
                    </div>
                </div>
            </section>

            <!-- ══════════════════════════════════════════
                 BLOC 8 — FORMULAIRE CONTACT (dark navy)
            ══════════════════════════════════════════ -->
            <section id="contact" class="bg-slate-950 py-24 px-6 lg:px-20">
                <div class="max-w-3xl mx-auto">
                    <div class="text-center mb-12">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4">
                            DÉMARRONS ENSEMBLE
                        </p>
                        <h2 class="text-4xl md:text-5xl font-bold text-white mb-4">
                            Discutons de votre projet
                        </h2>
                        <p class="text-slate-400 text-lg">
                            Décrivez votre besoin — nous vous revenons sous 24h pour un appel de cadrage gratuit.
                        </p>
                    </div>

                    @if (submitted()) {
                        <div class="flex flex-col items-center justify-center py-20 text-center rounded-3xl
                                    bg-white/5 border border-white/10">
                            <div class="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                                <i class="pi pi-check text-3xl text-emerald-400"></i>
                            </div>
                            <h3 class="text-2xl font-bold text-white mb-3">Message envoyé !</h3>
                            <p class="text-slate-400 max-w-sm text-lg">
                                Merci pour votre intérêt. Un expert vous contactera dans les 24 heures.
                            </p>
                        </div>
                    } @else {
                        <form #contactForm="ngForm" (ngSubmit)="onSubmit(contactForm)"
                              class="rounded-3xl p-8 md:p-10 bg-white/5 border border-white/10 space-y-6">

                            <!-- Nom + Email -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                        Prénom & Nom <span class="text-rose-400">*</span>
                                    </label>
                                    <input pInputText name="fullName" [(ngModel)]="form.fullName" required
                                           placeholder="Amadou Diallo"
                                           class="w-full !bg-white/5 !border-white/20 !text-white placeholder:!text-slate-500" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                        Email professionnel <span class="text-rose-400">*</span>
                                    </label>
                                    <input pInputText name="email" [(ngModel)]="form.email" required type="email"
                                           placeholder="vous@entreprise.com"
                                           class="w-full !bg-white/5 !border-white/20 !text-white placeholder:!text-slate-500" />
                                </div>
                            </div>

                            <!-- Entreprise -->
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                    Entreprise / Organisation <span class="text-rose-400">*</span>
                                </label>
                                <input pInputText name="company" [(ngModel)]="form.company" required
                                       placeholder="Nom de votre organisation"
                                       class="w-full !bg-white/5 !border-white/20 !text-white placeholder:!text-slate-500" />
                            </div>

                            <!-- Secteur + Type besoin -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                        Secteur d'activité <span class="text-rose-400">*</span>
                                    </label>
                                    <p-select name="sector" [(ngModel)]="form.sector" required
                                              [options]="sectorOptions" optionLabel="label" optionValue="value"
                                              placeholder="Sélectionner…" styleClass="w-full" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                        Type de besoin <span class="text-rose-400">*</span>
                                    </label>
                                    <p-select name="needType" [(ngModel)]="form.needType" required
                                              [options]="needOptions" optionLabel="label" optionValue="value"
                                              placeholder="Sélectionner…" styleClass="w-full" />
                                </div>
                            </div>

                            <!-- Description -->
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                    Description du projet
                                </label>
                                <textarea pTextarea name="description" [(ngModel)]="form.description"
                                          rows="4" class="w-full resize-none !bg-white/5 !border-white/20 !text-white placeholder:!text-slate-500"
                                          placeholder="Décrivez brièvement votre enjeu ou besoin data…"></textarea>
                            </div>

                            <!-- Source -->
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                    Comment nous avez-vous connus ?
                                </label>
                                <p-select name="source" [(ngModel)]="form.source"
                                          [options]="sourceOptions" optionLabel="label" optionValue="value"
                                          placeholder="Sélectionner…" styleClass="w-full" />
                            </div>

                            <!-- Social proof note -->
                            <div class="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                <i class="pi pi-info-circle text-indigo-400 mt-0.5 shrink-0"></i>
                                <p class="text-sm text-slate-400">
                                    Nous démarrons. Soyez parmi nos premières références et bénéficiez
                                    d'un accompagnement personnalisé et d'un tarif de lancement.
                                </p>
                            </div>

                            <button pButton pRipple type="submit"
                                    label="ENVOYER MA DEMANDE"
                                    icon="pi pi-send"
                                    [loading]="submitting()"
                                    [disabled]="contactForm.invalid || submitting()"
                                    class="w-full !bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-bold
                                           !tracking-wide !py-4 !rounded-lg !text-base
                                           hover:!shadow-xl hover:!shadow-indigo-500/30 transition-all duration-300
                                           disabled:!opacity-50 disabled:!cursor-not-allowed">
                            </button>
                        </form>
                    }
                </div>
            </section>

            <footer-widget />
        </div>
    `
})
export class AdvisoryPage {
    private router = inject(Router);
    currentLang = '/fr';

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
    }

    form: ContactForm = { fullName: '', email: '', company: '', sector: '', needType: '', description: '', source: '' };
    submitted = signal(false);
    submitting = signal(false);
    activeTab = signal(0);

    heroTags = ['DATA ENGINEERING', 'ANALYTICS', 'BI', 'DATAOPS', 'IA & GENAI', 'GOUVERNANCE'];

    differentiators = [
        {
            id: 0,
            tab: 'EXPERTISE DATA',
            title: 'Expertise en Data Engineering',
            desc: 'Conçue par des praticiens pour des praticiens, notre approche repose sur une maîtrise approfondie des architectures data modernes. Nous concevons des plateformes fiables, performantes et durables, adaptées aux contraintes réelles des entreprises africaines.',
            icon: 'pi pi-server',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            keywords: ['Snowflake', 'dbt', 'Airflow', 'Kafka', 'Spark']
        },
        {
            id: 1,
            tab: 'CONNAISSANCE LOCALE',
            title: 'Connaissance du marché africain',
            desc: 'Nous connaissons les infrastructures bancaires, les opérateurs télécoms, les contraintes réglementaires et les réalités opérationnelles de l\'Afrique de l\'Ouest. Pas de boîte noire importée — des solutions pensées pour votre contexte.',
            icon: 'pi pi-globe',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            keywords: ['Sénégal', 'UEMOA', 'Banques', 'Télécoms', 'Microfinance']
        },
        {
            id: 2,
            tab: 'STACK MONDIALE',
            title: 'Pionniers de la Modern Data Stack',
            desc: 'Notre expertise couvre l\'ensemble des technologies de la Modern Data Stack — de la collecte à l\'activation. Nous aidons nos clients à tirer le meilleur parti d\'un écosystème en constante évolution, tout en assurant cohérence et gouvernance.',
            icon: 'pi pi-bolt',
            iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            keywords: ['dbt', 'Airbyte', 'Terraform', 'AWS', 'Kubernetes']
        },
        {
            id: 3,
            tab: 'FLEXIBILITÉ',
            title: 'Flexibilité et adaptation',
            desc: 'Chaque organisation est unique. Nous adaptons notre accompagnement à votre contexte — des solutions clé en main pour les structures agiles, aux méthodologies DataOps à grande échelle pour les environnements complexes et les grands groupes.',
            icon: 'pi pi-sliders-h',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            keywords: ['Audit', 'Mission', 'Formation', 'Embedded', 'Staff Aug']
        },
        {
            id: 4,
            tab: 'TRANSFERT',
            title: 'Transfert de compétences',
            desc: 'Chaque mission forme vos équipes. Nous documentons, formons et outillons vos collaborateurs pour qu\'ils maîtrisent les solutions déployées après notre départ. L\'expertise reste en interne — c\'est notre engagement.',
            icon: 'pi pi-users',
            iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            keywords: ['Ateliers', 'Documentation', 'Coaching', 'Autonomie', 'KT']
        }
    ];

    offers = [
        {
            icon: 'pi pi-search',
            eyebrow: 'EXPERTISE',
            illustrationBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            title: 'Audit & Diagnostic Data',
            duration: '3 à 5 jours',
            desc: 'Évaluez votre maturité data, identifiez les quick wins et obtenez une feuille de route priorisée pour structurer votre organisation autour de la donnée.',
            tags: ['CARTOGRAPHIE DATA', 'GAPS CRITIQUES', 'FEUILLE DE ROUTE', 'RAPPORT EXÉCUTIF'],
            cta: 'EN SAVOIR PLUS',
            route: 'audit',
            featured: false
        },
        {
            icon: 'pi pi-server',
            eyebrow: 'EXPERTISE',
            illustrationBg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            title: 'Mission Data Engineering / IA',
            duration: '1 à 6 mois',
            desc: 'Conception et déploiement de vos pipelines, plateformes data et modèles IA en production. Des livrables concrets, documentés, semaine après semaine.',
            tags: ['DATA PIPELINES', 'DATA PLATFORM', 'MODÈLES IA', 'DATAOPS'],
            cta: 'EN SAVOIR PLUS',
            route: 'mission',
            featured: true
        },
        {
            icon: 'pi pi-book',
            eyebrow: 'EXPERTISE',
            illustrationBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            title: 'Formation & Transfert de Compétences',
            duration: '1 à 5 jours',
            desc: 'Ateliers techniques sur mesure pour monter en compétences vos équipes data sur la Modern Data Stack et les pratiques DataOps.',
            tags: ['PROGRAMME SUR MESURE', 'CAS PRATIQUES', 'SUPPORT POST-FORMATION', 'RESSOURCES PÉDAGOGIQUES'],
            cta: 'EN SAVOIR PLUS',
            route: 'formation',
            featured: false
        }
    ];

    expertiseGroups = [
        {
            label: 'Data Engineering',
            techs: ['Snowflake', 'dbt', 'Apache Airflow', 'Debezium', 'Kafka', 'Spark', 'Airbyte'],
            dotClass: 'bg-indigo-400'
        },
        {
            label: 'Cloud & Infra',
            techs: ['AWS S3', 'Redshift', 'Glue', 'Lambda', 'Terraform', 'Docker', 'Kubernetes'],
            dotClass: 'bg-cyan-400'
        },
        {
            label: 'IA & ML',
            techs: ['Python', 'scikit-learn', 'LLMs', 'RAG', 'NLP', 'Modèles prédictifs'],
            dotClass: 'bg-emerald-400'
        },
        {
            label: 'Analytics & Viz',
            techs: ['dbt Metrics', 'Metabase', 'Superset', 'Power BI', 'Looker'],
            dotClass: 'bg-violet-400'
        },
        {
            label: 'DataOps',
            techs: ['CI/CD', 'Great Expectations', 'Elementary', 'dbt tests', 'Observabilité'],
            dotClass: 'bg-amber-400'
        }
    ];

    sectors = [
        {
            icon: 'pi pi-building-columns',
            illustrationBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            title: 'Banques & Institutions financières',
            examples: 'SGBS, Ecobank, BNDE, BICIS, CNCAS',
            needs: ['DATA WAREHOUSE', 'REPORTING RÉGLEMENTAIRE', 'SCORING CRÉDIT', 'SURVEILLANCE FRAUDE']
        },
        {
            icon: 'pi pi-wifi',
            illustrationBg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            title: 'Télécommunications',
            examples: 'Sonatel/Orange, Free, Expresso',
            needs: ['ANALYTICS CLIENT', 'CHURN PREDICTION', 'MONÉTISATION DONNÉES', 'NETWORK ANALYTICS']
        },
        {
            icon: 'pi pi-landmark',
            illustrationBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            title: 'Administration publique',
            examples: 'Ministères, APIX, DER/FJ, Agences d\'État',
            needs: ['TABLEAUX DE BORD', 'OPEN DATA', 'MODERNISATION SI', 'REPORTING']
        },
        {
            icon: 'pi pi-money-bill',
            illustrationBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            title: 'Microfinance & Coopératives',
            examples: 'ACEP, PAMECAS, CMS, CEC, Advans',
            needs: ['SCORING CRÉDIT', 'SUIVI PORTEFEUILLE', 'REPORTING IMPACT', 'DIGITAL LENDING']
        },
        {
            icon: 'pi pi-rocket',
            illustrationBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            title: 'Startups & Scaleups africaines',
            examples: 'Fintech, Agritech, Healthtech locales',
            needs: ['STACK DATA FROM SCRATCH', 'DATA PRODUCT', 'ML EN PRODUCTION', 'ANALYTICS']
        },
        {
            icon: 'pi pi-chart-bar',
            illustrationBg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
            title: 'Grandes PME & Groupes',
            examples: 'Groupe Mimran, CFAO, filiales de groupes internationaux',
            needs: ['ANALYTICS DÉCISIONNEL', 'MIGRATION CLOUD', 'GOUVERNANCE', 'DATA MESH']
        }
    ];

    steps = [
        { num: '1', title: 'Prise de contact', desc: 'Remplissez le formulaire ci-dessous. Nous revenons vers vous sous 24h.' },
        { num: '2', title: 'Cadrage gratuit', desc: 'Un appel de 30 min pour comprendre vos enjeux et évaluer comment nous pouvons vous aider.' },
        { num: '3', title: 'Proposition', desc: 'Vous recevez une proposition détaillée : périmètre, livrables et planning sous 5 jours.' },
        { num: '4', title: 'Exécution', desc: 'Démarrage de la mission avec points hebdomadaires et livrables documentés.' }
    ];

    sectorOptions = [
        { label: 'Banque / Finance', value: 'bank' },
        { label: 'Télécommunications', value: 'telco' },
        { label: 'Administration publique', value: 'admin' },
        { label: 'Microfinance / Coopérative', value: 'microfinance' },
        { label: 'Startup / Scaleup', value: 'startup' },
        { label: 'PME / Groupe', value: 'pme' },
        { label: 'Autre', value: 'other' }
    ];

    needOptions = [
        { label: 'Audit Data', value: 'audit' },
        { label: 'Mission Data Engineering / IA', value: 'mission' },
        { label: 'Formation & Transfert', value: 'formation' },
        { label: 'Je ne sais pas encore', value: 'undefined' }
    ];

    sourceOptions = [
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'Recommandation', value: 'recommendation' },
        { label: 'Google', value: 'google' },
        { label: 'Plateforme Omaad Wealth', value: 'platform' },
        { label: 'Autre', value: 'other' }
    ];

    scrollTo(id: string) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async onSubmit(form: NgForm) {
        if (form.invalid) return;
        this.submitting.set(true);
        await new Promise(r => setTimeout(r, 1200));
        this.submitting.set(false);
        this.submitted.set(true);
    }
}
