import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LayoutService } from './app/layout/service/layout.service';
import { AuthService } from './app/core/services/auth.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
    // Inject LayoutService to initialize theme (dark mode + slate surface) on app start
    private layoutService = inject(LayoutService);
    private authService = inject(AuthService);

    ngOnInit(): void {
        // Don't initialize auth on startup - let the guard handle it
        // This prevents clearing valid tokens due to network issues
        // The auth guard will check authentication when routes are accessed
    }
}
