// CarbonTwin / CARBON — INTELLIGENCE
// Cloudflare Pages Function: POST /api/chat
// Server-side DeepSeek call. No key ever reaches the browser.
// Returns an AI SDK v7 UI-message stream so the existing chat window can keep
// its original state, safety gates and speech controls.

const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const MAX_BODY = 120000;
const RATE_WINDOW = 60000;
const RATE_MAX = 12;

const buckets = new Map();

const ROLE = {
  student: {
    name: '星遥',
    title: '碳探学员 · 学生探索者',
    style: '活泼、友好、好奇，说话简短具体，用校园和通勤的真实例子；先肯定观察，再给一个本周可执行的小步骤，不说教。',
    scope: '日常碳足迹与用电、校园与通勤、气候素养、行为沙盘 A/B 情景',
  },
  business: {
    name: '产业领航者',
    title: '企业主 / 创业者 · 低碳转型',
    style: '专业、简洁、数据优先。先界定边界和口径，再给判断；用经营语言谈减排与价值，不夸大收益。',
    scope: 'Scope 1/2/3 核算边界、购入电力、能源效率、供应链减排与披露',
  },
  city: {
    name: '智衡',
    title: '城市管理者 · 低碳治理',
    style: '理性、温和、系统视角。先看整体与外部性，再谈局部优化；给可讨论的政策/规划思路，不喊口号。',
    scope: '城市交通、建筑用能、社区参与、低碳规划与长期治理',
  },
};

const GARMENTS = [
  ['短袖（棉质 T 恤）', 6.43, ''],
  ['长袖（棉质衬衫代理）', 13.2, '代理'],
  ['外套', 101, ''],
  ['长裤（牛仔裤代理）', 25.1, '代理'],
  ['短裤（牛仔裤代理）', 25.1, '代理'],
  ['羊毛衫', 56.7, ''],
  ['牛仔裤', 25.1, ''],
];

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
  });
}

function clientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'unknown';
}

function reserve(request) {
  const now = Date.now();
  const ip = clientIp(request);
  const entry = buckets.get(ip);
  if (!entry || entry.until <= now) { buckets.set(ip, { count: 1, until: now + RATE_WINDOW }); return true; }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

function textOf(message) {
  if (!message || typeof message !== 'object') return '';
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter(part => part && part.type === 'text' && typeof part.text === 'string')
      .map(part => part.text)
      .join('');
  }
  return '';
}

function cleanSpeech(value) {
  let text = typeof value === 'string' ? value : '';
  text = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 1200);
}

function buildSystem(identity, activities, page) {
  const role = ROLE[identity] || ROLE.student;
  const activityText = activities && typeof activities === 'object'
    ? `用户当前沙盘输入：月用电 ${Number(activities.electricity) || 0} kWh，月汽油 ${Number(activities.gasoline) || 0} L，每周牛肉 ${Number(activities.beef) || 0} kg。`
    : '用户当前未提供沙盘数值。';
  const pagePath = page && typeof page.path === 'string' ? page.path.slice(0, 160) : '';
  const pageTitle = page && typeof page.title === 'string' ? page.title.slice(0, 160) : '';
  const pageText = page && typeof page.text === 'string' ? page.text.replace(/\s+/g, ' ').slice(0, 2200) : '';
  return [
    `你是 CarbonTwin（CARBON / INTELLIGENCE）网站内的 AI 碳知识教练，当前角色：${role.name}（${role.title}）。`,
    `角色风格：${role.style}`,
    `优先范围：${role.scope}。超出范围时说明边界，不硬答。`,
    '使用自然、友好、简洁的中文，优先用生活化例子；先回应用户真正的问题，再给一个可执行的小步骤。',
    '',
    '【CarbonTwin 站内数据与计算边界】',
    '- 电力：0.5306 kg CO₂/kWh。来源：生态环境部/国家统计局 2023 年全国电力平均 CO₂ 因子（教学情景）。',
    '- 汽油：2.3 kg CO₂/L。来源：US EPA 燃烧排放教学取整值；仅燃烧，不含上游/车辆制造。',
    '- 牛肉：27 kg CO₂e/kg。来源：EWG 2011 生命周期教学情景；不代表所有牛肉/产地。',
    '- 沙盘年度估算 = 月用电×12×0.5306 + 月汽油×12×2.3 + 周牛肉×52×27（kg CO₂e/年）。',
    '- 服装每件全生命周期（ADEME/impactCO2 教学情景，非实测）：短袖 6.43；长袖 13.2（棉衬衫代理）；外套 101；长裤 25.1（牛仔裤代理）；短裤 25.1（牛仔裤代理）；羊毛衫 56.7；牛仔裤 25.1 kg CO₂e。',
    '- 服装年分摊 = 每件 kg × 数量 ÷ 使用年数。',
    '- 这些是教学情景估算，不是个人实测、账单、官方个人超标线或城市均值。不能编造排放数字、文献、DOI、机构结论、政策条款或研究结论。',
    '- 明确区分：站内真实计算数据 / 模拟情景 / 外部公开资料。没有数据时直接说明“不确定/当前资料不足”。',
    '',
    activityText,
    pagePath ? `用户当前页面：${pagePath}${pageTitle ? `（${pageTitle}）` : ''}。` : '',
    pageText ? `当前页面可见内容（仅用于理解情境，不要把其中广告/导航当作事实依据）：${pageText}` : '',
    '',
    '【安全与输出格式】',
    '- 你没有任何修改网站、数据库、用户资料或执行程序的能力；不得声称已替用户改变数值、设备或页面。',
    '- 只输出一个 JSON 对象，不要 Markdown、不要代码围栏、不要额外字段：',
    '{"speech":"给用户看的回答，350字以内","action":{"type":"NONE"},"question":"一个简短、自然的追问，80字以内"}',
    '- action 必须且只能是 {"type":"NONE"}。不要输出 citation 编号、URL、密钥或内部日志。',
    '- 如果用户问的是服装/材料/碳排放/生命周期/行为沙盘/学术档案/城市知识，请直接结合站内数据解释计算逻辑和边界。',
  ].filter(Boolean).join('\n');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!reserve(request)) {
    return json(429, { error: 'AI 请求过于频繁，请稍后再试。' }, { 'Retry-After': '60' });
  }
  const key = (env.DEEPSEEK_API_KEY || '').trim();
  if (!key) {
    return json(503, { error: 'DeepSeek 服务端未配置（缺少 DEEPSEEK_API_KEY），管理员可在 Cloudflare Pages 项目 Secrets 中配置。' });
  }
  let raw;
  try {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > MAX_BODY) return json(413, { error: '请求过长，请开始一段新对话。' });
    raw = await request.text();
    if (raw.length > MAX_BODY) return json(413, { error: '请求过长，请开始一段新对话。' });
  } catch {
    return json(400, { error: '请求内容无法读取。' });
  }
  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { error: '请求格式无效。' }); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
  const question = messages.filter(message => message && message.role === 'user').map(textOf).filter(Boolean).at(-1) || '';
  if (!question.trim()) return json(400, { error: '请输入问题。' });
  const identity = ['student', 'business', 'city'].includes(body.identity) ? body.identity : 'student';
  const activities = body.activities && typeof body.activities === 'object' ? body.activities : null;
  const page = body.pageContext && typeof body.pageContext === 'object' ? body.pageContext : null;
  const model = (env.DEEPSEEK_MODEL || 'deepseek-chat').trim();
  const requestId = typeof body.requestId === 'string' && body.requestId.length < 80 ? body.requestId : crypto.randomUUID();

  const history = messages.map(message => ({
    role: message && message.role === 'assistant' ? 'assistant' : 'user',
    content: textOf(message).slice(0, 3000),
  })).filter(message => message.content.trim());
  const payload = {
    model,
    messages: [
      { role: 'system', content: buildSystem(identity, activities, page) },
      ...history,
    ],
    temperature: 0.35,
    max_tokens: 700,
    stream: false,
  };

  let upstream;
  try {
    upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(50000),
    });
  } catch (error) {
    const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return json(timedOut ? 504 : 502, { error: timedOut ? 'DeepSeek 响应超时，请稍后重试。' : 'DeepSeek 网络连接失败，请检查服务状态。' });
  }

  const responseText = await upstream.text();
  if (!upstream.ok) {
    const status = upstream.status;
    const msg = status === 401 ? 'DeepSeek 鉴权失败（401），请检查服务端 API Key。'
      : status === 402 ? 'DeepSeek 余额不足（402），请为服务端账户充值或关闭 AI 功能。'
      : status === 403 ? 'DeepSeek 拒绝请求（403），请检查服务权限。'
      : status === 429 ? 'DeepSeek 请求频率或额度受限（429），请稍后再试。'
      : `DeepSeek 服务暂不可用（HTTP ${status}）。`;
    return json(status >= 500 ? 502 : status, { error: msg }, { 'X-Carbon-Provider': 'deepseek', 'X-Carbon-Model': model });
  }

  let content = '';
  try {
    const parsed = JSON.parse(responseText);
    content = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message
      ? String(parsed.choices[0].message.content || '')
      : '';
  } catch { content = ''; }
  if (!content.trim()) return json(502, { error: 'DeepSeek 未返回有效内容，请稍后重试。' });

  let output = null;
  try {
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const candidate = JSON.parse(cleaned);
    if (candidate && typeof candidate.speech === 'string' && candidate.speech.trim()) {
      output = {
        speech: cleanSpeech(candidate.speech),
        action: { type: 'NONE' },
        question: cleanSpeech(candidate.question).slice(0, 160),
      };
    }
  } catch { /* Fall back to plain prose below. */ }
  if (!output || !output.speech) {
    output = { speech: cleanSpeech(content), action: { type: 'NONE' }, question: '' };
  }
  if (!output.speech) return json(502, { error: 'DeepSeek 返回内容为空，请稍后重试。' });

  const delta = JSON.stringify(output);
  const id = crypto.randomUUID();
  const sse = [
    `data: ${JSON.stringify({ type: 'start', messageId: id, messageMetadata: { requestId, citations: [], mode: 'evidence', role: identity, provider: 'deepseek', model } })}\n\n`,
    `data: ${JSON.stringify({ type: 'text-start', id })}\n\n`,
    `data: ${JSON.stringify({ type: 'text-delta', id, delta })}\n\n`,
    `data: ${JSON.stringify({ type: 'text-end', id })}\n\n`,
    `data: ${JSON.stringify({ type: 'finish', finishReason: 'stop' })}\n\n`,
    'data: [DONE]\n\n',
  ].join('');

  return new Response(sse, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Vercel-AI-UI-Message-Stream': 'v1',
      'X-Carbon-Provider': 'deepseek',
      'X-Carbon-Model': model,
      'X-Carbon-Mode': 'deepseek-pages-function',
    },
  });
}
