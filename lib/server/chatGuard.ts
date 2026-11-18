/**
 * Cost protection for the text-chat route.
 *
 * In-memory and per server instance (the TTS route uses the same pattern).
 * This is a cost floor, not a distributed quota: production accounts should
 * also set provider-side quotas. It exists because /api/chat can call a paid
 * model and the Phase 1 public test exposure showed no rate limit at all.
 */
export interface ChatGuardDecision {
  ok: boolean;
  reason?: 'ip-rate' | 'global-rate';
}

export interface ChatGuardOptions {
  perMinute?: number;
  globalPerMinute?: number;
}

export interface ChatGuard {
  check(request: Request, now?: number): ChatGuardDecision;
  snapshot(now?: number): { ips: number; globalCount: number };
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** Best-effort client address from the same headers the TTS route already trusts. */
export function clientAddress(request: Request): string {
  const headers = request.headers;
  return (
    headers.get('x-nf-client-connection-ip') ??
    headers.get('x-real-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'local'
  );
}

export function createChatGuard(options: ChatGuardOptions = {}): ChatGuard {
  const perMinute = options.perMinute ?? positiveInteger(process.env.CHAT_PER_MINUTE, 12);
  const globalPerMinute = options.globalPerMinute ?? positiveInteger(process.env.CHAT_GLOBAL_PER_MINUTE, 80);
  const buckets = new Map<string, { count: number; until: number }>();
  let global = { count: 0, until: 0 };

  return {
    check(request, now = Date.now()) {
      for (const [key, entry] of buckets) if (entry.until <= now) buckets.delete(key);
      if (buckets.size > 20000) buckets.clear();

      if (global.until <= now) global = { count: 0, until: now + 60_000 };
      if (global.count >= globalPerMinute) return { ok: false, reason: 'global-rate' };

      const ip = clientAddress(request);
      const bucket = buckets.get(ip) ?? { count: 0, until: now + 60_000 };
      if (bucket.count >= perMinute) return { ok: false, reason: 'ip-rate' };

      bucket.count += 1;
      buckets.set(ip, bucket);
      global.count += 1;
      return { ok: true };
    },
    snapshot(now = Date.now()) {
      for (const [key, entry] of buckets) if (entry.until <= now) buckets.delete(key);
      return { ips: buckets.size, globalCount: global.until > now ? global.count : 0 };
    },
  };
}
