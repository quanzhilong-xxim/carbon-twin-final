export async function onRequestGet() {
  return new Response(JSON.stringify({
    status: 'NOT_APPLICABLE',
    error: 'Aidge AiTryOn 为同步接口；生成结果随 /api/tryon/generate 直接返回，不提供后续任务轮询。',
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
