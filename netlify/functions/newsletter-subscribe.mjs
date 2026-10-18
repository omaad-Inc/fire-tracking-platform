/**
 * Netlify Function · inscription newsletter FIRE Africa → Resend.
 * À copier dans le repo omaad.africa : netlify/functions/newsletter-subscribe.mjs
 * URL résultante : POST https://omaad.africa/.netlify/functions/newsletter-subscribe
 *
 * Variables d'env à poser dans Netlify (Site configuration → Environment variables) :
 *   RESEND_API_KEY, RESEND_SEGMENT_ID, RESEND_TOPIC_ID, RESEND_FROM, RESEND_REPLY_TO, GUIDES_URL
 *
 * Body JSON attendu : { "email": "...", "firstName": "optionnel", "source": "optionnel", "website": "" }
 *   `website` = champ honeypot : s'il est rempli, c'est un bot → on répond OK sans rien faire.
 * Réponses : 200 { ok:true } · 400 { ok:false, error:"invalid_email" } · 502 { ok:false, error:"..." }
 * Simple opt-in (comme beehiiv depuis le 25/07). Déjà inscrit → 200 sans renvoyer les guides.
 */
const API = 'https://api.resend.com';
const ALLOWED_ORIGINS = ['https://omaad.africa', 'https://www.omaad.africa', 'http://localhost:4200'];

export default async (req) => {
  const origin = req.headers.get('origin') || '';
  const cors = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: cors });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });

  let body;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: 'invalid_json' }); }
  if (body.website) return json(200, { ok: true }); // honeypot

  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { ok: false, error: 'invalid_email' });
  const firstName = String(body.firstName || '').trim().slice(0, 80);
  const source = String(body.source || 'omaad.africa').slice(0, 40);

  const headers = { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' };

  // 1. Contact → segment newsletter + topic opt-in
  const c = await fetch(`${API}/contacts`, {
    method: 'POST', headers,
    body: JSON.stringify({
      email, ...(firstName && { first_name: firstName }), unsubscribed: false,
      properties: { source, subscribed_at: new Date().toISOString() },
      segments: [{ id: process.env.RESEND_SEGMENT_ID }],
      ...(process.env.RESEND_TOPIC_ID && { topics: [{ id: process.env.RESEND_TOPIC_ID, subscription: 'opt_in' }] }),
    }),
  });
  if (!c.ok) {
    const err = await c.json().catch(() => ({}));
    if (c.status === 409 || /exist/i.test(err.message || '')) return json(200, { ok: true, already: true });
    console.error('resend contacts', c.status, err);
    return json(502, { ok: false, error: 'resend_contact_failed' });
  }

  // 2. Email de bienvenue + 2 guides (transactionnel)
  const guides = process.env.GUIDES_URL || 'https://omaad.africa/fr/fire-africa/guides/';
  const w = await fetch(`${API}/emails`, {
    method: 'POST', headers,
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'Mbaye · FIRE Africa <newsletter@omaad.africa>',
      ...(process.env.RESEND_REPLY_TO && { reply_to: process.env.RESEND_REPLY_TO }),
      to: [email],
      subject: "Bienvenue 👋 tes 2 guides FIRE Africa t'attendent 🎁",
      html: welcomeHtml(guides),
    }),
  });
  if (!w.ok) console.error('resend welcome', w.status, await w.text().catch(() => ''));
  return json(200, { ok: true, welcomeSent: w.ok });
};

export const config = { path: '/api/newsletter-subscribe' }; // alias propre en plus de /.netlify/functions/...

function welcomeHtml(guides) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#E8E6E1;font-family:Inter,-apple-system,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;font-size:1px;max-height:0;overflow:hidden;">La méthode Core / Satellite + le mode d'emploi BRVM, à télécharger tout de suite.</div>
<div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#0F1A2E;padding:32px 40px;color:#fff;"><div style="font-size:22px;font-weight:800;">FIRE Africa</div><div style="color:#C77B3C;font-size:13px;letter-spacing:1px;">par Omaad</div></div>
  <div style="padding:32px 40px;color:#1A2744;font-size:16px;line-height:1.6;">
    <p>Salut 👋,</p>
    <p>Bienvenue dans <strong>FIRE Africa</strong>, et merci de ta confiance. Comme promis, voici tes <strong>2 guides gratuits</strong>, prêts à télécharger :</p>
    <p>📘 <strong>Tome 1 : La méthode Core / Satellite</strong> (le pourquoi : comment je construis un portefeuille qui dort tranquille)<br>📗 <strong>Tome 2 : Le mode d'emploi BRVM</strong> (le comment : choisir sa SGI, ouvrir ton compte, passer ton 1er ordre)</p>
    <p style="text-align:center;margin:28px 0;"><a href="${guides}" style="background:#C77B3C;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;display:inline-block;">Télécharger mes 2 guides</a></p>
    <p>Ensuite, deux éditions par mois, le 1er et le 15 : une analyse concrète, un chiffre africain, une ressource, un résumé en anglais. Ni promo, ni jargon.</p>
    <p>Mbaye</p>
    <p style="font-size:12px;color:#9C988C;">Contenu éducatif uniquement. Ceci n'est pas un conseil en investissement.</p>
  </div>
  <div style="background:#0F1A2E;padding:24px 40px;text-align:center;font-size:11px;color:#52504A;">Tu reçois cet email car tu t'es inscrit à FIRE Africa par Omaad.<br><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#8A98AE;">Se désinscrire</a></div>
</div></body></html>`;
}
