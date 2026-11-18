export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.pathname === '/api/decart' || url.pathname.startsWith('/api/decart/') || url.pathname === '/api/decart-token') {
    return new Response(JSON.stringify({ error: 'Decart 已停用；AI 试衣已迁移至阿里云百炼 aitryon-plus + MediaPipe。', retired: true }), {
      status: 410,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-carbontwin-mode': 'decart-retired' },
    });
  }
  if (url.pathname.startsWith('/api/tryon/')) {
    return new Response(JSON.stringify({ error: '该试衣接口不存在。' }), {
      status: 404,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  const body = {
    configured: false,
    mode: 'static-competition',
    message: 'AI / 搜索接口在当前零费用静态比赛版中未启用；三维场景、学术档案与行为沙盘不受影响。',
    path: url.pathname,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-carbontwin-mode': 'static-competition',
    },
  });
}
