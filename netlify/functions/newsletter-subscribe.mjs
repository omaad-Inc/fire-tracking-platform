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
  const contactBody = {
    email, ...(firstName && { first_name: firstName }), unsubscribed: false,
    segments: [{ id: process.env.RESEND_SEGMENT_ID }],
    ...(process.env.RESEND_TOPIC_ID && { topics: [{ id: process.env.RESEND_TOPIC_ID, subscription: 'opt_in' }] }),
  };
  const createContact = (extra) => fetch(`${API}/contacts`, { method: 'POST', headers, body: JSON.stringify({ ...contactBody, ...extra }) });
  // « Déjà inscrit » : 409, ou un message du type "already exists" / "duplicate".
  // Jamais quand Resend parle d'une propriété ou dit "does not exist" (c'est
  // un refus de payload, pas un doublon : il ne faut surtout pas répondre OK).
  const alreadyExists = (status, err) => {
    const m = err.message || '';
    if (/propert|not exist/i.test(m)) return false;
    return status === 409 || /exist|already|duplicate/i.test(m);
  };

  // Les propriétés custom (`source`, `subscribed_at`) doivent exister au préalable
  // dans Resend (Contacts → Properties), sinon l'appel ENTIER échoue. On tente
  // avec, et si Resend refuse pour une autre raison que « déjà inscrit », on
  // réessaie sans : l'inscription ne doit jamais dépendre d'un champ de suivi.
  let c = await createContact({ properties: { source, subscribed_at: new Date().toISOString() } });
  if (!c.ok) {
    const err = await c.json().catch(() => ({}));
    if (alreadyExists(c.status, err)) return json(200, { ok: true, already: true });
    console.warn('resend contacts (with properties)', c.status, err, '→ retry without properties');
    c = await createContact({});
    if (!c.ok) {
      const err2 = await c.json().catch(() => ({}));
      if (alreadyExists(c.status, err2)) return json(200, { ok: true, already: true });
      console.error('resend contacts', c.status, err2);
      return json(502, { ok: false, error: 'resend_contact_failed', resend_status: c.status });
    }
  }

  // 2. Email de bienvenue + 2 guides (transactionnel).
  // Écrit comme un mot personnel, pas comme une campagne : expéditeur humain,
  // objet sans emoji, fond blanc, liens simples, partie texte, pas d'image ni
  // de bouton. C'est ce qui le garde dans l'onglet principal de Gmail plutôt
  // qu'en « Promotions ». La désinscription un clic (RESEND_UNSUBSCRIBE_URL)
  // n'existe que dans les Broadcasts : ici, un en-tête List-Unsubscribe mailto
  // + une ligne « réponds stop ».
  const guides = process.env.GUIDES_URL || 'https://omaad.africa/fr/fire-africa/guides/';
  const replyTo = process.env.RESEND_REPLY_TO || 'contact@omaad.africa';
  const w = await fetch(`${API}/emails`, {
    method: 'POST', headers,
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'Mbaye de FIRE Africa <mbaye@omaad.africa>',
      reply_to: replyTo,
      to: [email],
      subject: 'Tes 2 guides FIRE Africa',
      html: welcomeHtml(guides, firstName),
      text: welcomeText(guides, firstName),
      headers: { 'List-Unsubscribe': `<mailto:${replyTo}?subject=stop>` },
    }),
  });
  if (!w.ok) console.error('resend welcome', w.status, await w.text().catch(() => ''));
  return json(200, { ok: true, welcomeSent: w.ok });
};

export const config = { path: '/api/newsletter-subscribe' }; // alias propre en plus de /.netlify/functions/...

const SITE = 'https://omaad.africa';
const TOME1_URL = `${SITE}/guides/fire-africa-tome1-core-satellite.pdf`;
const TOME2_URL = `${SITE}/guides/fire-africa-tome2-mode-emploi-brvm.pdf`;
const TOME1 = 'Tome 1 : La méthode Core / Satellite';
const TOME1_DESC = 'le pourquoi : comment je construis un portefeuille qui dort tranquille';
const TOME2 = 'Tome 2 : Le mode d\'emploi BRVM';
const TOME2_DESC = 'le comment : choisir ta SGI, ouvrir ton compte, passer ton 1er ordre';
const NEXT = 'Ensuite, deux éditions par mois, le 1er et le 15 : une analyse concrète, un chiffre africain, une ressource, un résumé en anglais. Ni promo, ni jargon.';
const REPLY = 'Une question ? Réponds simplement à cet email, je lis tout.';
const DISCLAIMER = 'Contenu éducatif uniquement. Ceci n\'est pas un conseil en investissement.';
const WHY = 'Tu reçois cet email parce que tu t\'es inscrit à FIRE Africa par Omaad. Tu ne veux plus le recevoir ? Réponds « stop » à cet email.';

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const greeting = (firstName) => (firstName ? `Salut ${firstName},` : 'Salut,');

function welcomeText(guides, firstName) {
  return [
    greeting(firstName),
    '',
    'Bienvenue dans FIRE Africa, et merci de ta confiance. Comme promis, voici tes 2 guides :',
    '',
    `${TOME1} (${TOME1_DESC})`,
    TOME1_URL,
    '',
    `${TOME2} (${TOME2_DESC})`,
    TOME2_URL,
    '',
    `Les deux restent disponibles ici : ${guides}`,
    '',
    NEXT,
    '',
    REPLY,
    '',
    'Mbaye',
    'FIRE Africa par Omaad',
    '',
    '--',
    DISCLAIMER,
    WHY,
  ].join('\n');
}

function welcomeHtml(guides, firstName) {
  const link = (href, label) => `<a href="${href}" style="color:#A1602D;text-decoration:underline;">${label}</a>`;
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;padding:28px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1A2740;">
  <p style="margin:0 0 16px;">${escapeHtml(greeting(firstName))}</p>
  <p style="margin:0 0 16px;">Bienvenue dans FIRE Africa, et merci de ta confiance. Comme promis, voici tes 2 guides :</p>
  <p style="margin:0 0 12px;">${link(TOME1_URL, TOME1)}<br><span style="color:#52504A;">${TOME1_DESC}</span></p>
  <p style="margin:0 0 16px;">${link(TOME2_URL, TOME2)}<br><span style="color:#52504A;">${TOME2_DESC}</span></p>
  <p style="margin:0 0 16px;color:#52504A;">Les deux restent disponibles ici : ${link(guides, guides.replace(/^https?:\/\//, ''))}</p>
  <p style="margin:0 0 16px;">${NEXT}</p>
  <p style="margin:0 0 24px;">${REPLY}</p>
  <p style="margin:0 0 28px;">Mbaye<br><span style="color:#6E6A60;">FIRE Africa par Omaad</span></p>
  <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#9C988C;">${DISCLAIMER}</p>
  <p style="margin:0;font-size:12px;line-height:1.5;color:#9C988C;">${WHY}</p>
</div></body></html>`;
}
