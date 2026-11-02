import { REFERENCES, type AcademicReference } from '@/lib/references';
import { KNOWLEDGE_PASSAGES } from '@/lib/knowledge';
export interface Citation { id: number; referenceId: string; title: string; url: string; excerpt: string }
const chunks = REFERENCES.filter(reference=>reference.verified).map(reference => ({ reference, text: [reference.title,reference.summary,KNOWLEDGE_PASSAGES.find(p => p.id === reference.id)?.content,reference.translation,reference.explanation,...reference.keywords].join(' ') }));
function tokens(text: string): string[] {
  const normalized = text.toLowerCase();
  const latin = normalized.match(/[a-z0-9]+/g) ?? [];
  const han = normalized.match(/[\u4e00-\u9fff]+/g) ?? [];
  return [...latin,...han.flatMap(word => word.length < 2 ? [word] : Array.from({length:word.length-1},(_,i)=>word.slice(i,i+2)))];
}
function cosine(query: string[], document: string[]): number {
  const q = new Map<string, number>(), d = new Map<string, number>();
  for (const token of query) q.set(token, (q.get(token) ?? 0) + 1);
  for (const token of document) d.set(token, (d.get(token) ?? 0) + 1);
  let dot = 0, qNorm = 0, dNorm = 0;
  for (const value of q.values()) qNorm += value * value;
  for (const value of d.values()) dNorm += value * value;
  for (const [token, value] of q) dot += value * (d.get(token) ?? 0);
  return qNorm && dNorm ? dot / (Math.sqrt(qNorm) * Math.sqrt(dNorm)) : 0;
}
/** Bounded lexical retrieval: BM25 plus a transparent cosine term-frequency score. */
export function retrieve(question: string): Citation[] {
  const query = [...new Set(tokens(question))], docs = chunks.map(c => tokens(c.text));
  const average = docs.reduce((n,d)=>n+d.length,0)/docs.length;
  const scores = docs.map((doc,index) => ({ index, score: query.reduce((score,term) => {
    const tf = doc.filter(t=>t===term).length, df=docs.filter(d=>d.includes(term)).length;
    const idf=Math.log(1+(docs.length-df+.5)/(df+.5));
    return score+idf*tf*2.2/(tf+1.2*(.25+.75*doc.length/average));
  },0) + cosine(query, doc) * 3 }));
  return scores.sort((a,b)=>b.score-a.score).filter(row=>row.score>0).slice(0,3).map((row,index)=>toCitation(chunks[row.index].reference,index+1));
}
function toCitation(r: AcademicReference, id: number): Citation { return { id, referenceId:r.id,title:r.citation,url:r.url,excerpt:`${r.locator}: ${r.quote} 释义：${r.translation} 边界：${r.limitation}` }; }
