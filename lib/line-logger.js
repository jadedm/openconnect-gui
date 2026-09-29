// Collects a process's output into whole lines before it is logged.
// Pipe chunks split at arbitrary points, so redacting chunk by chunk can let
// `Set-Cookie: webv` and `pn=SECRET` through as two harmless-looking pieces.
// Prompts such as `Password:` never end in a newline, so a partial line is
// flushed once the stream has been quiet for `flushMs`.

function createLineLogger(emit, { flushMs = 250 } = {}) {
  let pending = '';
  let timer = null;

  function flush() {
    clearTimeout(timer);
    timer = null;
    if (!pending) return;
    const out = pending;
    pending = '';
    emit(out);
  }

  function write(chunk) {
    pending += chunk == null ? '' : String(chunk);
    const lastNewline = pending.lastIndexOf('\n');
    if (lastNewline >= 0) {
      const complete = pending.slice(0, lastNewline + 1);
      pending = pending.slice(lastNewline + 1);
      emit(complete);
    }
    clearTimeout(timer);
    timer = pending ? setTimeout(flush, flushMs) : null;
  }

  return { write, flush };
}

module.exports = { createLineLogger };
