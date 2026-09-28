// Run with: npm run test:unit
const test = require('node:test');
const assert = require('node:assert/strict');
const { createLineLogger } = require('../lib/line-logger');
const { redactLog } = require('../lib/redact');

// Mirrors main.js: every emitted piece is redacted on its way to the window.
function capture(options) {
  const shown = [];
  const logger = createLineLogger((text) => shown.push(redactLog(text)), options);
  return { shown, logger, all: () => shown.join('') };
}

test('a cookie split across chunks is masked as a whole', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { logger, all } = capture();
  logger.write('Got HTTP response: HTTP/1.1 200 OK\nSet-Cookie: webv');
  logger.write('pn=SECRETVALUE; Secure\n');
  assert.doesNotMatch(all(), /SECRETVALUE/);
  assert.match(all(), /Set-Cookie: <redacted>/);
});

test('every split point of a secret line leaks nothing', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const line = 'Set-Cookie: webvpncontext=SECRETVALUE; Max-Age=300\n';
  for (let i = 1; i < line.length; i += 1) {
    const { logger, all } = capture();
    logger.write(line.slice(0, i));
    logger.write(line.slice(i));
    assert.doesNotMatch(all(), /SECRET|VALUE/, `leaked when split at ${i}`);
  }
});

test('a prompt without a newline is shown after the stream goes quiet', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { logger, shown } = capture({ flushMs: 250 });
  logger.write('Please enter your password.\nPassword:');
  assert.deepEqual(shown, ['Please enter your password.\n']);
  t.mock.timers.tick(249);
  assert.equal(shown.length, 1);
  t.mock.timers.tick(1);
  assert.deepEqual(shown, ['Please enter your password.\n', 'Password:']);
});

test('flush emits what is left, and nothing twice', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { logger, shown } = capture();
  logger.write('partial');
  logger.flush();
  logger.flush();
  t.mock.timers.tick(1000);
  assert.deepEqual(shown, ['partial']);
});

test('text is passed through unchanged apart from grouping', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { logger, all } = capture();
  const text = 'POST https://vpn.example.com/\nConnected to 192.0.2.1:443\nGot CONNECT response: HTTP/1.1 200 CONNECTED\n';
  for (const piece of text.match(/.{1,7}/gs)) logger.write(piece);
  logger.flush();
  assert.equal(all(), text);
});
