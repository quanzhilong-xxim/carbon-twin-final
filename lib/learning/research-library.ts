import localforage from 'localforage';

export type ReadingRecord = { id: string; readAt: number; saved: boolean };
const library = localforage.createInstance({ name: 'CarbonTwinDB', storeName: 'research_library' });
let queue: Promise<void> = Promise.resolve();

export async function readLibrary(): Promise<ReadingRecord[]> {
  const records: ReadingRecord[] = [];
  await library.iterate<ReadingRecord, void>(row => {
    if (row && typeof row.id === 'string' && Number.isFinite(row.readAt) && typeof row.saved === 'boolean') records.push(row);
  });
  return records.sort((a, b) => b.readAt - a.readAt);
}

export function updateReading(id: string, action: 'read' | 'save'): Promise<ReadingRecord> {
  const operation = queue.then(async () => {
    const previous = await library.getItem<ReadingRecord>(id);
    const record = { id, readAt: action === 'read' ? Date.now() : previous?.readAt ?? 0, saved: action === 'save' ? !previous?.saved : previous?.saved ?? false };
    await library.setItem(id, record);
    window.dispatchEvent(new CustomEvent('carbon-library-updated', { detail: record }));
    return record;
  });
  queue = operation.then(() => undefined, () => undefined);
  return operation;
}
