// Run with: npm run test:unit
const test = require('node:test');
const assert = require('node:assert/strict');
const { redactLog } = require('../lib/redact');

// Shapes copied from a real ocserv login with --verbose; values replaced.
const verboseChunk = [
  'Got HTTP response: HTTP/1.1 200 OK',
  'Set-Cookie: webvpncontext=AAAAsessionAAAA=; Max-Age=300; Secure',
  'Content-Type: text/xml',
  'Set-Cookie: webvpn=<elided>; Secure',
  'Set-Cookie: webvpnc=bu:/&p:t&iu:1/&sh:0123456789ABCDEF; path=/; Secure',
  'HTTP body length:  (189)',
].join('\n');

test('Set-Cookie header value is replaced, header name kept', () => {
  assert.equal(
    redactLog('Set-Cookie: webvpncontext=AAAAsessionAAAA=; Max-Age=300; Secure'),
    'Set-Cookie: <redacted>'
  );
});

test('Cookie request header value is replaced', () => {
  assert.equal(redactLog('Cookie: webvpn=AAAA; other=1'), 'Cookie: <redacted>');
});

test('header match ignores case and leading spaces', () => {
  assert.equal(redactLog('  set-cookie:   token=abc'), '  set-cookie:   <redacted>');
});

test('webvpn tokens inside other text are replaced', () => {
  const out = redactLog('Sent cookie webvpn=SECRET1 and webvpnc=SECRET2; then webvpncontext=SECRET3');
  assert.equal(out, 'Sent cookie webvpn=<redacted> and webvpnc=<redacted>; then webvpncontext=<redacted>');
});

test('every cookie in a multi-line chunk is masked and other lines are untouched', () => {
  const out = redactLog(verboseChunk);
  assert.doesNotMatch(out, /AAAAsessionAAAA|0123456789ABCDEF/);
  assert.equal(out.split('\n').length, verboseChunk.split('\n').length);
  assert.equal(out.split('\n')[0], 'Got HTTP response: HTTP/1.1 200 OK');
  assert.equal(out.split('\n')[2], 'Content-Type: text/xml');
  assert.equal(out.split('\n')[5], 'HTTP body length:  (189)');
});

test('lines the app matches on are unchanged', () => {
  const lines = [
    'Got CONNECT response: HTTP/1.1 200 CONNECTED',
    'Configured as 10.0.0.2, with SSL + LZS connected and DTLS + LZS disabled',
    'Please enter your username.',
    'Please enter your password.',
    'Password:',
    '[EXPECT ERROR] VPN authentication failed - invalid credentials',
    'X-CSTP-Address: 10.0.0.2',
  ].join('\n');
  assert.equal(redactLog(lines), lines);
});

test('non-string input returns a string and does not throw', () => {
  assert.equal(redactLog(undefined), '');
  assert.equal(redactLog(null), '');
  assert.equal(redactLog(new Error('bad reply, Set-Cookie: x=1')), 'Error: bad reply, Set-Cookie: <redacted>');
  assert.equal(redactLog(42), '42');
});

test('session cookies of the other protocols are replaced', () => {
  const line = 'DSID=a1; DSPREAUTH=a2 DSSIGNIN=a3 authcookie=a4&portal-userauthcookie=a5 MRHSession=a6 SVPNCOOKIE=a7 ANsession=a8';
  const out = redactLog(line);
  assert.doesNotMatch(out, /a[1-8]/);
  assert.match(out, /^DSID=<redacted>; DSPREAUTH=<redacted> /);
});

test('a token value containing & is masked to its end', () => {
  const out = redactLog('sending webvpnc=bu:/&p:t&iu:1/&sh:SECRETHASH now');
  assert.equal(out, 'sending webvpnc=<redacted> now');
});

test('a cookie quoted in free text is replaced', () => {
  assert.equal(
    redactLog('Got new DSPREAUTH cookie from TNCC: 0123456789abcdef'),
    'Got new DSPREAUTH cookie from TNCC: <redacted>'
  );
});

test('Authorization headers are replaced', () => {
  assert.equal(redactLog('Authorization: Basic dXNlcjpwYXNz'), 'Authorization: <redacted>');
  assert.equal(redactLog('Proxy-Authorization: Bearer abc'), 'Proxy-Authorization: <redacted>');
});

test('a password inside a URL is replaced, the rest of the URL kept', () => {
  assert.equal(
    redactLog('Executing: sudo openconnect --server=https://alice:hunter2@vpn.example.com:443/group'),
    'Executing: sudo openconnect --server=https://<redacted>@vpn.example.com:443/group'
  );
  assert.equal(redactLog('--server=https://vpn.example.com:992'), '--server=https://vpn.example.com:992');
});

test('already redacted text is unchanged', () => {
  const once = redactLog(verboseChunk);
  assert.equal(redactLog(once), once);
});
