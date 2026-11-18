import { tryOnPolicy } from '@/lib/server/decartApproval';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json(tryOnPolicy(), { headers: { 'Cache-Control': 'no-store' } });
}
