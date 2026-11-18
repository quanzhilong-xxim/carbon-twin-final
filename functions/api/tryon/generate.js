import { configured, createTryOn, mapAidgeError, TryOnError } from '../../_lib/aidge.js';

const buckets = new Map();

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

function ipOf(request) {
  return request.headers.get('cf-connecting-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

function reserve(request) {
  const now = Date.now();
  const ip = ipOf(request);
  const entry = buckets.get(ip);
  if (!entry || entry.until <= now) { buckets.set(ip, { count: 1, until: now + 60000 }); return true; }
  if (entry.count >= 2) return false;
  entry.count += 1;
  return true;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!configured(env)) {
    return json(503, {
      error: 'Aidge AI 试衣未配置：服务端缺少 AccessKey 或 OSS Bucket。本次未上传照片，也未调用 Aidge。',
      configured: false,
      provider: 'Alibaba Cloud Aidge',
      model: 'AiTryOn',
    });
  }
  if (!reserve(request)) return json(429, { error: '本会话生成请求过于频繁，请稍后再试；不会自动重试。' });
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('application/json')) return json(415, { error: '请发送 JSON。' });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 8 * 1024 * 1024) return json(413, { error: '图片请求过大，请重新拍摄。' });
    body = JSON.parse(raw);
  } catch { return json(400, { error: '请求格式无效。' }); }
  const garmentId = typeof body?.garmentId === 'string' ? body.garmentId : '';
  const personImage = typeof body?.personImage === 'string' ? body.personImage : '';
  if (!garmentId) return json(400, { error: '请选择服装。' });
  if (!personImage.startsWith('data:image/')) return json(400, { error: '请先拍摄并确认照片。' });
  try {
    const result = await createTryOn(env, { garmentId, personImage });
    return json(200, {
      status: 'SUCCEEDED',
      provider: 'Alibaba Cloud Aidge',
      model: 'AiTryOn',
      region: env.AIDGE_REGION || 'cn-beijing',
      taskId: result.requestId,
      requestId: result.requestId,
      imageUrl: result.imageUrl,
      imageWidth: result.imageWidth,
      imageHeight: result.imageHeight,
      usageMap: result.usageMap,
      garment: result.garment,
      notice: 'Aidge 真实生成成功；免费额度按成功处理张数扣减。照片已从临时 OSS 删除。',
    });
  } catch (error) {
    if (error instanceof TryOnError && error.code === 'invalid_garment') return json(400, { error: '服装 ID 不在七件白名单中。' });
    if (error instanceof TryOnError && error.code === 'unsupported_image') return json(415, { error: '照片格式必须是 JPEG/PNG/WebP。' });
    if (error instanceof TryOnError && error.code === 'image_too_large') return json(413, { error: '照片超过 5 MB，请重新拍摄。' });
    const mapped = mapAidgeError(error);
    return json(mapped.status, {
      error: mapped.error,
      configured: true,
      provider: 'Alibaba Cloud Aidge',
      model: 'AiTryOn',
    });
  }
}
