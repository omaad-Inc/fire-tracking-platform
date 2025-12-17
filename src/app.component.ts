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
        // Initialize auth state on app startup
        // This validates tokens and refreshes user data if needed
        this.authService.initAuth().subscribe({
            error: (err) => {
                // Silently handle errors - token will be cleared if invalid
                console.debug('Auth initialization:', err);
            }
        });
    }
}
