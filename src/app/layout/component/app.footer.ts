import { Component } from '@angular/core';
import { NewsletterSignup } from '../../pages/landing/components/newsletter-signup';

@Component({
    standalone: true,
    selector: 'app-footer',
    imports: [NewsletterSignup],
    template: `<div class="layout-footer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <span class="font-semibold">Omaad</span>
            <span class="text-muted-color ml-1">© {{ year }}</span>
        </div>
        <!-- Newsletter capture for logged-in users (first-party -> Beehiiv) -->
        <app-newsletter-signup source="omaad-app-footer" [compact]="true" tone="surface" />
    </div>`
})
export class AppFooter {
    year = new Date().getFullYear();
}
