import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer">
        Finova by
        <a href="https://mbayestein.netlify.app/" target="_blank" rel="noopener noreferrer" class="text-primary font-bold hover:underline">MbayeStein</a>
    </div>`
})
export class AppFooter {}
