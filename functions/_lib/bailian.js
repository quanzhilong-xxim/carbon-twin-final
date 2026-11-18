// Shared Alibaba Cloud Model Studio (Bailian) try-on helpers for Pages Functions.
// All calls are server-side. The API key is read from the Cloudflare runtime env
// only and is never returned to the browser.
//
// Reference shape (Beijing DashScope):
//   POST /api/v1/services/aigc/image2image/image-synthesis/
//   { model: "aitryon-plus", input: { person_image_url, top_garment_url|bottom_garment_url }, parameters: { resolution, restore_face } }
//   Header: X-DashScope-Async: enable
//   Then GET /api/v1/tasks/{task_id}
// Local images use the official temporary OSS flow:
//   GET /api/v1/uploads?action=getPolicy&model=aitryon-plus
//   POST {upload_host} (multipart)
//   Header on model call: X-DashScope-OssResourceResolve: enable

export const TRYON_MODEL = 'aitryon-plus';
export const DEFAULT_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis/';
export const TASK_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/tasks/';
export const UPLOAD_POLICY_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/uploads';
export const MAX_PERSON_BYTES = 5 * 1024 * 1024;

export const SERVER_GARMENTS = {
  'nike-black-tee': { imagePath: '/garments/tshirt.png', category: 'top', name: '耐克黑色短袖' },
  'nike-white-long-sleeve': { imagePath: '/garments/longsleeve.png', category: 'top', name: '耐克白色长袖' },
  'adidas-yellow-jacket': { imagePath: '/garments/jacket.png', category: 'top', name: '阿迪达斯黄色外套' },
  'adidas-black-track-pants': { imagePath: '/garments/trousers.png', category: 'bottom', name: '阿迪达斯黑色长裤' },
  'nike-navy-shorts': { imagePath: '/garments/shorts.png', category: 'bottom', name: '耐克深蓝色短裤' },
  'ivory-knit-sweater': { imagePath: '/garments/sweater.png', category: 'top', name: '米白色羊毛衫' },
  'light-blue-jeans': { imagePath: '/garments/jeans.png', category: 'bottom', name: '浅蓝色牛仔裤' },
};

export function apiKey(env) {
  return (env.DASHSCOPE_API_KEY || '').trim();
}

export function publicBase(env) {
  return (env.PUBLIC_SITE_URL || 'https://carbontwin.pages.dev').replace(/\/$/, '');
}

export function configured(env) {
  return Boolean(apiKey(env));
}

export function dataUrlToBlob(value) {
  if (typeof value !== 'string') throw new Error('missing image');
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(value.trim());
  if (!match) throw new Error('unsupported image');
  const binary = atob(match[2].replace(/\s+/g, ''));
  if (!binary.length) throw new Error('empty image');
  if (binary.length > MAX_PERSON_BYTES) throw new Error('image too large');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: `image/${match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase()}` });
}

export async function uploadTemporary(env, blob, filename) {
  const key = apiKey(env);
  const policyResponse = await fetch(`${UPLOAD_POLICY_ENDPOINT}?action=getPolicy&model=${TRYON_MODEL}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  const policyBody = await policyResponse.json().catch(() => null);
  if (!policyResponse.ok || !policyBody?.data) throw new Error(`upload_policy_${policyResponse.status}`);
  const policy = policyBody.data;
  const objectKey = `${policy.upload_dir}/${filename}`;
  const form = new FormData();
  form.append('OSSAccessKeyId', policy.oss_access_key_id);
  form.append('Signature', policy.signature);
  form.append('policy', policy.policy);
  form.append('x-oss-object-acl', policy.x_oss_object_acl);
  form.append('x-oss-forbid-overwrite', policy.x_oss_forbid_overwrite);
  form.append('key', objectKey);
  form.append('success_action_status', '200');
  form.append('file', blob, filename);
  const upload = await fetch(policy.upload_host, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
  if (!upload.ok) throw new Error(`upload_${upload.status}`);
  return `oss://${objectKey}`;
}

export async function createTryOnTask(env, { garmentId, personImage }) {
  const key = apiKey(env);
  const garment = SERVER_GARMENTS[garmentId];
  if (!garment) throw new Error('invalid_garment');
  const blob = dataUrlToBlob(personImage);
  const filename = `carbontwin-${Date.now()}-${crypto.randomUUID()}.jpg`;
  const personUrl = await uploadTemporary(env, blob, filename);
  const input = { person_image_url: personUrl };
  if (garment.category === 'top') input.top_garment_url = `${publicBase(env)}${garment.imagePath}`;
  else input.bottom_garment_url = `${publicBase(env)}${garment.imagePath}`;
  const endpoint = (env.DASHSCOPE_TRYON_ENDPOINT || DEFAULT_ENDPOINT);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
      'X-DashScope-OssResourceResolve': 'enable',
    },
    body: JSON.stringify({
      model: TRYON_MODEL,
      input,
      parameters: { resolution: -1, restore_face: true },
    }),
    signal: AbortSignal.timeout(45000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`submit_${response.status}`);
  const taskId = body?.output?.task_id || body?.task_id;
  if (!taskId) throw new Error('submit_no_task');
  return { taskId: String(taskId), status: String(body?.output?.task_status || body?.task_status || 'PENDING'), garment: garment.name, category: garment.category };
}

export async function queryTryOnTask(env, taskId) {
  const key = apiKey(env);
  const response = await fetch(`${TASK_ENDPOINT}${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(25000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`query_${response.status}`);
  const output = body?.output || {};
  const status = String(output.task_status || body?.task_status || '').toUpperCase();
  const imageUrl = output.image_url
    || output.results?.[0]?.url
    || output.results?.[0]?.image_url
    || output.result?.image_url
    || '';
  const usage = body?.usage || output.usage || null;
  return { status, imageUrl, usage, requestId: body?.request_id || null, rawError: output.message || output.code || null };
}
