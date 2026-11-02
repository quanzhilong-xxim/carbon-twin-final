import localforage from 'localforage';
import { isStoredCarbonSnapshot } from '@/lib/core/validation';
import type { StoredCarbonSnapshot } from '@/types';

const db = localforage.createInstance({ name: 'CarbonTwin', storeName: 'snapshots' });
let queue: Promise<void> = Promise.resolve();
export async function readSnapshots(): Promise<StoredCarbonSnapshot[]> {
  const value: unknown = await db.getItem('history');
  return Array.isArray(value) ? value.filter(isStoredCarbonSnapshot) : [];
}
export function pruneSnapshots(rows: readonly StoredCarbonSnapshot[]) {
  const permanent = rows.filter(row => row.isPermanent);
  const temporary = rows.filter(row => !row.isPermanent).slice(-30);
  return [...permanent, ...temporary].sort((a, b) => a.timestamp - b.timestamp);
}
export function saveSnapshot(snapshot: StoredCarbonSnapshot): Promise<void> {
  if (!isStoredCarbonSnapshot(snapshot)) return Promise.reject(new TypeError('Invalid snapshot'));
  const operation = queue.then(async () => {
    const rows = pruneSnapshots([...(await readSnapshots()).filter(row => row.id !== snapshot.id), snapshot]);
    try { await db.setItem('history', rows); }
    catch { await db.setItem('history', rows.filter(row => row.isPermanent || row.id === snapshot.id)); }
  });
  queue = operation.catch(() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('carbon-storage-error')); });
  return operation;
}
