import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ShareContextService } from './share-context.service';

/**
 * Builds router links that resolve correctly in BOTH the normal authenticated
 * app (prefixed with the active locale, e.g. /fr/...) and the public shared
 * portfolio (prefixed with /share/<token>/...). Every nav-link builder in the
 * shell and pages should go through this so a shared session never produces a
 * dead /fr/... link that would bounce a logged-out visitor to the login page.
 */
@Injectable({ providedIn: 'root' })
export class NavService {
    private share = inject(ShareContextService);
    private router = inject(Router);

    currentLang(): 'fr' | 'en' {
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        const m = path.match(/^\/(fr|en)(\/|$)/);
        return (m ? m[1] : 'fr') as 'fr' | 'en';
    }

    /** Absolute base segments: ['/share', token] in share mode, else ['/', lang]. */
    base(): any[] {
        return this.share.active() ? ['/share', this.share.token()] : ['/', this.currentLang()];
    }

    /** base + extra segments, e.g. link('pages','patrimoine') → ['/fr','pages','patrimoine']. */
    link(...segments: any[]): any[] {
        return [...this.base(), ...segments];
    }

    go(...segments: any[]): Promise<boolean> {
        return this.router.navigate(this.link(...segments));
    }
}
