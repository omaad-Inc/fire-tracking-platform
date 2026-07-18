import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../service/layout.service';
import { I18nService } from '../../i18n/i18n.service';
import { filter } from 'rxjs/operators';
import { TokenService } from '../../core/services/token.service';
import { environment } from '../../../environments/environment';
import { PrivacyService } from '../../core/services/privacy.service';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { ShareContextService } from '../../core/services/share-context.service';
import { SharePortfolioDialog } from './share-portfolio-dialog';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, SharePortfolioDialog],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            @if (!share.active()) {
                <!-- Mobile ONLY: User avatar (no sidebar on mobile, so avatar lives here) -->
                <a [routerLink]="['/'+lang, 'pages', 'settings']"
                   class="lg:hidden flex items-center justify-center shrink-0">
                    <div class="w-9 h-9 rounded-full bg-surface-800 dark:bg-surface-700 flex items-center justify-center overflow-hidden">
                        @if (avatarUrl) {
                            <img [src]="avatarUrl" alt="Profile" class="w-full h-full object-cover">
                        } @else {
                            <i class="pi pi-user text-surface-200"></i>
                        }
                    </div>
                </a>
            }
        </div>

        <div class="layout-topbar-actions">
            <!-- Desktop ONLY: dark mode toggle -->
            <div class="layout-config-menu hidden lg:flex">
                <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
                    <i [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                </button>
            </div>

            @if (!share.active()) {
                <!-- Eye icon (privacy toggle) -->
                <button type="button" class="layout-topbar-action" (click)="privacyService.toggle()"
                        [title]="privacyService.hidden() ? 'Afficher les montants' : 'Masquer les montants'">
                    <i class="pi" [ngClass]="privacyService.hidden() ? 'pi-eye-slash' : 'pi-eye'"></i>
                </button>

                <!-- Share portfolio -->
                <button type="button" class="layout-topbar-action" (click)="shareOpen.set(true)"
                        [attr.aria-label]="t('shareDialog.title')" [title]="t('shareDialog.title')">
                    <i class="pi pi-share-alt"></i>
                </button>

                <!-- AI Assistant -->
                <button type="button"
                        class="layout-topbar-action ai-topbar-btn"
                        (click)="aiAssistant.show()"
                        [attr.aria-label]="t('aiAssistant.title')"
                        [title]="t('aiAssistant.title')">
                    <i class="pi pi-sparkles"></i>
                </button>

                <!-- UPGRADE PRO pill -->
                <a [routerLink]="['/'+lang, 'pages', 'plans']"
                   class="flex items-center gap-1 px-2.5 py-1.5 rounded-full
                          bg-ochre-500 hover:bg-ochre-400 text-warm-900 text-[10px] lg:text-xs font-bold
                          tracking-wider transition-all hover:shadow-lg">
                    <i class="pi pi-crown" style="font-size:9px"></i>
                    PRO
                </a>

                <!-- Add Assets Button - Desktop Only -->
                <button
                    type="button"
                    class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-medium transition-all hover:shadow-lg"
                    (click)="navigateToAddAsset()"
                >
                    <i class="pi pi-plus"></i>
                    <span>{{ t('topbar.addAssets') }}</span>
                </button>
            } @else {
                <!-- Public share view: invite the visitor to join Omaad -->
                <a [routerLink]="['/']"
                   class="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white text-xs lg:text-sm font-semibold transition-all hover:shadow-lg">
                    <i class="pi pi-bolt"></i>
                    <span>{{ t('shareView.joinCtaButton') }}</span>
                </a>
            }
        </div>
    </div>
    @if (!share.active()) {
        <app-share-portfolio-dialog [open]="shareOpen()" (close)="shareOpen.set(false)" />
    }
    `
})
export class AppTopbar implements OnInit {
    private router = inject(Router);
    private i18n = inject(I18nService);
    private tokenService = inject(TokenService);
    privacyService  = inject(PrivacyService);
    aiAssistant     = inject(AiAssistantService);
    share           = inject(ShareContextService);

    layoutService = inject(LayoutService);

    lang = 'fr';
    shareOpen = signal(false);
    user = this.tokenService.user;

    constructor() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.lang = this.getCurrentLang();
        });
    }

    ngOnInit() {
        this.lang = this.getCurrentLang();
    }

    get avatarUrl(): string | null {
        const user = this.user();
        if (!user?.avatar_url) return null;
        if (user.avatar_url.startsWith('/uploads/')) {
            return environment.apiUrl.replace('/api/v1', '') + user.avatar_url;
        }
        return user.avatar_url;
    }

    private getCurrentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        return match ? match[1] : 'fr';
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => {
            const isCurrentlyDark = state.darkTheme ?? false;
            return {
                ...state,
                themeMode: isCurrentlyDark ? 'light' : 'dark',
                darkTheme: !isCurrentlyDark
            };
        });
    }

    navigateToAddAsset(): void {
        this.router.navigate(['/', this.lang, 'pages', 'patrimoine', 'add-asset']);
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
