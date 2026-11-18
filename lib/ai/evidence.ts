import type { Citation } from './retrieval';
import type { RoomEnergy } from '../experience/room';
import type { DeviceStates } from '../experience/spaces';

/** Presence and membership checks, not semantic entailment verification. */
export function validateCitations(text:string,citations:Citation[]):boolean {
 const ids=[...text.matchAll(/\[(\d+)\]/g)].map(m=>Number(m[1]));
 return ids.length>0&&ids.every(id=>citations.some(c=>c.id===id));
}
export function usedCitations(text:string,citations:Citation[]):Citation[]{
 const ids=new Set([...text.matchAll(/\[(\d+)\]/g)].map(m=>Number(m[1])));
 return citations.filter(c=>ids.has(c.id));
}
/** Catch named-source swaps observed in QA; this is not sentence entailment. */
export function validateSourceAttribution(text:string,citations:Citation[]):boolean {
 const institutions=[/\bIPCC\b/i,/GHG\s*Protocol/i,/\bWMO\b/i,/\bCEADs\b/i,/\bUNEP\b/i];
 return (text.match(/[^。！？\n]+(?:[。！？]|$)/g)??[]).every(sentence=>{
  const markers=[...sentence.matchAll(/\[(\d+)\]/g)].map(match=>Number(match[1]));
  if(!markers.length)return true;
  return institutions.every(name=>!name.test(sentence)||markers.some(id=>{
   const citation=citations.find(row=>row.id===id);
   return !!citation&&name.test(citation.title);
  }));
 });
}
/** Reject known malformed spellings of the teaching factor, not general semantics. */
export function validateFactorUnits(text:string):boolean {
 const normalized=text.replace(/[*_`]/g,'').replace(/\s+/g,' ').replace(/CO[₂2](?:e)?/gi,'');
 return !/(?:0[.,](?:581|5306)|\.(?:581|5306))\s*(?:kwh|千瓦时|度电)(?:\s*(?:\/|／|per|每)\s*(?:kg|千克|公斤)|\s*[⁻^−-]\s*(?:[−-]?\s*[¹1]))/i.test(normalized);
}
/** An explicit refusal with no fabricated marker is safe to display, never to execute. */
export function isEvidenceAbstention(text:string,citations:Citation[]):boolean {
 return citations.length===0&&!/\[\d+\]/.test(text)&&/当前检索资料不足，无法确认/.test(text);
}
/** Canonical scalar snapshot: advice expires on any calculation input change. */
export function evidenceContext(kind:string,selected:string|null,energy:RoomEnergy,devices:DeviceStates,activities?:{electricity:number;gasoline:number;beef:number}):string {
 return JSON.stringify([kind,selected??'',Object.entries(energy).sort(),Object.entries(devices).sort(),activities?Object.entries(activities).sort():null]);
}
