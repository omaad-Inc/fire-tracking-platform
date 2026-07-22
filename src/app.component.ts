import { Component, HostListener, inject } from '@angular/core';
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

    // Guard against accidental file drops OUTSIDE a real dropzone: the browser's
    // default is to navigate to the dropped file, which unloads the SPA and
    // drops the in-memory session (looks like a logout). Only files are blocked,
    // so other drag interactions (sortable lists, etc.) are untouched. Real
    // dropzones stopPropagation, so this never sees their drops.
    private isFileDrag(ev: DragEvent): boolean {
        return Array.from(ev.dataTransfer?.types ?? []).includes('Files');
    }
    @HostListener('window:dragover', ['$event'])
    onWindowDragOver(ev: DragEvent) { if (this.isFileDrag(ev)) ev.preventDefault(); }
    @HostListener('window:drop', ['$event'])
    onWindowDrop(ev: DragEvent) { if (this.isFileDrag(ev)) ev.preventDefault(); }
}
