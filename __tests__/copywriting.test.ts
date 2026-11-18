import { expect, test } from '@playwright/test';
import { literaryCopy, selectLiteraryCopy } from '@/lib/copywriting';

test('literary entries have unique IDs and text, metadata, and fourteen categories', () => {
  expect(new Set(literaryCopy.map(item => item.id)).size).toBe(literaryCopy.length);
  expect(new Set(literaryCopy.map(item => item.text)).size).toBe(literaryCopy.length);
  expect(new Set(literaryCopy.map(item => item.category)).size).toBe(14);
  expect(literaryCopy.every(item => item.text && item.page && item.scene && item.position && item.mood && item.keywords.length && item.kind === 'literary')).toBe(true);
});

test('selection is contextual, cycles and avoids immediate random repeats', () => {
  const query = { page: 'sandbox' as const, scene: 'morning', position: 'weather' };
  const first = selectLiteraryCopy(query)!;
  const next = selectLiteraryCopy(query, first.id)!;
  expect(next.id).not.toBe(first.id);
  expect(selectLiteraryCopy(query, first.id, { mode:'random', random:() => 0 })?.id).toBe(next.id);
  expect(selectLiteraryCopy({ page:'research', scene:'morning' })).toBeUndefined();
  expect(selectLiteraryCopy({ page:'identity', scene:'student' }, undefined, { mode:'random' })).toBeUndefined();
  expect(selectLiteraryCopy({ page:'identity', scene:'business', category:'philosophy' })?.id).toBe('CT-I-002');
  expect(literaryCopy.filter(item => item.category === 'choices' && item.scene === 'breeze').every(item => !item.text.includes('家庭人数'))).toBe(true);
});
