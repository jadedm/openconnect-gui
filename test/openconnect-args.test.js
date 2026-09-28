// Run with: npm run test:unit
// main.js builds the openconnect arguments inline, so this reads its source.
// --verbose makes openconnect print HTTP headers, session cookies included (#37).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mainSource = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const code = mainSource.replace(/\/\/.*$/gm, '');

test('main.js does not pass --verbose or -v to openconnect', () => {
  assert.doesNotMatch(code, /['"`](?:--verbose|-v)['"`]/);
});

test('process output is logged through the line buffers, not chunk by chunk', () => {
  assert.doesNotMatch(code, /sendLog\(\s*output\s*\)/);
  assert.match(code, /stdoutLog\.write\(output\)/);
  assert.match(code, /stderrLog\.write\(output\)/);
});

test('main.js still builds the arguments this test reads', () => {
  assert.match(code, /args\.push\(\s*['"`]--dtls-ciphers['"`]/);
});
