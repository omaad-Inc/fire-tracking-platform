import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer">
        <span class="font-semibold">Omaad</span>
        <span class="text-muted-color ml-1">© {{ year }}</span>
    </div>`
})
export class AppFooter {
    year = new Date().getFullYear();
}
