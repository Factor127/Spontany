const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Dev/web-only same-origin fetch endpoint. The web build can't fetch third-party
// pages directly (CORS); this dev-server middleware does the fetch in Node (no
// CORS) and returns the raw HTML at /ogfetch?url=... The native build never hits
// this — it fetches pages directly. Restart `expo start` after editing this file.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const prevEnhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const base = prevEnhance ? prevEnhance(middleware, server) : middleware;
  return (req, res, next) => {
    if (req.url && req.url.startsWith('/ogfetch?')) {
      let target = null;
      try {
        target = new URL(req.url, 'http://localhost').searchParams.get('url');
      } catch (e) {
        target = null;
      }
      if (!target) {
        res.statusCode = 400;
        res.end('missing url');
        return;
      }
      fetch(target, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } })
        .then(async (r) => {
          const text = await r.text();
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(text);
        })
        .catch((e) => {
          res.statusCode = 502;
          res.end(String(e));
        });
      return;
    }
    return base(req, res, next);
  };
};

module.exports = config;
