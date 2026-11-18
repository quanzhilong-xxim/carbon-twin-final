import { accountErrorResponse, fetchDecartAccount } from '@/lib/server/decartAccount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await fetchDecartAccount('/realtime/quota');
  if (!('body' in result)) return accountErrorResponse(result);
  const body = result.body as { limit?: unknown; active?: unknown; remaining?: unknown } | null;
  const numberOrNull = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
  return Response.json({ limit: numberOrNull(body?.limit), active: numberOrNull(body?.active), remaining: numberOrNull(body?.remaining), checkedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
}
