import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true" class="mb-2"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];
    lang = 'fr';

    ngOnInit() {
        this.lang = this.getCurrentLang();
        this.model = [
            {
                items: [
                    {
                         label: 'Synthèse', 
                         icon: 'pi pi-fw pi-objects-column', routerLink: this.link() 
                    },
                ]
            },
            {
                items: [
                    {
                        label: 'Patrimoine',
                        icon: 'pi pi-fw pi-chart-bar',
                        routerLink: this.link('pages', 'patrimoine'),
    
                    },
                ]
            },
            {
                items: [
                    {
                         label: 'Transactions', 
                         icon: 'pi pi-fw pi-receipt', 
                         routerLink: this.link('pages', 'transaction')
                    },
                ]
            },
            {
                items: [
                    {
                         label: 'Epargne', 
                         icon: 'pi pi-fw pi-history', 
                         routerLink: this.link('pages', 'savings')
                    },
                ]
            },
            
            {
                items: [
                    {
                         label: 'Dettes', 
                         icon: 'pi pi-fw pi-money-bill', 
                         routerLink: this.link('pages', 'debts')
                    },
                ]
            },
            {
                items: [
                    {
                        label: 'Paramètres',
                        icon: 'pi pi-fw pi-cog',
                        items: [
                            {
                                label: 'Mon compte',
                                icon: 'pi pi-fw pi-user',
                                routerLink: this.link('pages', 'settings', 'account')
                            },
                            {
                                label: 'Sécurité',
                                icon: 'pi pi-fw pi-shield',
                                routerLink: this.link('pages', 'settings', 'security')
                            },
                            {
                                label: 'Préférences',
                                icon: 'pi pi-fw pi-sliders-h',
                                routerLink: this.link('pages', 'settings', 'preferences')
                            }
                        ]
                    },
                ]
            },
            {
                items: [
                    {
                        label: 'Landing',
                        icon: 'pi pi-fw pi-globe',
                        routerLink: this.link('landing')
                    },
                    {
                        label: 'Auth',
                        icon: 'pi pi-fw pi-user',
                        items: [
                            {
                                label: 'Login',
                                icon: 'pi pi-fw pi-sign-in',
                                routerLink: this.link('auth', 'login')
                            },
                            {
                                label: 'Error',
                                icon: 'pi pi-fw pi-times-circle',
                                routerLink: this.link('auth', 'error')
                            },
                            {
                                label: 'Access Denied',
                                icon: 'pi pi-fw pi-lock',
                                routerLink: this.link('auth', 'access')
                            }
                        ]
                    },
                    {
                        label: 'Not Found',
                        icon: 'pi pi-fw pi-exclamation-circle',
                        routerLink: this.link('notfound')
                    },
                    {
                        label: 'Empty',
                        icon: 'pi pi-fw pi-circle-off',
                        routerLink: this.link('pages', 'empty')
                    }
                ]
            },
        ];
    }

    constructor(private router: Router, private i18n: I18nService) {}

    private getCurrentLang(): 'fr' | 'en' {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        const l = (match ? match[1] : 'fr') as 'fr' | 'en';
        this.i18n.setLang(l);
        return l;
    }

    private link(...segments: string[]): any[] {
        return ['/', this.lang, ...segments];
    }
}
