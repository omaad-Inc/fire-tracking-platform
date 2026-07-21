import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LayoutService } from './app/layout/service/layout.service';
import { AuthService } from './app/core/services/auth.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent {
    // Injected for their constructor side-effects: LayoutService applies the
    // saved theme (dark mode + slate surface) on app start. Auth is deliberately
    // NOT initialized here — the auth guard checks it per-route, so an early
    // network blip can't clear a valid token.
    private layoutService = inject(LayoutService);
    private authService = inject(AuthService);
}
