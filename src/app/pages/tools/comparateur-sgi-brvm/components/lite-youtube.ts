import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Façade YouTube légère (pattern « lite-youtube ») : au chargement on ne rend
 * qu'une miniature `<img>` + bouton play — l'iframe (lourde, bloquante) n'est
 * injectée qu'au clic. Indispensable pour le budget perf mobile de la page SEO.
 */
@Component({
    selector: 'app-lite-youtube',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="relative aspect-video w-full overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-900">
            @if (!activated()) {
                <img [src]="thumbnail()" [alt]="videoTitle()" loading="lazy" decoding="async"
                     class="absolute inset-0 h-full w-full object-cover" width="480" height="360" />
                <button type="button" (click)="activated.set(true)"
                        class="group absolute inset-0 flex h-full w-full cursor-pointer items-center justify-center"
                        [attr.aria-label]="'Lire la vidéo : ' + videoTitle()">
                    <span class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-700/90 shadow-lifted transition-transform group-hover:scale-110">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                            <path d="M8 5.14v13.72L19 12 8 5.14z"/>
                        </svg>
                    </span>
                </button>
            } @else {
                <iframe class="absolute inset-0 h-full w-full" [src]="embedUrl()" [title]="videoTitle()"
                        frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen></iframe>
            }
        </div>
        <p class="mt-2 text-sm font-medium text-surface-700 dark:text-surface-300">{{ videoTitle() }}</p>
    `
})
export class LiteYoutube {
    private sanitizer = inject(DomSanitizer);

    videoId = input.required<string>();
    videoTitle = input.required<string>();

    activated = signal(false);
    thumbnail = computed(() => `https://i.ytimg.com/vi/${this.videoId()}/hqdefault.jpg`);
    embedUrl = computed<SafeResourceUrl>(() =>
        this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${this.videoId()}?autoplay=1`)
    );
}
