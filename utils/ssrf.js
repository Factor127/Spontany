'use strict';

// Shared SSRF guard for every endpoint that fetches a user-supplied URL.
//
// Threat model: any logged-in (or anonymous) user can submit a URL to
//   /api/unfurl, /api/ical/import, /api/pulse, /api/pulse/preview, and the
//   opportunity ingestion paths. Without a guard they can:
//   1. Hit Railway's internal services (sidecars, sibling apps).
//   2. Hit cloud metadata endpoints (169.254.169.254 etc.) and exfiltrate
//      IAM creds.
//   3. Hit private IPs reachable from the dyno (loopback, ULA).
//
// The previous version only validated the hostname STRING. That's bypassed by:
//   a. DNS rebinding — attacker registers `evil.tld` resolving to 127.0.0.1.
//   b. Following a redirect that lands on a private IP.
//   c. IPv4-mapped IPv6 (`::ffff:7f00:1`) and similar exotic literals.
//
// This version resolves the hostname, validates every resulting IP, follows
// redirects manually with re-validation at each hop, and bounds the response
// size so a malicious endpoint can't OOM the server with a slow drip.

const dns = require('dns').promises;
const net = require('net');

// IPv4 ranges treated as off-limits.
const PRIVATE_V4 = [
  ['10.0.0.0',     8],   // RFC 1918
  ['127.0.0.0',    8],   // loopback
  ['169.254.0.0', 16],   // link-local (incl. cloud metadata 169.254.169.254)
  ['172.16.0.0',  12],   // RFC 1918
  ['192.168.0.0', 16],   // RFC 1918
  ['100.64.0.0',  10],   // RFC 6598 CGNAT
  ['0.0.0.0',      8],   // unspecified / "this network"
  ['224.0.0.0',    4],   // multicast
  ['240.0.0.0',    4],   // reserved (incl. broadcast 255.255.255.255)
];

function ipv4ToInt(ip) {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const p = m.slice(1).map(Number);
  if (p.some(n => n < 0 || n > 255)) return null;
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}

function isPrivateIPv4(ip) {
  const n = ipv4ToInt(ip);
  if (n == null) return true; // unparseable → treat as private
  for (const [start, mask] of PRIVATE_V4) {
    const startN = ipv4ToInt(start);
    const maskN  = mask === 0 ? 0 : ((0xFFFFFFFF << (32 - mask)) >>> 0);
    if ((n & maskN) === (startN & maskN)) return true;
  }
  return false;
}

function isPrivateIPv6(ip) {
  const lc = ip.toLowerCase();
  // IPv4-mapped (::ffff:x.x.x.x) — most common bypass attempt.
  const m4 = lc.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (m4) return isPrivateIPv4(m4[1]);
  // Loopback / unspecified.
  if (lc === '::1' || lc === '::') return true;
  // ULA fc00::/7 (fc..., fd...), link-local fe80::/10 (fe8..feb), multicast ff00::/8.
  if (/^fc/.test(lc) || /^fd/.test(lc) || /^fe[89ab]/.test(lc) || /^ff/.test(lc)) return true;
  return false;
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unrecognised → block
}

// Synchronous, string-only guard. Kept exported for back-compat — but the
// async resolvePublicHttpUrl is preferred everywhere because it also catches
// hostnames whose A record points at a private IP (DNS rebinding).
function isPrivateHost(host) {
  if (!host) return true;
  const h = host.toLowerCase();
  if (h === 'localhost' || h === 'metadata.google.internal') return true;
  if (h.startsWith('[')) {
    const ip = h.slice(1, h.indexOf(']'));
    return isPrivateIPv6(ip);
  }
  if (net.isIPv4(h)) return isPrivateIPv4(h);
  return false;
}

function _err(code) { const e = new Error(code); e.code = code; return e; }

function assertPublicHttpUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw _err('invalid_url'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw _err('blocked_scheme');
  if (isPrivateHost(u.hostname)) throw _err('blocked_host');
  return u;
}

// Like assertPublicHttpUrl but also resolves the hostname and rejects if any
// returned address is private. This is the only safe pre-fetch check.
async function resolvePublicHttpUrl(rawUrl) {
  const u = assertPublicHttpUrl(rawUrl);
  if (net.isIP(u.hostname)) return u; // raw IP already validated above
  let addrs;
  try {
    addrs = await dns.lookup(u.hostname, { all: true, verbatim: true });
  } catch { throw _err('dns_failed'); }
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw _err('blocked_host');
  }
  return u;
}

// Read up to maxBytes from resp.body, aborting if exceeded. Decodes as UTF-8.
async function readBoundedText(resp, maxBytes) {
  if (!resp.body) return '';
  const reader = resp.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch {}
      throw _err('response_too_large');
    }
    chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Default response-body cap. 4MB is roomy for OG-tag pages and ICS feeds
// while still bounding memory if a malicious server slow-drips a 1GB stream.
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;

// SSRF-safe fetch:
//   • Resolves+validates the URL before any network traffic.
//   • redirect:'manual' and re-validates every Location target.
//   • Caps total redirects so an attacker can't keep us bouncing forever.
//   • Caps response body size (default 4MB).
//
// Returns { resp, text, finalUrl }. `text` is the body decoded as UTF-8.
// `finalUrl` is the URL we actually fetched the body from (post-redirects).
async function safeFetch(rawUrl, opts = {}) {
  const {
    maxRedirects = 5,
    maxBytes     = DEFAULT_MAX_BYTES,
    headers,
    timeoutMs    = 8000,
    method       = 'GET',
  } = opts;

  let url = await resolvePublicHttpUrl(rawUrl);
  let redirects = 0;
  while (true) {
    const resp = await fetch(url.href, {
      method,
      headers,
      redirect: 'manual',
      signal:   AbortSignal.timeout(timeoutMs),
    });

    const loc = resp.headers.get('location');
    if (resp.status >= 300 && resp.status < 400 && loc) {
      if (++redirects > maxRedirects) {
        try { await resp.body?.cancel(); } catch {}
        throw _err('too_many_redirects');
      }
      // Free the socket before issuing the next request.
      try { await resp.body?.cancel(); } catch {}
      const next = new URL(loc, url.href).href;
      url = await resolvePublicHttpUrl(next);
      continue;
    }

    const text = await readBoundedText(resp, maxBytes);
    return { resp, text, finalUrl: url.href };
  }
}

module.exports = {
  isPrivateHost,
  assertPublicHttpUrl,
  resolvePublicHttpUrl,
  readBoundedText,
  safeFetch,
};
