import localforage from 'localforage';
import { learningEventSchema, type LearningEvent, type StoredLearningEvent } from './learningContracts';
export type { LearningEvent, StoredLearningEvent } from './learningContracts';
let activeAccount='guest';
const stores=new Map<string,LocalForage>();
function eventStore(account=activeAccount){let store=stores.get(account);if(!store){store=localforage.createInstance({name:'CarbonTwinDB',storeName:account==='guest'?'learning_events':`events_${account}`});stores.set(account,store);}return store;}
export function setLearningAccount(id:string|null){activeAccount=id??'guest';window.dispatchEvent(new Event('carbon-learning-updated'));}
export function learningAccount(){return activeAccount;}
export async function allLearning(account=activeAccount){const rows:StoredLearningEvent[]=[];await eventStore(account).iterate<unknown,void>(value=>{const row=learningEventSchema.safeParse(value);if(row.success)rows.push(row.data);});return rows.sort((a,b)=>a.timestamp-b.timestamp);}
export async function mergeLearning(rows:unknown,account=activeAccount){if(!Array.isArray(rows))return;const store=eventStore(account);for(const value of rows){const row=learningEventSchema.safeParse(value);if(row.success&&!await store.getItem(row.data.id))await store.setItem(row.data.id,row.data);}if(account===activeAccount)window.dispatchEvent(new Event('carbon-learning-updated'));}
/** One key per event: durable history without rewriting an ever-growing array. */
export async function recordLearning(event: LearningEvent, account=activeAccount) {
  const id = crypto.randomUUID();
  const row: StoredLearningEvent = { ...event, id, timestamp: Date.now(), version: 1 };
  await eventStore(account).setItem(id, row);
  if(account===activeAccount){window.dispatchEvent(new Event('carbon-learning-created'));window.dispatchEvent(new Event('carbon-learning-updated'));}
}
export async function learningSummary(account=activeAccount) {
  const modules = new Set<string>(); let count = 0;
  await eventStore(account).iterate<StoredLearningEvent, void>(row => {
    if (!row || row.version !== 1) return;
    count++;
    if (row.type === 'module') modules.add(row.module);
    if (row.type === 'slider') modules.add('simulation');
    if (row.type === 'question') modules.add('ai-inquiry');
    if (row.type === 'quiz' && row.correct) modules.add('scope-quiz');
  });
  return { count, modules: [...modules] };
}
