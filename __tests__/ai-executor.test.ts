import { test, expect } from '@playwright/test';
import { createAIExecutor, extractSpeech, parseCompleteResponse } from '@/lib/ai/AIExecutor';
import { pruneSnapshots } from '@/lib/storage/SnapshotDB';
import { calculateEmissions, DEFAULT_ACTIVITY } from '@/lib/emissions';
import { retrieve } from '@/lib/ai/retrieval';
import type { AIAction, StoredCarbonSnapshot } from '@/types';

const valid = JSON.stringify({ speech: '用电排放取决于活动量与因子。[1]', action: { type: 'HIGHLIGHT_CHART', target: 'energy' }, question: '哪一个习惯可以改变？' });
test('complete validated messages execute once; incomplete streams remain display-only', () => {
  const actions: AIAction[] = [], executor = createAIExecutor(action => actions.push(action));
  for (let length = 1; length < valid.length; length++) expect(executor.complete('response-1', valid.slice(0, length))).toBe(false);
  expect(actions).toHaveLength(0);
  expect(executor.complete('response-1', valid)).toBe(true);
  expect(executor.complete('response-1', valid)).toBe(false);
  expect(actions).toEqual([{ type: 'HIGHLIGHT_CHART', target: 'energy' }]);
});
test('HTML, oversized bodies, extra fields and untrusted targets never become actions', () => {
  const cases = ['<html>502 Bad Gateway</html>', 'x'.repeat(40001), valid + ' trailing text', valid.replace('energy', 'delete-database'), valid.replace('"question":', '"execute":')];
  for (const source of cases) expect(parseCompleteResponse(source)).toBeNull();
  expect(extractSpeech(cases[0])).toBe('');
  expect(extractSpeech(cases[3])).toBe('用电排放取决于活动量与因子。[1]');
});
test('streaming speech handles escapes without interpreting unfinished action fields', () => {
  expect(extractSpeech('{"speech":"Line 1\\n\\u78b3\\"text\\"')).toBe('Line 1\n碳"text"');
  expect(extractSpeech('{"speech":"保留文字","action":{"type":"CHANGE_THEME"')).toBe('保留文字');
  expect(parseCompleteResponse('{"speech":"保留文字","action":{"type":"CHANGE_THEME"')).toBeNull();
});
test('all permanent quiz records survive temporary-history pruning', () => {
  const row = (index: number, quiz: boolean): StoredCarbonSnapshot => ({ id: `snapshot-${index}`, timestamp: index, actionType: quiz ? 'quiz' : 'slide', rawData: index, normalizedState: .5, isPermanent: quiz, schemaVersion: 1, sequence: index });
  const rows = [...Array.from({ length: 40 }, (_, index) => row(index, false)), row(41, true), row(42, true)];
  const pruned = pruneSnapshots(rows);
  expect(pruned).toHaveLength(32);
  expect(pruned.filter(entry => entry.isPermanent)).toHaveLength(2);
  expect(pruned[0].id).toBe('snapshot-10');
});
test('retrieval returns bounded primary sources and prioritizes accounting boundaries', () => {
  const sources = retrieve('GHG Protocol Scope 2 购入电力 企业边界');
  expect(sources).toHaveLength(2);
  expect(sources[0].referenceId).toBe('scope-boundaries');
  expect(sources.every(source => source.url.startsWith('https://') && source.excerpt.includes('边界'))).toBe(true);
});
test('scenario output changes with actual inputs and handles zero activity without NaN', () => {
  const baseline = calculateEmissions(DEFAULT_ACTIVITY, 2026);
  const changed = calculateEmissions({ ...DEFAULT_ACTIVITY, electricity: 360 }, 2026);
  expect(changed.annual - baseline.annual).toBeCloseTo(180 * 12 * .581);
  expect(changed.cumulative).toBe(changed.annual * 24);
  expect(calculateEmissions({ electricity: 0, gasoline: 0, beef: 0 }, 2026).annual).toBe(0);
});
