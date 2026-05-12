'use strict';

const crypto = require('crypto');

// Constant-time string equality. Wraps crypto.timingSafeEqual to:
//   - tolerate length mismatch (raw timingSafeEqual throws on that)
//   - tolerate null/undefined inputs
// Returns false instead of throwing, so the caller can use it in plain
// boolean conditions without try/catch.
//
// Use anywhere a request-supplied secret is being compared to a stored
// secret (admin tokens, cron secrets, signed-webhook tokens, etc.). String
// comparison via `===` is theoretically timing-leaky; over local network or
// shared infra that leak can become measurable, and free hardening here is
// cheap.
function timingSafeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    // Still do a constant-time compare against `aBuf` itself so the early
    // return doesn't itself leak length info. The result is always false.
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

module.exports = { timingSafeEq };
