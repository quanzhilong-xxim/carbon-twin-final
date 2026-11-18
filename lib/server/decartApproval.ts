import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getStore } from '@netlify/blobs';
import { TRY_ON_BILLING_ACK, TRY_ON_MODEL, TRY_ON_SERVER_SECONDS } from '@/lib/tryon/policy';

// No permanent key, approval identifier or credentials are returned to the browser.
export function tryOnPolicy() {
  const approved = process.env.DECART_TRYON_ENABLED === 'true'
    && process.env.DECART_TRYON_BILLING_ACK === TRY_ON_BILLING_ACK
    && (process.env.DECART_TRYON_APPROVAL_ID?.trim().length ?? 0) >= 16;
  return {
    enabled: approved, configured: !!process.env.DECART_API_KEY?.trim(),
    model: TRY_ON_MODEL, targetSeconds: 3, maxTargetSeconds: 5,
    serverMaxSeconds: TRY_ON_SERVER_SECONDS,
    message: approved ? '每次授权仅可申请一次连接；失败后不会自动重试。'
      : '收费试穿尚未授权。可以选择服装、上传参考图并打开本地摄像头；不会启动 AI 会话。',
  };
}

export async function claimTryOnApproval() {
  if (!tryOnPolicy().enabled) return false;
  const id = createHash('sha256').update(process.env.DECART_TRYON_APPROVAL_ID!.trim()).digest('hex');
  // A consumed approval is deliberately NEVER released on stop/error/timeout:
  // token TTL does not revoke a token or prove the upstream session has stopped.
  if (process.env.NETLIFY === 'true') {
    const store = getStore({ name: 'decart-tryon-approvals', consistency: 'strong' });
    const result = await store.set(id, JSON.stringify({ claimedAt: new Date().toISOString() }), { onlyIfNew: true });
    return result.modified;
  }
  const directory = path.join(process.cwd(), 'work', 'tryon-approvals');
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(path.join(directory, id + '.json'), JSON.stringify({ claimedAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
}
