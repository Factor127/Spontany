#!/usr/bin/env node
// Smoke-tests prod endpoints. Run by cron or GitHub Action; exits non-zero on any failure.
// Usage: node scripts/health-check.js [--base=https://spontany.io]

const BASE = (process.argv.find(a => a.startsWith('--base=')) || '--base=https://spontany.io').slice(7);
const TIMEOUT_MS = 10_000;

const checks = [
  { name: 'landing',           path: '/',                          expect: { status: 200, contains: 'Spontany' } },
  { name: 'match page',        path: '/match',                     expect: { status: 200, contains: 'match' } },
  { name: 'onboard',           path: '/onboard.html',              expect: { status: 200 } },
  { name: 'login',             path: '/login',                     expect: { status: 200 } },
  { name: 'service worker',    path: '/sw.js',                     expect: { status: 200, contains: 'CACHE_VERSION' } },
  { name: 'manifest',          path: '/manifest.json',             expect: { status: 200, json: true } },
  { name: 'public opps API',   path: '/api/public/opportunities',  expect: { status: 200, jsonKey: 'opportunities' } },
  { name: 'admin requires auth', path: '/admin',                   expect: { status: [302, 401, 403], notContains: 'admin-dashboard' } },
  { name: 'styles.css',        path: '/styles.css',                expect: { status: 200 } },
  { name: 'logo.svg',          path: '/logo.svg',                  expect: { status: 200 } },
];

async function fetchWithTimeout(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctl.signal, redirect: 'manual' });
  } finally {
    clearTimeout(t);
  }
}

async function runOne(check) {
  const url = BASE + check.path;
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url);
    const ms = Date.now() - start;
    const exp = check.expect;
    const expectedStatuses = Array.isArray(exp.status) ? exp.status : [exp.status];
    if (!expectedStatuses.includes(res.status)) {
      return { ok: false, name: check.name, ms, reason: `status ${res.status}, expected ${expectedStatuses.join('|')}` };
    }
    if (exp.contains || exp.notContains || exp.json || exp.jsonKey) {
      const body = await res.text();
      if (exp.contains && !body.toLowerCase().includes(exp.contains.toLowerCase())) {
        return { ok: false, name: check.name, ms, reason: `body missing "${exp.contains}"` };
      }
      if (exp.notContains && body.toLowerCase().includes(exp.notContains.toLowerCase())) {
        return { ok: false, name: check.name, ms, reason: `body unexpectedly contains "${exp.notContains}"` };
      }
      if (exp.json || exp.jsonKey) {
        let parsed;
        try { parsed = JSON.parse(body); }
        catch { return { ok: false, name: check.name, ms, reason: 'invalid JSON' }; }
        if (exp.jsonKey && !(exp.jsonKey in parsed)) {
          return { ok: false, name: check.name, ms, reason: `JSON missing key "${exp.jsonKey}"` };
        }
      }
    }
    return { ok: true, name: check.name, ms };
  } catch (e) {
    return { ok: false, name: check.name, ms: Date.now() - start, reason: e.name === 'AbortError' ? `timeout >${TIMEOUT_MS}ms` : e.message };
  }
}

(async () => {
  console.log(`Health check against ${BASE}`);
  console.log(`Started ${new Date().toISOString()}\n`);
  const results = await Promise.all(checks.map(runOne));
  const failed = results.filter(r => !r.ok);
  for (const r of results) {
    const tag = r.ok ? 'PASS' : 'FAIL';
    const reason = r.ok ? '' : ` — ${r.reason}`;
    console.log(`[${tag}] ${r.name.padEnd(22)} ${String(r.ms).padStart(5)}ms${reason}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
})();
