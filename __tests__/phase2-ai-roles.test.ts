import { test, expect } from '@playwright/test';
import { ROLE_PROFILES, isConversational, roleFallbackIntro, roleProfile, roleSystemSection } from '@/lib/ai/roles';
import { resolveChatProvider } from '@/lib/ai/provider';
import { createChatGuard, clientAddress } from '@/lib/server/chatGuard';

const IDENTITIES = ['student', 'business', 'city'] as const;

test('three role profiles are complete, distinct and free of credential material', () => {
  const seenNames = new Set<string>();
  for (const identity of IDENTITIES) {
    const role = roleProfile(identity);
    expect(role.id).toBe(identity);
    expect(role.name.trim().length).toBeGreaterThan(0);
    expect(role.title.trim().length).toBeGreaterThan(0);
    expect(role.persona.trim().length).toBeGreaterThan(10);
    expect(role.scope.length).toBeGreaterThanOrEqual(3);
    expect(role.boundaries.length).toBeGreaterThanOrEqual(2);
    expect(role.welcome.trim().length).toBeGreaterThan(10);
    expect(role.intro.trim().length).toBeGreaterThan(20);
    expect(role.suggestions).toHaveLength(3);
    expect(role.suggestions.every((s) => s.trim().length > 5)).toBe(true);
    expect(JSON.stringify(role)).not.toMatch(/sk-[A-Za-z0-9]{8,}|nfp_[A-Za-z0-9]{8,}|api[_-]?key\s*[:=]/i);
    seenNames.add(role.name);
  }
  expect(seenNames.size).toBe(3);
  expect(Object.keys(ROLE_PROFILES).sort()).toEqual([...IDENTITIES].sort());
});

test('role names follow the three locked references', () => {
  expect(roleProfile('student').name).toBe('星遥');
  expect(roleProfile('business').title).toContain('企业主');
  expect(roleProfile('city').name).toBe('智衡');
});

test('system prompt section carries role scope/boundaries and forbids impersonating a vendor', () => {
  for (const identity of IDENTITIES) {
    const section = roleSystemSection(identity);
    expect(section).toContain(roleProfile(identity).name);
    expect(section).toContain('硬性边界');
    expect(section).toContain('不得因为扮演角色而编造');
    expect(section).not.toMatch(/sk-[A-Za-z0-9]{8,}|nfp_[A-Za-z0-9]{8,}/);
  }
  expect(roleSystemSection('student')).not.toBe(roleSystemSection('business'));
});

test('conversational intent detector only accepts greetings and self-introduction questions', () => {
  for (const q of ['你好', '您好！', '嗨~', 'Hello', '你是谁？', '介绍一下你自己', '你能做什么', '你有什么功能']) {
    expect(isConversational(q)).toBe(true);
  }
  for (const q of [
    'IPCC 如何描述人类活动对全球变暖的影响？',
    'Scope 2 购入电力的排放因子单位是什么？',
    '牛肉消费的年度排放怎么算？',
    '城市公共交通和建筑用能如何相互影响？',
    '请分析我的当前情景并高亮最大排放来源。',
  ]) {
    expect(isConversational(q)).toBe(false);
  }
  expect(isConversational('')).toBe(false);
  expect(isConversational('你好'.repeat(40))).toBe(false);
});

test('fallback introduction is deterministic, labelled and action-free', () => {
  for (const identity of IDENTITIES) {
    const intro = roleFallbackIntro(identity);
    expect(intro.speech).toContain('站内角色介绍');
    expect(intro.action).toEqual({ type: 'NONE' });
    expect(intro.question.length).toBeGreaterThan(5);
    expect(intro.speech).not.toMatch(/sk-[A-Za-z0-9]{8,}|nfp_[A-Za-z0-9]{8,}/);
  }
});

test('provider resolution prefers Doubao only when both key and model are present', () => {
  expect(resolveChatProvider({}).provider).toBeNull();
  expect(resolveChatProvider({ DEEPSEEK_API_KEY: 'your_key_here' }).provider).toBeNull();
  const deepseek = resolveChatProvider({ DEEPSEEK_API_KEY: 'test-deepseek-key' });
  expect(deepseek.provider?.id).toBe('deepseek');
  expect(deepseek.provider?.baseURL).toBe('https://api.deepseek.com/v1');
  expect(deepseek.provider?.model).toBe('deepseek-chat');

  const doubao = resolveChatProvider({ DOUBAO_API_KEY: 'test-ark-key', DOUBAO_MODEL: 'doubao-test-model' });
  expect(doubao.provider?.id).toBe('doubao');
  expect(doubao.provider?.model).toBe('doubao-test-model');
  expect(doubao.provider?.baseURL).toContain('ark.cn-beijing.volces.com');
  expect(doubao.provider?.label).not.toMatch(/test-ark-key/);

  // Ark key without model must not silently send an empty model id.
  const hybrid = resolveChatProvider({ DOUBAO_API_KEY: 'test-ark-key', DEEPSEEK_API_KEY: 'test-deepseek-key' });
  expect(hybrid.provider?.id).toBe('deepseek');
  expect(hybrid.note).toContain('without-model');
  expect(JSON.stringify(hybrid)).not.toContain('test-ark-key');
});

test('chat guard enforces per-IP and global per-minute limits and resets on a new window', () => {
  const guard = createChatGuard({ perMinute: 2, globalPerMinute: 3 });
  const req = (ip: string) => new Request('http://localhost/api/chat', { method: 'POST', headers: { 'x-forwarded-for': ip } });
  expect(clientAddress(req('1.2.3.4'))).toBe('1.2.3.4');

  expect(guard.check(req('1.2.3.4'), 0).ok).toBe(true);
  expect(guard.check(req('1.2.3.4'), 1).ok).toBe(true);
  expect(guard.check(req('1.2.3.4'), 2)).toEqual({ ok: false, reason: 'ip-rate' });
  expect(guard.check(req('5.6.7.8'), 3).ok).toBe(true);
  expect(guard.check(req('9.9.9.9'), 4)).toEqual({ ok: false, reason: 'global-rate' });
  // Next minute: buckets reset
  expect(guard.check(req('1.2.3.4'), 61_000).ok).toBe(true);
  expect(guard.snapshot(61_000).ips).toBe(1);
});
