const DECART_API_BASE = 'https://api.decart.ai/v1';

export type DecartAccountError = { error: string; status: number };
export type DecartAccountResult =
  | { body: unknown; error?: never; status?: never }
  | DecartAccountError;

export function decartApiKey() {
  return process.env.DECART_API_KEY?.trim() || '';
}

export function minimumCredits() {
  const raw = process.env.DECART_MIN_CREDITS?.trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function fetchDecartAccount(path: '/credits' | '/realtime/quota'): Promise<DecartAccountResult> {
  const apiKey = decartApiKey();
  if (!apiKey) return { error: '服务端尚未配置 DECART_API_KEY。', status: 503 } satisfies DecartAccountError;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${DECART_API_BASE}${path}`, {
      method: 'GET',
      headers: { 'X-API-KEY': apiKey, Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    let body: unknown = null;
    try { body = await response.json(); } catch { body = null; }
    if (!response.ok) {
      if (response.status === 401) return { error: 'Decart API Key 无效或已过期。', status: 401 } satisfies DecartAccountError;
      if (response.status === 403) return { error: 'Decart 账户无权访问此接口。', status: 403 } satisfies DecartAccountError;
      return { error: `Decart 账户接口请求失败（HTTP ${response.status}）。`, status: response.status >= 500 ? 503 : 502 } satisfies DecartAccountError;
    }
    return { body };
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'Decart 账户接口请求超时。' : 'Decart 账户接口暂时不可用。';
    console.error('[decart-account]', JSON.stringify({ path, error: message }));
    return { error: message, status: 503 } satisfies DecartAccountError;
  } finally {
    clearTimeout(timer);
  }
}

export function accountErrorResponse(result: DecartAccountError) {
  return Response.json({ error: result.error }, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
}
