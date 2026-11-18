import { providerInfo } from '../../_lib/aidge.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  const info = providerInfo(env);
  return new Response(JSON.stringify({
    configured: info.configured,
    provider: info.provider,
    model: info.model,
    region: info.region,
    endpointRegion: info.endpointRegion,
    workspaceConfigured: false,
    publicBase: 'https://carbontwin.pages.dev',
    humanDetection: info.humanDetection,
    imageTransport: info.imageTransport,
    quota: info.quota,
    reason: info.reason,
    notice: 'Aidge AiTryOn 通过 Cloudflare Pages Function 调用；用户照片仅临时上传到私有阿里云 OSS，生成后立即删除，不使用 R2，不永久保存。',
    keyPresent: Boolean(env.AIDGE_ACCESS_KEY_ID && env.AIDGE_ACCESS_KEY_SECRET),
    checkedAt: new Date().toISOString(),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
