import { Component, inject, signal, computed } from '@angular/core';
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
import { I18nService, Lang } from '../../../i18n/i18n.service';

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
                        {{ _('Cabinet de conseil Data & IA', 'Data & AI Consulting Firm') }}
                    </p>

                    <h1 class="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                        {{ _('Partenaire de votre', 'Partner for your') }}<br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                            {{ _('transformation Data & IA', 'Data & AI transformation') }}
                        </span>
                    </h1>

                    <p class="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        {{ _('De la stratégie à la mise en œuvre, nous concevons des plateformes data modernes', 'From strategy to implementation, we design modern data platforms') }}
                        {{ heroDesc2() }}
                    </p>

                    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                        <button pButton pRipple [label]="ctaProject()"
                                (click)="scrollTo('contact')"
                                class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-semibold
                                       !tracking-wide !px-8 !py-3 !rounded-lg
                                       hover:!shadow-xl hover:!shadow-indigo-500/30 transition-all duration-300">
                        </button>
                        <button pButton pRipple [label]="_('NOS OFFRES', 'OUR SERVICES')"
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
                 BLOC 2 — {{ _('CE QUI NOUS DISTINGUE', 'WHAT SETS US APART') }} (white)
                 Modeo-style: 5 interactive tabs
            ══════════════════════════════════════════ -->
            <section class="bg-white dark:bg-slate-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <!-- Section header -->
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">
                            {{ _('CE QUI NOUS DISTINGUE', 'WHAT SETS US APART') }}
                        </p>
                        <h2 class="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight max-w-2xl">
                            {{ _('Pourquoi les entreprises africaines travaillent avec nous', 'Why African businesses work with us') }}
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
                                    <button pButton pRipple [label]="ctaProject()"
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
                            {{ _('CONSTRUIRE VOS FONDATIONS DATA', 'BUILD YOUR DATA FOUNDATIONS') }}
                        </p>
                        <h2 class="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight max-w-2xl">
                            {{ _('Ce que nous faisons', 'What we do') }}
                        </h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-4 text-lg max-w-xl">
                            {{ _('Des missions calibrées selon vos besoins. Chaque engagement commence par un appel de cadrage gratuit.', 'Engagements tailored to your needs. Every project starts with a free scoping call.') }}
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
                                            {{ _('Le plus demandé', 'Most requested') }}
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
                        {{ _('UN PROJET EN TÊTE ?', 'HAVE A PROJECT IN MIND?') }}
                    </p>
                    <h2 class="text-3xl md:text-4xl font-bold text-white mb-6">
                        {{ _('Vous avez un projet data ?', 'Have a data project?') }}<br>{{ talkLabel() }}
                    </h2>
                    <button pButton pRipple [label]="ctaContact()"
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
                            {{ _('CHAQUE MARCHÉ A SES RÉALITÉS', 'EVERY MARKET HAS ITS REALITIES') }}
                        </p>
                        <h2 class="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight max-w-2xl">
                            {{ _('Nos secteurs cibles', 'Our target sectors') }}
                        </h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-4 text-lg max-w-xl">
                            {{ sectorSubtitle() }}
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
                            {{ _('Notre expertise technique', 'Our technical expertise') }}
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
                            {{ _('SIMPLE ET TRANSPARENT', 'SIMPLE AND TRANSPARENT') }}
                        </p>
                        <h2 class="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                            {{ _('Comment ça marche', 'How it works') }}
                        </h2>
                        <p class="text-slate-500 dark:text-slate-400 text-lg">
                            {{ _('De la prise de contact au démarrage de mission en 4 étapes.', 'From first contact to mission kickoff in 4 steps.') }}
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
                        <button pButton pRipple [label]="ctaContactShort()"
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
                            {{ _('DÉMARRONS ENSEMBLE', 'LET'S START TOGETHER') }}
                        </p>
                        <h2 class="text-4xl md:text-5xl font-bold text-white mb-4">
                            {{ _('Discutons de votre projet', 'Let's discuss your project') }}
                        </h2>
                        <p class="text-slate-400 text-lg">
                            {{ _('Décrivez votre besoin — nous vous revenons sous 24h pour un appel de cadrage gratuit.', 'Describe your need — we get back to you within 24h for a free scoping call.') }}
                        </p>
                    </div>

                    @if (submitted()) {
                        <div class="flex flex-col items-center justify-center py-20 text-center rounded-3xl
                                    bg-white/5 border border-white/10">
                            <div class="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                                <i class="pi pi-check text-3xl text-emerald-400"></i>
                            </div>
                            <h3 class="text-2xl font-bold text-white mb-3">{{ _('Message envoyé !', 'Message sent!') }}</h3>
                            <p class="text-slate-400 max-w-sm text-lg">
                                {{ _('Merci pour votre intérêt. Un expert vous contactera dans les 24 heures.', 'Thank you for your interest. An expert will contact you within 24 hours.') }}
                            </p>
                        </div>
                    } @else {
                        <form #contactForm="ngForm" (ngSubmit)="onSubmit(contactForm)"
                              class="rounded-3xl p-8 md:p-10 bg-white/5 border border-white/10 space-y-6">

                            <!-- Nom + Email -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                        {{ _('Prénom & Nom', 'Full Name') }} <span class="text-rose-400">*</span>
                                    </label>
                                    <input pInputText name="fullName" [(ngModel)]="form.fullName" required
                                           placeholder="Amadou Diallo"
                                           class="w-full !bg-white/5 !border-white/20 !text-white placeholder:!text-slate-500" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                        {{ _('Email professionnel', 'Professional email') }} <span class="text-rose-400">*</span>
                                    </label>
                                    <input pInputText name="email" [(ngModel)]="form.email" required type="email"
                                           placeholder="vous@entreprise.com"
                                           class="w-full !bg-white/5 !border-white/20 !text-white placeholder:!text-slate-500" />
                                </div>
                            </div>

                            <!-- Entreprise -->
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                    {{ _('Entreprise / Organisation', 'Company / Organisation') }} <span class="text-rose-400">*</span>
                                </label>
                                <input pInputText name="company" [(ngModel)]="form.company" required
                                       placeholder="{{ _('Nom de votre organisation', 'Your organisation name') }}"
                                       class="w-full !bg-white/5 !border-white/20 !text-white placeholder:!text-slate-500" />
                            </div>

                            <!-- Secteur + Type besoin -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                        {{ sectorLabel() }} <span class="text-rose-400">*</span>
                                    </label>
                                    <p-select name="sector" [(ngModel)]="form.sector" required
                                              [options]="sectorOptions" optionLabel="label" optionValue="value"
                                              placeholder="Sélectionner…" styleClass="w-full" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                        {{ _('Type de besoin', 'Type of need') }} <span class="text-rose-400">*</span>
                                    </label>
                                    <p-select name="needType" [(ngModel)]="form.needType" required
                                              [options]="needOptions" optionLabel="label" optionValue="value"
                                              placeholder="Sélectionner…" styleClass="w-full" />
                                </div>
                            </div>

                            <!-- Description -->
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                    {{ _('Description du projet', 'Project description') }}
                                </label>
                                <textarea pTextarea name="description" [(ngModel)]="form.description"
                                          rows="4" class="w-full resize-none !bg-white/5 !border-white/20 !text-white placeholder:!text-slate-500"
                                          placeholder="Décrivez brièvement votre enjeu ou besoin data…"></textarea>
                            </div>

                            <!-- Source -->
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-semibold text-slate-300 tracking-wide">
                                    {{ howFoundUs() }}
                                </label>
                                <p-select name="source" [(ngModel)]="form.source"
                                          [options]="sourceOptions" optionLabel="label" optionValue="value"
                                          placeholder="Sélectionner…" styleClass="w-full" />
                            </div>

                            <!-- Social proof note -->
                            <div class="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                <i class="pi pi-info-circle text-indigo-400 mt-0.5 shrink-0"></i>
                                <p class="text-sm text-slate-400">
                                    {{ socialProof1() }}
                                    {{ socialProof2() }}
                                </p>
                            </div>

                            <button pButton pRipple type="submit"
                                    [label]="ctaSend()"
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
    private i18n   = inject(I18nService);
    currentLang = '/fr';

    /** True when display language is French */
    readonly isFr = computed(() => this.i18n.lang() === 'fr');

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang  = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + lang;
        this.i18n.setLang(lang);
    }

    /** Shortcut for template: {{ _('French text', 'English text') }} */
    _(fr: string, en: string): string { return this.isFr() ? fr : en; }

    // ── Strings with apostrophes (cannot use inline quotes in Angular templates) ──
    readonly heroDesc2          = computed(() => this.isFr() ? 'et des solutions IA pour acc\u00e9l\u00e9rer l\u2019innovation en Afrique de l\u2019Ouest.' : 'and AI solutions to accelerate innovation in West Africa.');
    readonly ctaProject         = computed(() => this.isFr() ? 'DISCUTER D\u2019UN PROJET' : 'DISCUSS A PROJECT');
    readonly ctaContact         = computed(() => this.isFr() ? 'PRENDRE CONTACT AVEC UN EXPERT DATA' : 'CONTACT A DATA EXPERT');
    readonly ctaContactShort    = computed(() => this.isFr() ? 'PRENDRE CONTACT' : 'GET IN TOUCH');
    readonly ctaSend            = computed(() => this.isFr() ? 'ENVOYER MA DEMANDE' : 'SEND MY REQUEST');
    readonly sectorLabel        = computed(() => this.isFr() ? 'Secteur d\u2019activit\u00e9' : 'Industry sector');
    readonly howFoundUs         = computed(() => this.isFr() ? 'Comment nous avez-vous connus ?' : 'How did you hear about us?');
    readonly sectorSubtitle     = computed(() => this.isFr() ? 'Nous connaissons les acteurs, les contraintes et les enjeux data de chaque secteur en Afrique de l\u2019Ouest.' : 'We know the players, constraints and data challenges of every sector in West Africa.');
    readonly socialProof1       = computed(() => this.isFr() ? 'Nous d\u00e9marrons. Soyez parmi nos premi\u00e8res r\u00e9f\u00e9rences et b\u00e9n\u00e9ficiez' : 'We are launching. Be among our first references and benefit from');
    readonly socialProof2       = computed(() => this.isFr() ? 'd\u2019un accompagnement personnalis\u00e9 et d\u2019un tarif de lancement.' : 'personalised support and launch pricing.');
    readonly talkLabel          = computed(() => this.isFr() ? 'Parlons-en !' : 'Let\u2019s talk!');

    form: ContactForm = { fullName: '', email: '', company: '', sector: '', needType: '', description: '', source: '' };
    submitted = signal(false);
    submitting = signal(false);
    activeTab = signal(0);

    heroTags = ['DATA ENGINEERING', 'ANALYTICS', 'BI', 'DATAOPS', 'AI & GENAI', 'GOVERNANCE'];

    get differentiators() {
        const f = this.isFr();
        return [
            { id: 0, tab: f ? 'EXPERTISE DATA' : 'DATA EXPERTISE',
              title: f ? 'Expertise en Data Engineering' : 'Data Engineering Expertise',
              desc: f ? 'Conçue par des praticiens pour des praticiens, notre approche repose sur une maîtrise approfondie des architectures data modernes. Nous concevons des plateformes fiables, performantes et durables, adaptées aux contraintes réelles des entreprises africaines.'
                     : 'Built by practitioners for practitioners, our approach relies on deep mastery of modern data architectures. We design reliable, performant and sustainable platforms adapted to the real constraints of African businesses.',
              icon: 'pi pi-server', iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              keywords: ['Snowflake', 'dbt', 'Airflow', 'Kafka', 'Spark'] },
            { id: 1, tab: f ? 'CONNAISSANCE LOCALE' : 'LOCAL EXPERTISE',
              title: f ? 'Connaissance du marché africain' : 'Deep African market knowledge',
              desc: f ? 'Nous connaissons les infrastructures bancaires, les opérateurs télécoms, les contraintes réglementaires et les réalités opérationnelles de l\'Afrique de l\'Ouest. Pas de boîte noire importée — des solutions pensées pour votre contexte.'
                     : 'We understand banking infrastructure, telecom operators, regulatory constraints and operational realities in West Africa. No imported black box — solutions designed for your context.',
              icon: 'pi pi-globe', iconBg: 'linear-gradient(135deg, #10b981, #059669)',
              keywords: f ? ['Sénégal', 'UEMOA', 'Banques', 'Télécoms', 'Microfinance'] : ['Senegal', 'WAEMU', 'Banking', 'Telecoms', 'Microfinance'] },
            { id: 2, tab: f ? 'STACK MONDIALE' : 'WORLD-CLASS STACK',
              title: f ? 'Pionniers de la Modern Data Stack' : 'Modern Data Stack pioneers',
              desc: f ? 'Notre expertise couvre l\'ensemble des technologies de la Modern Data Stack — de la collecte à l\'activation. Nous aidons nos clients à tirer le meilleur parti d\'un écosystème en constante évolution, tout en assurant cohérence et gouvernance.'
                     : 'Our expertise covers the entire Modern Data Stack — from ingestion to activation. We help clients leverage an ever-evolving ecosystem while ensuring consistency and governance.',
              icon: 'pi pi-bolt', iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              keywords: ['dbt', 'Airbyte', 'Terraform', 'AWS', 'Kubernetes'] },
            { id: 3, tab: f ? 'FLEXIBILITÉ' : 'FLEXIBILITY',
              title: f ? 'Flexibilité et adaptation' : 'Flexibility and adaptation',
              desc: f ? 'Chaque organisation est unique. Nous adaptons notre accompagnement à votre contexte — des solutions clé en main pour les structures agiles, aux méthodologies DataOps à grande échelle pour les environnements complexes et les grands groupes.'
                     : 'Every organisation is unique. We adapt our approach to your context — turnkey solutions for agile structures, to large-scale DataOps methodologies for complex environments and enterprise groups.',
              icon: 'pi pi-sliders-h', iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
              keywords: ['Audit', 'Mission', f ? 'Formation' : 'Training', 'Embedded', 'Staff Aug'] },
            { id: 4, tab: f ? 'TRANSFERT' : 'KNOWLEDGE TRANSFER',
              title: f ? 'Transfert de compétences' : 'Knowledge transfer',
              desc: f ? 'Chaque mission forme vos équipes. Nous documentons, formons et outillons vos collaborateurs pour qu\'ils maîtrisent les solutions déployées après notre départ. L\'expertise reste en interne — c\'est notre engagement.'
                     : 'Every engagement upskills your team. We document, train and equip your staff to fully own the solutions we deploy. The expertise stays in-house — that\'s our commitment.',
              icon: 'pi pi-users', iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              keywords: f ? ['Ateliers', 'Documentation', 'Coaching', 'Autonomie', 'KT'] : ['Workshops', 'Documentation', 'Coaching', 'Autonomy', 'KT'] }
        ];
    }

    get offers() {
        const f = this.isFr();
        return [
            { icon: 'pi pi-search', eyebrow: 'EXPERTISE',
              illustrationBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              title: f ? 'Audit & Diagnostic Data' : 'Data Audit & Diagnostic',
              duration: f ? '3 à 5 jours' : '3 to 5 days',
              desc: f ? 'Évaluez votre maturité data, identifiez les quick wins et obtenez une feuille de route priorisée pour structurer votre organisation autour de la donnée.'
                     : 'Assess your data maturity, identify quick wins and get a prioritised roadmap to structure your organisation around data.',
              tags: f ? ['CARTOGRAPHIE DATA', 'GAPS CRITIQUES', 'FEUILLE DE ROUTE', 'RAPPORT EXÉCUTIF'] : ['DATA MAPPING', 'CRITICAL GAPS', 'ROADMAP', 'EXECUTIVE REPORT'],
              cta: f ? 'EN SAVOIR PLUS' : 'LEARN MORE', route: 'audit', featured: false },
            { icon: 'pi pi-server', eyebrow: 'EXPERTISE',
              illustrationBg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              title: f ? 'Mission Data Engineering / IA' : 'Data Engineering / AI Mission',
              duration: f ? '1 à 6 mois' : '1 to 6 months',
              desc: f ? 'Conception et déploiement de vos pipelines, plateformes data et modèles IA en production. Des livrables concrets, documentés, semaine après semaine.'
                     : 'Design and deploy your pipelines, data platforms and AI models in production. Concrete, documented deliverables, week after week.',
              tags: ['DATA PIPELINES', 'DATA PLATFORM', f ? 'MODÈLES IA' : 'AI MODELS', 'DATAOPS'],
              cta: f ? 'EN SAVOIR PLUS' : 'LEARN MORE', route: 'mission', featured: true },
            { icon: 'pi pi-book', eyebrow: 'EXPERTISE',
              illustrationBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              title: f ? 'Formation & Transfert de Compétences' : 'Training & Knowledge Transfer',
              duration: f ? '1 à 5 jours' : '1 to 5 days',
              desc: f ? 'Ateliers techniques sur mesure pour monter en compétences vos équipes data sur la Modern Data Stack et les pratiques DataOps.'
                     : 'Tailored technical workshops to upskill your data teams on the Modern Data Stack and DataOps practices.',
              tags: f ? ['PROGRAMME SUR MESURE', 'CAS PRATIQUES', 'SUPPORT POST-FORMATION', 'RESSOURCES PÉDAGOGIQUES']
                     : ['TAILORED CURRICULUM', 'HANDS-ON LABS', 'POST-TRAINING SUPPORT', 'LEARNING RESOURCES'],
              cta: f ? 'EN SAVOIR PLUS' : 'LEARN MORE', route: 'formation', featured: false }
        ];
    }

    expertiseGroups = [
        { label: 'Data Engineering', techs: ['Snowflake', 'dbt', 'Apache Airflow', 'Debezium', 'Kafka', 'Spark', 'Airbyte'], dotClass: 'bg-indigo-400' },
        { label: 'Cloud & Infra', techs: ['AWS S3', 'Redshift', 'Glue', 'Lambda', 'Terraform', 'Docker', 'Kubernetes'], dotClass: 'bg-cyan-400' },
        { label: 'AI & ML', techs: ['Python', 'scikit-learn', 'LLMs', 'RAG', 'NLP', 'Predictive Models'], dotClass: 'bg-emerald-400' },
        { label: 'Analytics & Viz', techs: ['dbt Metrics', 'Metabase', 'Superset', 'Power BI', 'Looker'], dotClass: 'bg-violet-400' },
        { label: 'DataOps', techs: ['CI/CD', 'Great Expectations', 'Elementary', 'dbt tests', 'Observability'], dotClass: 'bg-amber-400' }
    ];

    get sectors() {
        const f = this.isFr();
        return [
            { icon: 'pi pi-building-columns', illustrationBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              title: f ? 'Banques & Institutions financières' : 'Banks & Financial Institutions',
              examples: 'SGBS, Ecobank, BNDE, BICIS, CNCAS',
              needs: f ? ['DATA WAREHOUSE', 'REPORTING RÉGLEMENTAIRE', 'SCORING CRÉDIT', 'SURVEILLANCE FRAUDE'] : ['DATA WAREHOUSE', 'REGULATORY REPORTING', 'CREDIT SCORING', 'FRAUD DETECTION'] },
            { icon: 'pi pi-wifi', illustrationBg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              title: f ? 'Télécommunications' : 'Telecommunications',
              examples: 'Sonatel/Orange, Free, Expresso',
              needs: f ? ['ANALYTICS CLIENT', 'CHURN PREDICTION', 'MONÉTISATION DONNÉES', 'NETWORK ANALYTICS'] : ['CUSTOMER ANALYTICS', 'CHURN PREDICTION', 'DATA MONETISATION', 'NETWORK ANALYTICS'] },
            { icon: 'pi pi-landmark', illustrationBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              title: f ? 'Administration publique' : 'Public Administration',
              examples: f ? 'Ministères, APIX, DER/FJ, Agences d\'État' : 'Ministries, APIX, DER/FJ, State Agencies',
              needs: f ? ['TABLEAUX DE BORD', 'OPEN DATA', 'MODERNISATION SI', 'REPORTING'] : ['DASHBOARDS', 'OPEN DATA', 'IT MODERNISATION', 'REPORTING'] },
            { icon: 'pi pi-money-bill', illustrationBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              title: f ? 'Microfinance & Coopératives' : 'Microfinance & Cooperatives',
              examples: 'ACEP, PAMECAS, CMS, CEC, Advans',
              needs: f ? ['SCORING CRÉDIT', 'SUIVI PORTEFEUILLE', 'REPORTING IMPACT', 'DIGITAL LENDING'] : ['CREDIT SCORING', 'PORTFOLIO TRACKING', 'IMPACT REPORTING', 'DIGITAL LENDING'] },
            { icon: 'pi pi-rocket', illustrationBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              title: f ? 'Startups & Scaleups africaines' : 'African Startups & Scaleups',
              examples: f ? 'Fintech, Agritech, Healthtech locales' : 'Local Fintech, Agritech, Healthtech',
              needs: ['STACK DATA FROM SCRATCH', 'DATA PRODUCT', 'ML EN PRODUCTION', 'ANALYTICS'] },
            { icon: 'pi pi-chart-bar', illustrationBg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              title: f ? 'Grandes PME & Groupes' : 'Large SMEs & Groups',
              examples: f ? 'Groupe Mimran, CFAO, filiales de groupes internationaux' : 'Mimran Group, CFAO, international subsidiaries',
              needs: f ? ['ANALYTICS DÉCISIONNEL', 'MIGRATION CLOUD', 'GOUVERNANCE', 'DATA MESH'] : ['DECISION ANALYTICS', 'CLOUD MIGRATION', 'GOVERNANCE', 'DATA MESH'] }
        ];
    }

    get steps() {
        const f = this.isFr();
        return [
            { num: '1', title: f ? 'Prise de contact' : 'Get in touch',           desc: f ? 'Remplissez le formulaire ci-dessous. Nous revenons vers vous sous 24h.' : 'Fill in the form below. We get back to you within 24 hours.' },
            { num: '2', title: f ? 'Cadrage gratuit' : 'Free scoping call',        desc: f ? 'Un appel de 30 min pour comprendre vos enjeux et évaluer comment nous pouvons vous aider.' : 'A 30-minute call to understand your challenges and assess how we can help.' },
            { num: '3', title: f ? 'Proposition' : 'Proposal',                     desc: f ? 'Vous recevez une proposition détaillée : périmètre, livrables et planning sous 5 jours.' : 'You receive a detailed proposal: scope, deliverables and timeline within 5 days.' },
            { num: '4', title: f ? 'Exécution' : 'Execution',                      desc: f ? 'Démarrage de la mission avec points hebdomadaires et livrables documentés.' : 'Mission kickoff with weekly checkpoints and documented deliverables.' }
        ];
    }

    get sectorOptions() {
        const f = this.isFr();
        return [
            { label: f ? 'Banque / Finance' : 'Banking / Finance', value: 'bank' },
            { label: f ? 'Télécommunications' : 'Telecommunications', value: 'telco' },
            { label: f ? 'Administration publique' : 'Public Administration', value: 'admin' },
            { label: f ? 'Microfinance / Coopérative' : 'Microfinance / Cooperative', value: 'microfinance' },
            { label: 'Startup / Scaleup', value: 'startup' },
            { label: f ? 'PME / Groupe' : 'SME / Group', value: 'pme' },
            { label: f ? 'Autre' : 'Other', value: 'other' }
        ];
    }

    get needOptions() {
        const f = this.isFr();
        return [
            { label: 'Data Audit', value: 'audit' },
            { label: f ? 'Mission Data Engineering / IA' : 'Data Engineering / AI Mission', value: 'mission' },
            { label: f ? 'Formation & Transfert' : 'Training & Transfer', value: 'formation' },
            { label: f ? 'Je ne sais pas encore' : 'I\'m not sure yet', value: 'undefined' }
        ];
    }

    get sourceOptions() {
        return [
            { label: 'LinkedIn', value: 'linkedin' },
            { label: this.isFr() ? 'Recommandation' : 'Referral', value: 'recommendation' },
            { label: 'Google', value: 'google' },
            { label: 'Omaad Wealth', value: 'platform' },
            { label: this.isFr() ? 'Autre' : 'Other', value: 'other' }
        ];
    }

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
