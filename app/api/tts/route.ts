import { synthesize, ttsConfig } from '@/lib/server/doubaoTts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Reports availability only; it neither calls Volcengine nor returns credentials.
export function GET() {
  return Response.json(ttsConfig(), { headers: { 'Cache-Control': 'no-store' } });
}
export const POST = synthesize;
