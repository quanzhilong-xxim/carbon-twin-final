/**
 * Chat provider resolution for CarbonTwin.
 *
 * The site historically called DeepSeek for text chat while Doubao/Volcengine
 * only powered speech synthesis. Phase 2 adds an explicit, opt-in Doubao Ark
 * chat path so the "豆包 AI 智能体" can be a real Doubao text model when the
 * operator supplies an Ark API key. Nothing here runs at import time and no key
 * is ever sent to the browser.
 */
export type ChatProviderId = 'doubao' | 'deepseek';

export interface ChatProviderConfig {
  id: ChatProviderId;
  /** Human-readable label used in safe response headers (never a key). */
  label: string;
  baseURL: string;
  model: string;
  apiKey: string;
}

export interface ProviderResolution {
  provider: ChatProviderConfig | null;
  /** Diagnostic without any credential material. */
  note: string;
}

const PLACEHOLDER = /^(your_|replace|placeholder|changeme|请填|xxx)/i;

function usable(value: string | undefined): string {
  const v = (value ?? '').trim();
  return v && !PLACEHOLDER.test(v) ? v : '';
}

export function resolveChatProvider(env: Record<string, string | undefined> = process.env): ProviderResolution {
  const doubaoKey = usable(env.DOUBAO_API_KEY) || usable(env.ARK_API_KEY);
  const doubaoModel = (env.DOUBAO_MODEL ?? '').trim();
  if (doubaoKey && doubaoModel) {
    return {
      provider: {
        id: 'doubao',
        label: 'doubao-ark',
        baseURL: (env.DOUBAO_BASE_URL ?? '').trim() || 'https://ark.cn-beijing.volces.com/api/v3',
        model: doubaoModel,
        apiKey: doubaoKey,
      },
      note: 'doubao-ark',
    };
  }
  const deepseekKey = usable(env.DEEPSEEK_API_KEY);
  if (deepseekKey) {
    return {
      provider: {
        id: 'deepseek',
        label: 'deepseek',
        baseURL: (env.DEEPSEEK_BASE_URL ?? '').trim() || 'https://api.deepseek.com/v1',
        model: (env.DEEPSEEK_MODEL ?? '').trim() || 'deepseek-chat',
        apiKey: deepseekKey,
      },
      note: doubaoKey ? 'doubao-key-without-model; fell back to deepseek' : 'deepseek',
    };
  }
  return { provider: null, note: doubaoKey ? 'doubao-key-without-model; no deepseek key' : 'no provider key' };
}
