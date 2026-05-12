'use strict';

// Minimal HTML escape for user-controlled strings spliced into email bodies
// or any other server-rendered HTML. Always use this on values that came
// from req.body / DB columns the user can write (names, messages, titles)
// before interpolating into a backtick string. Mail clients render HTML, so
// unescaped names like `<a href=...>` become live phishing links sent FROM
// our verified domain.
function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

module.exports = { escHtml };
