// Masks session material in text before it reaches the Logs tab.
// The Logs tab has a Copy button and bug reports ask for log lines, so
// anything that could let someone resume a VPN session must not appear.

const REDACTED = '<redacted>';

// Header values, anywhere in a line: error messages quote headers too.
const SECRET_HEADER = /\b((?:set-cookie|cookie|authorization|proxy-authorization)\s*:\s*)[^\r\n]*/gi;

// Session cookie names used by the protocols openconnect supports:
// AnyConnect (webvpn*), Juniper and Pulse (DS*), GlobalProtect, F5, Fortinet, Array.
const TOKEN_NAMES = [
  'webvpn[a-z0-9_-]*',
  'DSID', 'DSPREAUTH', 'DSSIGNIN', 'DSSignInURL',
  'authcookie', 'portal-userauthcookie', 'portal-prelogonuserauthcookie',
  'MRHSession', 'SVPNCOOKIE', 'ANsession',
];
// The value runs to `;` or whitespace. Not `&`: webvpnc values contain it
// (`bu:/&p:t&iu:1/&sh:...`), so stopping there would show the rest.
const TOKEN = new RegExp(`\\b(${TOKEN_NAMES.join('|')})=[^;\\s]*`, 'gi');

// Free text such as "Got new DSPREAUTH cookie from TNCC: <value>".
const COOKIE_PHRASE = /\b(cookie\b[^:\r\n]{0,40}:\s*)\S+/gi;

// Credentials embedded in a URL: https://user:password@host
const URL_USERINFO = /(\b[a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi;

function redactLog(text) {
  const value = text == null ? '' : String(text);
  return value
    .replace(SECRET_HEADER, `$1${REDACTED}`)
    .replace(COOKIE_PHRASE, `$1${REDACTED}`)
    .replace(TOKEN, `$1=${REDACTED}`)
    .replace(URL_USERINFO, `$1${REDACTED}@`);
}

module.exports = { redactLog };
