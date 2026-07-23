import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { NavModelService } from '../../core/services/nav-model.service';
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

    private navModel = inject(NavModelService);

    constructor(private router: Router, private i18n: I18nService) {
        // Rebuild on navigation so language + share-mode changes are reflected.
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
        // Single source of truth (shared with the mobile bottom bar).
        this.model = this.navModel.buildSidebar();
    }

    private getCurrentLang(): 'fr' | 'en' {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        const l = (match ? match[1] : 'fr') as 'fr' | 'en';
        this.i18n.setLang(l);
        return l;
    }
}
