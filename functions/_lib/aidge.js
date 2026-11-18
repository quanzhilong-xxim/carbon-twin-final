// Alibaba Cloud Aidge AiTryOn + Alibaba Cloud OSS temporary image transport.
// Secrets live only in Cloudflare Pages environment variables.
// No credentials or user images are logged.

const AIDGE_VERSION = '2026-04-28';
const AIDGE_HOST = 'aidge.cn-beijing.aliyuncs.com';
const OSS_REGION = 'oss-cn-beijing';
const OSS_SUFFIX = 'aliyuncs.com';
const PERSON_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PRESIGN_SECONDS = 15 * 60;

const GARMENTS = {
  'nike-black-tee': { objectKey: 'garments/tshirt.png', clothType: 'tops' },
  'nike-white-long-sleeve': { objectKey: 'garments/longsleeve.png', clothType: 'tops' },
  'adidas-yellow-jacket': { objectKey: 'garments/jacket.png', clothType: 'outwear' },
  'adidas-black-track-pants': { objectKey: 'garments/trousers.png', clothType: 'bottoms' },
  'nike-navy-shorts': { objectKey: 'garments/shorts.png', clothType: 'bottoms' },
  'ivory-knit-sweater': { objectKey: 'garments/sweater.png', clothType: 'tops' },
  'light-blue-jeans': { objectKey: 'garments/jeans.png', clothType: 'bottoms' },
};

export class TryOnError extends Error {
  constructor(code, message, status = 502) {
    super(message || code || 'Aidge try-on failed');
    this.name = 'TryOnError';
    this.code = code || 'tryon_failed';
    this.status = status;
  }
}

export function aidgeAccessKey(env = {}) {
  return {
    id: typeof env.AIDGE_ACCESS_KEY_ID === 'string' ? env.AIDGE_ACCESS_KEY_ID.trim() : '',
    secret: typeof env.AIDGE_ACCESS_KEY_SECRET === 'string' ? env.AIDGE_ACCESS_KEY_SECRET.trim() : '',
  };
}

export function ossBucket(env = {}) {
  return typeof env.AIDGE_OSS_BUCKET === 'string' ? env.AIDGE_OSS_BUCKET.trim() : '';
}

export function configured(env = {}) {
  const { id, secret } = aidgeAccessKey(env);
  return Boolean(id && secret && ossBucket(env));
}

export function getGarment(garmentId) {
  return GARMENTS[garmentId] || null;
}

export function providerInfo(env = {}) {
  return {
    configured: configured(env),
    provider: 'Alibaba Cloud Aidge',
    model: 'AiTryOn',
    region: env.AIDGE_REGION || 'cn-beijing',
    endpointRegion: 'Beijing (aidge.cn-beijing.aliyuncs.com)',
    imageTransport: 'Alibaba Cloud OSS private bucket + 15-minute presigned URL; deleted after each request',
    humanDetection: 'MediaPipe Pose Landmarker (browser local)',
    quota: 'Aidge 虚拟试穿免费额度 30 张 / 90 天；控制台已开启“免费额度用完即停”',
    reason: configured(env) ? null : '服务端未配置 Aidge AccessKey 或 OSS Bucket；不会上传照片，也不会调用 Aidge。',
  };
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

function utf8(value) {
  return new TextEncoder().encode(String(value));
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', typeof value === 'string' ? utf8(value) : value);
  return bytesToHex(digest);
}

async function hmacSha256Hex(secret, value) {
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, utf8(value));
  return bytesToHex(sig);
}

async function hmacSha1Base64(secret, value) {
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(value)));
  let binary = '';
  for (const byte of sig) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// RFC3986 percent encoding, matching the Aidge/OpenAPI canonical query encoder.
function percentEncode(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalQuery(query) {
  return Object.keys(query)
    .sort()
    .map(key => {
      const value = query[key];
      return `${percentEncode(key)}${value === undefined || value === null || value === '' ? '' : `=${percentEncode(value)}`}`;
    })
    .join('&');
}

function randomNonce() {
  if (typeof crypto.randomUUID === 'function') {
    return `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

function aigdeEndpoint() {
  return `https://${AIDGE_HOST}/`;
}

// ACS3-HMAC-SHA256 request signing used by Aidge's OpenAPI gateway.
async function callAidge(env, action, query, extraHeaders = {}) {
  const { id, secret } = aidgeAccessKey(env);
  if (!id || !secret) throw new TryOnError('aidge_not_configured', 'Aidge AccessKey 未配置。', 503);

  const date = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const nonce = randomNonce();
  const payloadHash = await sha256Hex('');
  const headers = {
    host: AIDGE_HOST,
    'x-acs-action': action,
    'x-acs-version': AIDGE_VERSION,
    'x-acs-date': date,
    'x-acs-signature-nonce': nonce,
    'x-acs-content-sha256': payloadHash,
    'x-acs-credentials-provider': 'static_ak',
    accept: 'application/json',
    'user-agent': 'CarbonTwin/3.4 (Cloudflare Pages)',
    ...extraHeaders,
  };

  const signedNames = Object.keys(headers)
    .map(name => name.toLowerCase())
    .filter(name => name.startsWith('x-acs-') || name === 'host' || name === 'content-type')
    .filter((name, index, all) => all.indexOf(name) === index)
    .sort();
  const canonicalHeaders = signedNames
    .map(name => `${name}:${String(headers[name]).trim()}\n`)
    .join('');
  const signedHeaders = signedNames.join(';');
  const queryString = canonicalQuery(query);
  const canonicalRequest = `POST\n/\n${queryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `ACS3-HMAC-SHA256\n${await sha256Hex(canonicalRequest)}`;
  const signature = await hmacSha256Hex(secret, stringToSign);
  headers.Authorization = `ACS3-HMAC-SHA256 Credential=${id},SignedHeaders=${signedHeaders},Signature=${signature}`;

  const fetchHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() !== 'host') fetchHeaders[name] = value;
  }

  let response;
  try {
    response = await fetch(`${aigdeEndpoint()}?${queryString}`, {
      method: 'POST',
      headers: fetchHeaders,
      signal: AbortSignal.timeout ? AbortSignal.timeout(60000) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network error';
    throw new TryOnError('aidge_network', `Aidge 网络请求失败：${message.slice(0, 120)}`, 504);
  }

  let raw;
  try {
    raw = await response.json();
  } catch {
    throw new TryOnError('aidge_invalid_response', `Aidge 返回非 JSON（HTTP ${response.status}）。`, 502);
  }
  // Aidge's raw POP response uses Code/Message/Data/Success; the SDK
  // deserializes them to lower case. Accept both shapes.
  const data = {
    code: raw?.code ?? raw?.Code,
    message: raw?.message ?? raw?.Message,
    success: raw?.success ?? raw?.Success,
    requestId: raw?.requestId ?? raw?.RequestId,
    data: raw?.data ?? raw?.Data,
  };
  if (!response.ok || data.success !== true) {
    throw new TryOnError(data.code || `aidge_http_${response.status}`, data.message || `Aidge 调用失败（HTTP ${response.status}）。`, response.status === 429 ? 429 : 502);
  }
  return data;
}

function ossOrigin(env) {
  return `https://${ossBucket(env)}.${OSS_REGION}.${OSS_SUFFIX}`;
}

function ossObjectPath(env, key) {
  return `/${ossBucket(env)}/${key.split('/').map(percentEncode).join('/')}`;
}

function ossUrl(env, key) {
  return `${ossOrigin(env)}/${key.split('/').map(percentEncode).join('/')}`;
}

async function ossPut(env, key, bytes, contentType) {
  const { id, secret } = aidgeAccessKey(env);
  const date = new Date().toUTCString();
  const stringToSign = `PUT\n\n${contentType}\n${date}\n${ossObjectPath(env, key)}`;
  const signature = await hmacSha1Base64(secret, stringToSign);
  const response = await fetch(ossUrl(env, key), {
    method: 'PUT',
    headers: {
      Date: date,
      'Content-Type': contentType,
      Authorization: `OSS ${id}:${signature}`,
    },
    body: bytes,
  });
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.text()).slice(0, 120); } catch { /* ignore */ }
    throw new TryOnError('oss_upload_failed', `临时图片上传失败（HTTP ${response.status}）${detail ? `：${detail}` : ''}`, 502);
  }
}

async function ossDelete(env, key) {
  const { id, secret } = aidgeAccessKey(env);
  const date = new Date().toUTCString();
  const stringToSign = `DELETE\n\n\n${date}\n${ossObjectPath(env, key)}`;
  const signature = await hmacSha1Base64(secret, stringToSign);
  try {
    await fetch(ossUrl(env, key), {
      method: 'DELETE',
      headers: { Date: date, Authorization: `OSS ${id}:${signature}` },
    });
  } catch {
    // Best-effort deletion; the bucket lifecycle rule is the second safety net.
  }
}

async function presignOssGet(env, key) {
  const { id, secret } = aidgeAccessKey(env);
  const expires = Math.floor(Date.now() / 1000) + PRESIGN_SECONDS;
  const stringToSign = `GET\n\n\n${expires}\n${ossObjectPath(env, key)}`;
  const signature = await hmacSha1Base64(secret, stringToSign);
  return `${ossUrl(env, key)}?OSSAccessKeyId=${percentEncode(id)}&Expires=${expires}&Signature=${percentEncode(signature)}`;
}

function parseDataImage(personImage) {
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(personImage);
  if (!match) throw new TryOnError('unsupported_image', '照片格式必须是 JPEG/PNG/WebP。', 415);
  const mime = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
  let raw;
  try {
    raw = atob(match[2].replace(/\s+/g, ''));
  } catch {
    throw new TryOnError('invalid_image', '照片 Base64 无效。', 400);
  }
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  if (bytes.length < 1024) throw new TryOnError('invalid_image', '照片为空或过小。', 400);
  if (bytes.length > PERSON_IMAGE_MAX_BYTES) throw new TryOnError('image_too_large', '照片超过 5 MB，请重新拍摄。', 413);
  return { bytes, mime, extension: mime === 'jpeg' ? 'jpg' : mime };
}

function mapAidgeError(error) {
  const code = error instanceof TryOnError ? error.code : '';
  const raw = error instanceof Error ? error.message : 'Aidge 试衣调用失败。';
  if (code === 'FreeQuotaExhausted') return { status: 429, error: 'Aidge 免费试穿额度已用尽（用完即停已开启），本次不会产生费用。' };
  if (code === 'Throttling.User' || code === 'Throttling') return { status: 429, error: 'Aidge 调用过于频繁，请稍后再试；不会自动重试。' };
  if (code === 'InvalidParameter' || code === 'MissingModelImageUrl' || code === 'MissingClothImageUrl') return { status: 400, error: 'Aidge 参数校验失败，请重新拍摄全身照并保持 256–2049 像素。' };
  if (code === 'InputContentBlocked') return { status: 422, error: 'Aidge 拒绝了该图片内容，请更换照片。' };
  if (code === 'aidge_network') return { status: 504, error: raw };
  return { status: error?.status && error.status >= 400 ? error.status : 502, error: `Aidge 试衣失败：${raw.slice(0, 240)}` };
}

export async function createTryOn(env, { garmentId, personImage }) {
  const garment = getGarment(garmentId);
  if (!garment) throw new TryOnError('invalid_garment', '服装 ID 不在七件白名单中。', 400);

  const image = parseDataImage(personImage);
  const suffix = randomNonce().slice(0, 16);
  const personKey = `tryon/${Date.now()}-${suffix}.${image.extension}`;
  let uploaded = false;

  try {
    await ossPut(env, personKey, image.bytes, `image/${image.mime}`);
    uploaded = true;
    const [personUrl, clothUrl] = await Promise.all([
      presignOssGet(env, personKey),
      presignOssGet(env, garment.objectKey),
    ]);

    const data = await callAidge(env, 'AiTryOn', {
      ModelImageUrl: personUrl,
      ClothImageUrl: clothUrl,
      ClothType: garment.clothType,
      Mode: 'lite',
      Resolution: '1K',
      TryonType: 'singletryon',
    }, { 'x-iop-trial': 'true' });

    const rawResult = data.data || {};
    const result = {
      imageUrl: rawResult.imageUrl ?? rawResult.ImageUrl,
      imageWidth: rawResult.imageWidth ?? rawResult.ImageWidth,
      imageHeight: rawResult.imageHeight ?? rawResult.ImageHeight,
      usageMap: rawResult.usageMap ?? rawResult.UsageMap,
    };
    if (!result.imageUrl) throw new TryOnError('result_missing_image', 'Aidge 返回成功但没有图片地址。', 502);
    return {
      imageUrl: result.imageUrl,
      imageWidth: result.imageWidth || null,
      imageHeight: result.imageHeight || null,
      requestId: data.requestId || null,
      usageMap: result.usageMap || { processedImageCount: 1, resolution: '1K' },
      garment: {
        id: garmentId,
        objectKey: garment.objectKey,
        clothType: garment.clothType,
      },
    };
  } catch (error) {
    throw error instanceof TryOnError ? error : new TryOnError('tryon_failed', error instanceof Error ? error.message : 'Aidge 试衣失败。', 502);
  } finally {
    if (uploaded) await ossDelete(env, personKey);
  }
}

export { mapAidgeError };
