'use client';

import { useCallback, useState } from 'react';

type AccountState = { credits: number | null; minimumCredits: number | null; checkedAt: string | null; error: string; loading: boolean };
type QuotaState = { limit: number | null; active: number | null; remaining: number | null; checkedAt: string | null; error: string; loading: boolean };

const initialCredits: AccountState = { credits: null, minimumCredits: null, checkedAt: null, error: '', loading: false };
const initialQuota: QuotaState = { limit: null, active: null, remaining: null, checkedAt: null, error: '', loading: false };

export function useDecartAccount() {
  const [credits, setCredits] = useState(initialCredits);
  const [quota, setQuota] = useState(initialQuota);
  const refresh = useCallback(async () => {
    setCredits((state) => ({ ...state, loading: true, error: '' }));
    setQuota((state) => ({ ...state, loading: true, error: '' }));
    const [creditsResult, quotaResult] = await Promise.allSettled([
      fetch('/api/decart/credits', { cache: 'no-store' }),
      fetch('/api/decart/quota', { cache: 'no-store' }),
    ]);
    const read = async (result: PromiseSettledResult<Response>) => {
      if (result.status === 'rejected') return { ok: false, body: { error: '账户状态暂时无法确认。' } };
      try { return { ok: result.value.ok, body: await result.value.json() as Record<string, unknown> }; }
      catch { return { ok: false, body: { error: '账户状态响应无效。' } }; }
    };
    const [creditsResponse, quotaResponse] = await Promise.all([read(creditsResult), read(quotaResult)]);
    setCredits({ credits: creditsResponse.ok && typeof creditsResponse.body.credits === 'number' ? creditsResponse.body.credits : null, minimumCredits: creditsResponse.ok && typeof creditsResponse.body.minimumCredits === 'number' ? creditsResponse.body.minimumCredits : null, checkedAt: creditsResponse.ok && typeof creditsResponse.body.checkedAt === 'string' ? creditsResponse.body.checkedAt : null, error: creditsResponse.ok ? '' : String(creditsResponse.body.error || '余额暂时无法确认。'), loading: false });
    setQuota({ limit: quotaResponse.ok && typeof quotaResponse.body.limit === 'number' ? quotaResponse.body.limit : null, active: quotaResponse.ok && typeof quotaResponse.body.active === 'number' ? quotaResponse.body.active : null, remaining: quotaResponse.ok && typeof quotaResponse.body.remaining === 'number' ? quotaResponse.body.remaining : null, checkedAt: quotaResponse.ok && typeof quotaResponse.body.checkedAt === 'string' ? quotaResponse.body.checkedAt : null, error: quotaResponse.ok ? '' : String(quotaResponse.body.error || '并发状态暂时无法确认。'), loading: false });
  }, []);
  // Account reads are explicit; mounting a page never contacts Decart.
  const sufficient = credits.credits !== null && (credits.minimumCredits === null || credits.credits >= credits.minimumCredits);
  return { credits, quota, sufficient, refresh };
}
