const RETRY_DELAYS_MS = [500, 1_500, 3_000] as const;

const TRANSIENT_FAILURE = /network(?:error| error)?|failed to fetch|fetch failed|load failed|net::err_|econnreset|econnrefused|etimedout|socket hang up|timed out|timeout|超时|\b(?:http(?:\/\d(?:\.\d)?)?|responded with)\s+(?:408|425|429|500|502|503|504)\b|\bstatus(?: code)?\s*[:=]?\s*(?:408|425|429|500|502|503|504)\b/i;

/** Return a bounded backoff for transient initialization failures, or null. */
export function automaticSceneRetryDelay(reason: unknown, retriesAlreadyAttempted: number): number | null {
  if (retriesAlreadyAttempted >= RETRY_DELAYS_MS.length) return null;

  const message = reason instanceof Error
    ? `${reason.name}: ${reason.message}`
    : String(reason);

  // Renderer and context failures are handled by the browser's native context
  // restoration path. Parse, unsupported-resource, and missing-file errors are
  // permanent until the user changes the environment or retries manually.
  if (/aborterror|not supported|unsupported|webgl|context\s+(?:lost|restor|creation)/i.test(message)) return null;
  if (!TRANSIENT_FAILURE.test(message)) return null;

  return RETRY_DELAYS_MS[retriesAlreadyAttempted] ?? null;
}
