// Both Volcengine HTTP chunks and our safe client envelope are newline-delimited JSON.
// Keep partial JSON and UTF-8 across arbitrary network packet boundaries.
export async function* jsonLines(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const next = await reader.read();
      pending += next.done ? decoder.decode() : decoder.decode(next.value, { stream: true });
      let end: number;
      while ((end = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, end).trim();
        pending = pending.slice(end + 1);
        if (line) yield JSON.parse(line) as Record<string, unknown>;
      }
      if (pending.length > 2_000_000) throw new Error('语音响应过大。');
      if (next.done) { if (pending.trim()) yield JSON.parse(pending) as Record<string, unknown>; break; }
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
