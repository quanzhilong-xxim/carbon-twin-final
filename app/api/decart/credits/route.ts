import { accountErrorResponse, fetchDecartAccount, minimumCredits } from '@/lib/server/decartAccount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await fetchDecartAccount('/credits');
  if (!('body' in result)) return accountErrorResponse(result);
  const body = result.body as { credits?: unknown; key_quota?: unknown } | null;
  const credits = typeof body?.credits === 'number' && Number.isFinite(body.credits) ? body.credits : null;
  return Response.json({ credits, keyQuota: body?.key_quota ?? null, minimumCredits: minimumCredits(), checkedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
}
