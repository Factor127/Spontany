'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const router  = express.Router();
const { db, q }  = require('../db');
const { sendEmail } = require('../utils/email');
const { createBucket, rateLimitAllow } = require('../utils/rateLimit');
const { escHtml } = require('../utils/html');

// Buckets for /api/lp/signup. Per-IP caps automated signup spam; per-email
// caps magic-link inbox bombing on a single victim. Mirrors the limits on
// /api/auth/request — same threat model, same caps.
const LP_RL_IP   = createBucket();
const LP_RL_MAIL = createBucket();

// LP registry - single source of truth for the A/B test.
// Keep in sync with AB_VARIANTS in server.js (which reads from here).
const LPs = [
  { id: 'timeback-v1',     type: 'hero',          label: 'You got your time back',     active: false, file: 'public/lp/timeback-v1/index.html' },
  { id: 'friends-demo-v1', type: 'demo',          label: 'Align friends\' schedules',  active: false, file: 'public/lp/friends-demo-v1/index.html' },
  { id: 'why-v1',          type: 'explainer',     label: 'Why Spontany exists',        active: false, file: 'public/lp/why-v1/index.html' },
  { id: 'serious-v1',      type: 'teaser-share',  label: 'Let him show he\'s serious', active: false, file: 'public/lp/serious-v1/index.html' },
  { id: 'momentum-v1',     type: 'hero',          label: 'The end of "Are you free?"', active: true,  file: 'public/lp/momentum-v1/index.html' },
  { id: 'value-v1',        type: 'hero',          label: 'Spontany — Social. No effort.', active: true,  file: 'public/lp/value-v1/index.html' },
];

function getActiveLPs() { return LPs.filter(lp => lp.active); }
function findLP(id)     { return LPs.find(lp => lp.id === id); }

// ── GET /lp/_signup - shared signup landing after CTA ─────────────────────
// Must come BEFORE /lp/:id so the param route doesn't swallow it.
router.get('/lp/_signup', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'lp', '_shared', 'signup.html'));
});

// ── Preview a specific LP, bypassing A/B assignment ────────────────────────
// Used for internal review. No cookie set, no variant injection beyond the
// forced one. Each preview renders the same HTML as real traffic would see.
router.get('/lp/:id', (req, res, next) => {
  const lp = findLP(req.params.id);
  if (!lp) return next(); // fall through to 404

  const filePath = path.join(__dirname, '..', lp.file);
  let html;
  try { html = fs.readFileSync(filePath, 'utf8'); }
  catch(e) {
    console.error('[lp preview] failed to read', lp.file, e.message);
    return res.status(500).send('LP file missing');
  }

  // Meta Pixel — injected for the /lp/:id preview route. The same snippet
  // also lives in each LP file's <head> for direct/static access; both are
  // guarded by window.__SP_PIXEL_INIT so PageView only fires once.
  const inject = `<!-- Meta Pixel (route-injected) -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
if (!window.__SP_PIXEL_INIT) {
  window.__SP_PIXEL_INIT = true;
  fbq('init', '2161239351358950');
  fbq('track', 'PageView');
}
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=2161239351358950&ev=PageView&noscript=1"/></noscript>
<script>
window.__LP_ID='${lp.id}';
window.__LP_TYPE='${lp.type}';
window.__LP_PREVIEW=true;
sessionStorage.setItem('sa_variant','${lp.id}');
</script>
<script src="/sa.js"></script>
<script src="/lp/_shared/lp-tracker.js"></script>`;

  html = html.replace('</head>', inject + '\n</head>');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(html);
});

// ── LP preview index - list all LPs with preview links + live stats ───────
router.get('/lp', (req, res) => {
  const rows = LPs.map(lp => {
    const stats = db.prepare(`
      SELECT
        COUNT(DISTINCT CASE WHEN event='lp_view'        THEN session_id END) AS views,
        COUNT(DISTINCT CASE WHEN event='lp_cta_click'   THEN session_id END) AS cta_clicks,
        COUNT(DISTINCT CASE WHEN event='signup_submit'  THEN session_id END) AS signups,
        COUNT(DISTINCT CASE WHEN event='nudge_scheduled'THEN session_id END) AS nudges
      FROM analytics_events
      WHERE json_extract(props, '$.variant') = ?
    `).get(lp.id) || {};
    return { ...lp, ...stats };
  });

  res.set('Content-Type', 'text/html');
  res.send(`<!doctype html>
<html><head><meta charset="utf-8"><title>LP Index - Spontany</title>
<script src="https://t.contentsquare.net/uxa/c6f898e9cb3d8.js"></script>
<style>
  body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 40px; }
  h1 { margin: 0 0 24px; font-size: 22px; }
  table { width: 100%; border-collapse: collapse; background: #111; border-radius: 8px; overflow: hidden; }
  th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #222; font-size: 14px; }
  th { background: #1a1a1a; font-weight: 600; color: #aaa; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
  tr:last-child td { border-bottom: 0; }
  a { color: #c4d630; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .inactive { opacity: 0.4; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; background: #222; color: #aaa; }
  .pill.hero     { background: #1a2638; color: #7dd3fc; }
  .pill.demo     { background: #1f2d1a; color: #a3e635; }
  .pill.explainer{ background: #2a1f38; color: #c4b5fd; }
  .pill.teaser-share { background: #381a2a; color: #fda4af; }
</style></head><body>
<h1>Spontany LP test - active: ${getActiveLPs().length}/${LPs.length}</h1>
<table>
<thead><tr><th>ID</th><th>Label</th><th>Type</th><th>Views</th><th>CTA%</th><th>Signup%</th><th>Nudges</th><th>Preview</th></tr></thead>
<tbody>
${rows.map(r => {
  const ctr     = r.views > 0 ? ((r.cta_clicks / r.views) * 100).toFixed(1) : '-';
  const convert = r.views > 0 ? ((r.signups / r.views) * 100).toFixed(1) : '-';
  return `<tr class="${r.active ? '' : 'inactive'}">
    <td><code>${r.id}</code></td>
    <td>${r.label}</td>
    <td><span class="pill ${r.type}">${r.type}</span></td>
    <td>${r.views || 0}</td>
    <td>${ctr}${ctr !== '-' ? '%' : ''}</td>
    <td>${convert}${convert !== '-' ? '%' : ''}</td>
    <td>${r.nudges || 0}</td>
    <td><a href="/lp/${r.id}" target="_blank">open →</a></td>
  </tr>`;
}).join('')}
</tbody></table>
</body></html>`);
});

// ── POST /api/lp/signup ───────────────────────────────────────────────────
// Unified signup endpoint — captures email + name with full LP attribution,
// then mints a magic-link token so the LP CTA flows straight into /setup.
// No waitlist gate: early-access users go directly into onboarding.
router.post('/api/lp/signup', async (req, res) => {
  const b = req.body || {};
  const email = (b.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'invalid_email' });

  // Rate limit before doing anything that mints a magic link or hits Resend.
  const ip = req.ip || 'unknown';
  if (!rateLimitAllow(LP_RL_IP,   ip,    10 * 60 * 1000, 10) ||
      !rateLimitAllow(LP_RL_MAIL, email, 60 * 60 * 1000, 3)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a few minutes before trying again.' });
  }

  const first_name = (b.first_name || '').trim().slice(0, 40) || null;

  // Track signup in dedicated table (survives analytics resets + has UTM attribution)
  try {
    db.prepare(`
      INSERT INTO lp_signups
        (session_id, variant, email, first_name,
         utm_source, utm_medium, utm_campaign, utm_content, utm_term,
         fbclid, ttclid, gclid, referrer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.session_id || null,
      b.variant || null,
      email,
      first_name,
      b.utm_source   || null,
      b.utm_medium   || null,
      b.utm_campaign || null,
      b.utm_content  || null,
      b.utm_term     || null,
      b.fbclid       || null,
      b.ttclid       || null,
      b.gclid        || null,
      b.referrer     || null,
    );
  } catch(e) {
    console.error('[lp signup] insert failed:', e.message);
  }

  // Mint a magic link and EMAIL it. Never return the verify URL in the
  // response — doing so would let anyone claim any email's account by simply
  // POSTing the email and following the returned link, completely bypassing
  // the email-ownership proof that magic-link auth is supposed to provide.
  let linkToken;
  try {
    const existing = q.getUserByEmail.get(email);
    linkToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    q.createMagicLink.run(linkToken, email, existing?.id || null, expiresAt);
  } catch(e) {
    console.error('[lp signup] magic link failed:', e.message);
    return res.status(500).json({ error: 'signup_failed' });
  }

  // Build the verify URL using BASE_URL (NOT req.headers.host, which is
  // attacker-controllable). server.js refuses to boot in prod without it.
  const BASE_URL  = req.app.locals.BASE_URL;
  const verifyUrl = `${BASE_URL}/api/auth/verify/${linkToken}`;
  const greetText = first_name ? `Hi ${first_name},`            : 'Hi there,';
  const greetHtml = first_name ? `Hi ${escHtml(first_name)},`    : 'Hi there,';
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#202124;">
      <img src="${BASE_URL}/icon-192.png" width="48" height="48" alt="Spontany" style="border-radius:12px;display:block;margin:0 0 10px;">
      <h1 style="font-size:22px;font-weight:800;margin:0 0 4px;color:#0a0a0a;">Spontany</h1>
      <p style="color:#5f6368;margin:0 0 24px;font-size:14px;">Finds your moments — before they slip away.</p>
      <p style="margin:0 0 18px;">${greetHtml}</p>
      <p style="margin:0 0 20px;">Tap below to set up your Spontany calendar — no password needed.</p>
      <a href="${verifyUrl}"
         style="display:inline-block;background:#1a73e8;color:#fff;padding:13px 28px;border-radius:8px;
                text-decoration:none;font-weight:700;font-size:15px;margin-bottom:24px;">
        Set up my calendar →
      </a>
      <p style="color:#5f6368;font-size:13px;margin:0;">
        This link expires in 24 hours and can only be used once.<br>
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
  const bodyText = `${greetText}\n\nTap to set up your Spontany calendar (no password needed):\n${verifyUrl}\n\nThis link expires in 24 hours and can only be used once. If you didn't request this, you can safely ignore this email.`;

  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmail({ to: email, subject: 'Set up your Spontany calendar', html, bodyText });
    } catch(e) {
      console.error('[lp signup] email send failed:', e?.message || e);
      // Don't surface the failure as success — the user has no way to log in
      // without the email. Better to ask them to try again.
      return res.status(502).json({ error: 'email_failed' });
    }
  } else {
    // Dev/local fallback: print the link to the server console. Mirrors
    // routes/auth.js. Never returned in the response — that's the bug we're
    // fixing.
    console.log(`\n📧 LP SIGNUP MAGIC LINK (email not configured - copy this into your browser):`);
    console.log(`   ${verifyUrl}\n`);
  }

  res.json({ ok: true, sent: true });
});

module.exports = router;
module.exports.LPs = LPs;
module.exports.getActiveLPs = getActiveLPs;
module.exports.findLP = findLP;
