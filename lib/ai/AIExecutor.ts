import { isAIAction, isRecord } from '@/lib/core/validation';
import type { AIResponse, AIAction } from '@/types';

/** Display-only extraction. Partial JSON is NEVER promoted into an executable action. */
export function extractSpeech(source: string): string {
  if (source.length > 40000 || /^\s*</.test(source)) return '';
  const start = /"speech"\s*:\s*"/.exec(source);
  if (!start) return '';
  let output = '', escape = false;
  const tail = source.slice(start.index + start[0].length);
  for (let i=0;i<tail.length;i++) {
    const char=tail[i];
    if (escape) {
      if (char==='u') { const hex=tail.slice(i+1,i+5); if (!/^[0-9a-f]{4}$/i.test(hex)) break; output+=String.fromCharCode(parseInt(hex,16)); i+=4; }
      else output+=({ n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','"':'"','\\':'\\','/':'/' } as Record<string,string>)[char] ?? '';
      escape=false;
    } else if (char==='\\') escape=true;
    else if (char==='"') break;
    else output+=char;
  }
  return output;
}
/** Seven boundaries: size, transport text, JSON, shape, fields, whitelist, exactly-once. */
export function parseCompleteResponse(source: string): AIResponse | null {
  if (!source.trim() || source.length>40000 || /^\s*</.test(source)) return null;
  let value: unknown; try { value=JSON.parse(source); } catch { return null; }
  if (!isRecord(value) || Object.keys(value).some(k=>!['speech','action','question','storyboard'].includes(k))) return null;
  if (typeof value.speech!=='string' || !value.speech.trim() || value.speech.length>16000 || (value.question!==undefined && (typeof value.question!=='string' || value.question.length>2000))) return null;
  if (!isAIAction(value.action) || Object.keys(value.action).some(k=>!['type','target'].includes(k))) return null;
  let storyboard: AIResponse['storyboard'];
  if(value.storyboard!==undefined){const s=value.storyboard;if(!isRecord(s)||Object.keys(s).some(k=>!['scene','intensity','caption'].includes(k))||!['forest','city','leaf'].includes(String(s.scene))||typeof s.intensity!=='number'||!Number.isFinite(s.intensity)||s.intensity<0||s.intensity>1||typeof s.caption!=='string'||s.caption.length>200)return null;storyboard={scene:s.scene as 'forest'|'city'|'leaf',intensity:s.intensity,caption:s.caption};}
  return { speech:value.speech, action:value.action, ...(typeof value.question==='string'?{question:value.question}:{}),...(storyboard?{storyboard}:{}) };
}
export function createAIExecutor(dispatch: (action: AIAction)=>void) {
  const executed=new Set<string>();
  return { preview: extractSpeech, complete(id:string,source:string) {
    const parsed=parseCompleteResponse(source);
    if (!parsed || executed.has(id)) return false;
    executed.add(id); if (executed.size>300) executed.delete(executed.values().next().value ?? '');
    dispatch(parsed.action); return true;
  } };
}
