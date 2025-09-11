import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

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

    ngOnInit() {
        this.model = [
            {
                items: [
                    {
                         label: 'Synthèse', 
                         icon: 'pi pi-fw pi-objects-column', routerLink: ['/'] 
                    },
                ]
            },
            {
                items: [
                    {
                        label: 'Patrimoine',
                        icon: 'pi pi-fw pi-chart-bar',
                        routerLink: ['/pages/patrimoine'],
    
                    },
                ]
            },
            {
                items: [
                    {
                         label: 'Transactions', 
                         icon: 'pi pi-fw pi-receipt', 
                         routerLink: ['/pages/transaction']
                    },
                ]
            },
            {
                items: [
                    {
                         label: 'Epargne', 
                         icon: 'pi pi-fw pi-history', 
                         routerLink: ['/pages/savings']
                    },
                ]
            },
            
            {
                items: [
                    {
                         label: 'Dettes', 
                         icon: 'pi pi-fw pi-money-bill', 
                         routerLink: ['/pages/debts']
                    },
                ]
            },
            {
                items: [
                    {
                        label: 'Landing',
                        icon: 'pi pi-fw pi-globe',
                        routerLink: ['/landing']
                    },
                    {
                        label: 'Auth',
                        icon: 'pi pi-fw pi-user',
                        items: [
                            {
                                label: 'Login',
                                icon: 'pi pi-fw pi-sign-in',
                                routerLink: ['/auth/login']
                            },
                            {
                                label: 'Error',
                                icon: 'pi pi-fw pi-times-circle',
                                routerLink: ['/auth/error']
                            },
                            {
                                label: 'Access Denied',
                                icon: 'pi pi-fw pi-lock',
                                routerLink: ['/auth/access']
                            }
                        ]
                    },
                    {
                        label: 'Not Found',
                        icon: 'pi pi-fw pi-exclamation-circle',
                        routerLink: ['/pages/notfound']
                    },
                    {
                        label: 'Empty',
                        icon: 'pi pi-fw pi-circle-off',
                        routerLink: ['/pages/empty']
                    }
                ]
            },
        ];
    }
}
