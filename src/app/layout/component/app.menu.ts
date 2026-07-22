import { Component, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { NavService } from '../../core/services/nav.service';
import { ShareContextService } from '../../core/services/share-context.service';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];
    lang = 'fr';

    private aiAssistant = inject(AiAssistantService);
    private nav = inject(NavService);
    private share = inject(ShareContextService);

    constructor(private router: Router, private i18n: I18nService) {
        // Listen to route changes to update language
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            takeUntilDestroyed(),
        ).subscribe(() => {
            this.updateMenu();
        });
    }

    ngOnInit() {
        this.updateMenu();
    }

    private updateMenu() {
        this.lang = this.getCurrentLang();
        this.model = [
            // Main Navigation
            {
                label: this.t('menu.navigation'),
                items: [
                    {
                        label: this.t('menu.dashboard'),
                        icon: 'pi pi-fw pi-home',
                        routerLink: this.link()
                    },
                    {
                        label: this.t('menu.patrimony'),
                        icon: 'pi pi-fw pi-wallet',
                        routerLink: this.link('pages', 'patrimoine'),
                    },
                    {
                        label: this.t('menu.transactions'),
                        icon: 'pi pi-fw pi-arrow-right-arrow-left',
                        routerLink: this.link('pages', 'transaction')
                    },
                ]
            },
            // Separator
            { separator: true },
            // Goals, lifetime FIRE, wealth score, and short-term goals
            {
                label: this.t('menu.fireSection'),
                items: [
                    {
                        label: this.t('menu.fire'),
                        icon: 'pi pi-fw pi-chart-line',
                        routerLink: this.link('pages', 'fire')
                    },
                    {
                        label: this.t('menu.myGoals'),
                        icon: 'pi pi-fw pi-bullseye',
                        routerLink: this.link('pages', 'goals')
                    },
                    {
                        label: this.t('menu.wealthScore'),
                        icon: 'pi pi-fw pi-gauge',
                        routerLink: this.link('pages', 'wealth-score')
                    }
                ]
            },
            // Separator
            { separator: true },
            // Finance
            {
                label: this.t('menu.finances'),
                items: [
                    {
                        label: this.t('menu.debts'),
                        icon: 'pi pi-fw pi-credit-card',
                        routerLink: this.link('pages', 'debts')
                    },
                    {
                        label: this.t('menu.insights'),
                        icon: 'pi pi-fw pi-chart-bar',
                        routerLink: this.link('pages', 'insights')
                    },
                ]
            },
        ];

        // AI Assistant, only in the authenticated app (not a public share).
        if (!this.share.active()) {
            this.model.push(
                { separator: true },
                {
                    label: this.t('menu.assistant'),
                    items: [
                        {
                            label: this.t('menu.aiAssistant'),
                            icon: 'pi pi-fw pi-sparkles',
                            styleClass: 'menu-item-ai',
                            command: () => this.aiAssistant.show(),
                        }
                    ]
                },
            );
        }
    }

    private getCurrentLang(): 'fr' | 'en' {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        const l = (match ? match[1] : 'fr') as 'fr' | 'en';
        this.i18n.setLang(l);
        return l;
    }

    private link(...segments: string[]): any[] {
        return this.nav.link(...segments);
    }

    private t(key: string): string {
        return this.i18n.t(key);
    }
}
