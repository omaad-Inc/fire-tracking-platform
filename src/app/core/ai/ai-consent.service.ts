import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { TokenService, User } from '../services/token.service';

/**
 * The AI consent gate on the web (store launch, P0-1).
 *
 * Both stores expect an explicit, informed moment before an assistant reads
 * someone's financial data and sends it to a third party. The mobile app has
 * shipped that moment since day one (`lib/features/assistant/ai_consent.dart`);
 * this service is its web half, and the reason `AI_CONSENT_ENFORCED` could stay
 * false server-side until now: flipping it with no web sheet would have locked
 * every PWA user out of the assistant.
 *
 * Where the gate sits matters more than how it looks. It runs INSIDE the
 * assistant page, not on the topbar sparkle and not on a home quick action,
 * because the assistant has more doors than those two (a notification tap and
 * an `?ask=` deep link both land on /assistant) and every door added later
 * would otherwise have to remember to ask. One gate on the room, not one per
 * door.
 *
 * The consent itself lives on the server (`users.ai_consent_at`), so it
 * survives a new browser and a device swap, and it rides on the user profile
 * (`GET /auth/me`), the same payload the app already caches, so no surface
 * needs a bespoke round trip to learn where it stands.
 */
export type AiConsent =
    /** Never asked. Both timestamps absent: the app owes the user the sheet. */
    | 'unknown'
    /** Explicitly granted. The only state in which anything is sent. */
    | 'granted'
    /** Refused, or granted then withdrawn from Settings. The assistant stays
     *  REACHABLE (the page opens, the history is readable) but sends nothing. */
    | 'declined';

@Injectable({ providedIn: 'root' })
export class AiConsentService {
    private token = inject(TokenService);
    private auth = inject(AuthService);
    private api = inject(ApiService);

    /**
     * Consent as the cached profile reports it. Absence of a decision is NOT
     * consent: both fields missing reads the same as a refusal here, which is
     * also what a profile cached by a build predating the columns looks like.
     */
    readonly state = computed<AiConsent>(() => {
        const u = this.token.user();
        if (!u) return 'unknown';
        if (u.ai_consent_at) return 'granted';
        if (u.ai_consent_declined_at) return 'declined';
        return 'unknown';
    });

    /**
     * Id of the user whose consent the SERVER has confirmed in this session,
     * and the id for which it could not be reached. Both are scoped to a user
     * id rather than being plain booleans so that signing in as someone else on
     * the same device cannot inherit the previous account's verdict.
     */
    private readonly settledFor = signal<number | null>(null);
    private readonly unreachableFor = signal<number | null>(null);

    /** True once the server has answered for the CURRENT user. */
    readonly settled = computed(() => {
        const id = this.token.user()?.id ?? null;
        return id !== null && this.settledFor() === id;
    });

    /** True when the profile refresh failed for the current user (offline). */
    readonly unreachable = computed(() => {
        const id = this.token.user()?.id ?? null;
        return id !== null && this.unreachableFor() === id;
    });

    /**
     * No verdict to act on yet. Load-bearing, and the reason this is not just
     * `state() === 'unknown'`: an unrefreshed profile also reads as unknown, and
     * acting on that would show the consent sheet to someone who accepted months
     * ago, on every cold start. Read the state, but only ACT on it once the
     * server has answered.
     *
     * A cached grant is exempt: it IS a verdict we have seen (it came from a
     * server response), so a consenting user gets the room immediately instead
     * of a spinner, and a grant withdrawn elsewhere still re-gates them: the
     * background refresh below, or a 403 from the stream, takes it away again.
     */
    readonly undecided = computed(() =>
        !!this.token.user() && !this.settled() && !this.unreachable() && this.state() !== 'granted');

    /**
     * The assistant must not send anything. An unreachable profile falls through
     * to here rather than spinning forever: the gate's CTA is still the way in.
     *
     * Requires a signed-in user, deliberately: with nobody signed in there is no
     * consent question to answer, and pretending there is one would have this
     * layer quietly standing in for the auth guard. A request with no session
     * fails on its own 401, which is the honest answer to that situation.
     */
    readonly gated = computed(() =>
        !!this.token.user() && !this.undecided() && this.state() !== 'granted');

    private refreshing = false;

    /**
     * Confirm the cached consent against the server, once per session per user.
     *
     * This is the web stand-in for the mobile app's /mobile/bootstrap payload,
     * which carries consent on the very first round trip. The web app only
     * fetches /auth/me at sign-in, so a returning session paints from a profile
     * that localStorage may have been holding for weeks, hence one deliberate
     * refresh when an AI surface opens. Not a TTL cache (rule: cachedResource is
     * the only one of those): a single one-shot, and the cached user in
     * TokenService stays the one source of truth.
     */
    ensureSettled(): void {
        const id = this.token.user()?.id ?? null;
        if (id === null || this.refreshing || this.settledFor() === id) return;
        this.refreshing = true;
        this.auth.getCurrentUser().subscribe({
            next: (u) => {
                this.refreshing = false;
                this.settledFor.set(u.id);
                this.unreachableFor.set(null);
            },
            error: () => {
                this.refreshing = false;
                this.unreachableFor.set(id);
            },
        });
    }

    /**
     * Persist the answer and refresh the cached user from the response, so every
     * surface reading the profile (this gate, the Settings row) agrees at once.
     * The caller keeps the error: a consent we failed to store is not a consent,
     * so the sheet must stay up rather than open the assistant on a write that
     * never landed.
     */
    setConsent(granted: boolean): Observable<User> {
        return this.api.setAiConsent(granted).pipe(
            tap((u) => {
                this.token.setUser(u);
                this.settledFor.set(u.id);
                this.unreachableFor.set(null);
            }),
        );
    }

    /**
     * The server refused a model-touching request for want of consent (403
     * AI_CONSENT_REQUIRED). It is authoritative, so drop the local grant and
     * treat the state as settled: the room re-gates on the spot instead of
     * letting the user keep typing into a door that is shut.
     */
    markRefusedByServer(): void {
        const u = this.token.user();
        if (!u) return;
        this.token.setUser({ ...u, ai_consent_at: null });
        this.settledFor.set(u.id);
        this.unreachableFor.set(null);
    }
}
