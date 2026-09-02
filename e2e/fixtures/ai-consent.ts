import { expect, Page } from '@playwright/test';

/**
 * Clear the AI consent gate (P0-1) for the signed-in account.
 *
 * Every assistant surface now sits behind an explicit consent, so a smoke that
 * wants to exercise the CHAT has to get past the gate first. It grants through
 * the API rather than by clicking the sheet on purpose: the gate has its own
 * spec (`ai-consent.smoke.spec.ts`) and one owner is enough, so these smokes
 * stay about what they actually test.
 *
 * Call after login, before navigating to /assistant.
 */
export async function grantAiConsent(page: Page): Promise<void> {
    const api = process.env.E2E_API_URL || 'http://localhost:8000/api/v1';
    // The access token lives in memory only, so mint a fresh one the way the
    // app does: exchange the refresh cookie this session already holds.
    const refresh = await page.request.post(`${api}/auth/refresh`, { data: {} });
    expect(refresh.ok(), 'consent fixture needs a live session').toBeTruthy();
    const token = (await refresh.json()).access_token as string;

    const res = await page.request.put(`${api}/users/me/ai-consent`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { granted: true },
    });
    expect(res.ok(), 'could not grant AI consent').toBeTruthy();
}
