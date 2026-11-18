import { createDecartClient } from '@decartai/sdk';
import { fetchDecartAccount, minimumCredits } from '@/lib/server/decartAccount';
import { claimTryOnApproval, tryOnPolicy } from '@/lib/server/decartApproval';
import { TRY_ON_MODEL, TRY_ON_SERVER_SECONDS, TRY_ON_TOKEN_SECONDS } from '@/lib/tryon/policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const requestUrl = new URL(request.url);
  // Next dev may normalize request.url to localhost while the browser uses 127.0.0.1.
  // Use the received Host, never an arbitrary client-supplied forwarded origin.
  const requestOrigin = request.headers.get('host')
    ? `${requestUrl.protocol}//${request.headers.get('host')}` : requestUrl.origin;

  if (!origin || origin !== requestOrigin) {
    return Response.json({ error: '请求来源无效。' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  // Fail closed BEFORE any provider request. Existing API keys are left intact.
  if (!tryOnPolicy().enabled) {
    return Response.json({ error: '收费试穿尚未获得用户授权。', code: 'PAID_TRYON_LOCKED' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  let input: { consent?: unknown; targetSeconds?: unknown };
  try { input = await request.json(); } catch { input = {}; }
  if (input.consent !== true || !Number.isInteger(input.targetSeconds) || Number(input.targetSeconds) < 3 || Number(input.targetSeconds) > 5) {
    return Response.json({ error: '需要明确同意收费，并选择 3～5 秒目标时长。' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const apiKey = process.env.DECART_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: '服务端尚未配置 DECART_API_KEY，请在 .env.local 中保存真实密钥后重试。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  // Claim once before any upstream work; ambiguous failures consume the approval too.
  try {
    if (!await claimTryOnApproval()) return Response.json({ error: '本次试穿授权已经使用。不会重复创建连接；请先核对账单及会话状态。' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: '无法安全锁定单次授权，已阻止连接。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  // A client token is only issued after a fresh, server-side balance check.
  // Unknown balance must never be treated as permission to spend credits.
  const creditsResult = await fetchDecartAccount('/credits');
  if (!('body' in creditsResult)) {
    return Response.json({ error: '余额暂时无法确认，已暂停新的云端试穿连接。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const credits = (creditsResult.body as { credits?: unknown } | null)?.credits;
  if (typeof credits !== 'number' || !Number.isFinite(credits)) {
    return Response.json({ error: '余额暂时无法确认，已暂停新的云端试穿连接。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const minimum = minimumCredits();
  if (credits < Math.max(minimum ?? 0, 20)) {
    return Response.json({ error: 'Decart 账户余额低于安全阈值，已暂停新的云端试穿连接。' }, { status: 402, headers: { 'Cache-Control': 'no-store' } });
  }
  const quotaResult = await fetchDecartAccount('/realtime/quota');
  const quota = 'body' in quotaResult ? quotaResult.body as { active?: unknown; remaining?: unknown } | null : null;
  if (quota?.active !== 0 || typeof quota.remaining !== 'number' || quota.remaining < 1) {
    return Response.json({ error: '仍有活动会话或无法确认并发状态，已暂停新的连接。' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const client = createDecartClient({ apiKey });
    const token = await Promise.race([client.tokens.create({
      expiresIn: TRY_ON_TOKEN_SECONDS,
      allowedModels: [TRY_ON_MODEL],
      allowedOrigins: [requestOrigin],
      constraints: { realtime: { maxSessionDuration: TRY_ON_SERVER_SECONDS } },
    }), new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('TokenTimeout')), 10000);
    })]);

    // Never hand out a credential if the provider does not acknowledge the cap.
    if (token.constraints?.realtime?.maxSessionDuration !== TRY_ON_SERVER_SECONDS) {
      return Response.json({ error: '服务端会话时长限制未得到确认，已阻止连接。' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json(
      { apiKey: token.apiKey, expiresAt: token.expiresAt, model: TRY_ON_MODEL, serverMaxSeconds: TRY_ON_SERVER_SECONDS },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    const raw = error instanceof Error ? error.message : '';
    const nested = typeof error === 'object' && error !== null && 'sdkError' in error ? (error as { sdkError?: { code?: string; message?: string } }).sdkError : undefined;
    const code = nested?.code || (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : '');
    const safeMessage = (nested?.message || raw).replace(/(?:dct_[\w-]+|eyJ[\w.-]+)/g, '[credential-redacted]');
    console.error('[decart-token]', JSON.stringify({ code: 'TOKEN_REQUEST_FAILED' }));
    const lower = `${code} ${safeMessage}`.toLowerCase();
    if (lower.includes('insufficient credits') || lower.includes('insufficient_credit')) {
      return Response.json({ error: 'Insufficient credits' }, { status: 402, headers: { 'Cache-Control': 'no-store' } });
    }
    if (lower.includes('invalid') && lower.includes('token')) {
      return Response.json({ error: 'Token authentication failed' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    if (error instanceof Error && error.message === 'TokenTimeout') {
      return Response.json({ error: 'Token request timed out' }, { status: 504, headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json({ error: 'Decart token request failed' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  } finally {
    clearTimeout(timeout);
  }
}
