'use client';
import { evidenceContext, validateCitations, usedCitations, isEvidenceAbstention, validateFactorUnits, validateSourceAttribution } from '@/lib/ai/evidence';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSimulator } from '@/lib/core/SimulatorEngine';
import { acquireDialogueLease } from '@/lib/core/dialogueLease';
import { createAIExecutor, parseCompleteResponse } from '@/lib/ai/AIExecutor';
import { dispatchAIAction } from '@/lib/ai/actions';
import { setAdvice } from '@/lib/stores/UIStore';
import type { CarbonMessage } from '@/lib/ai/contracts';
import type { Identity } from '@/lib/store';
import { useLearningAccount } from '@/lib/hooks/useLearningAccount';
import { allLearning, recordLearning } from '@/lib/storage/LearningDB';
import { notifyToast, offlineMessage } from '@/components/Toast';
import { REFERENCES } from '@/lib/references';
import type { Citation } from '@/lib/ai/retrieval';
import {spaceForBuilding} from '@/lib/experience/spaces';
import {useTwinStore} from '@/lib/experience/store';

export const messageText = (message: CarbonMessage) => message.parts.filter(p => p.type === 'text').map(p => p.text).join('');
type RequestOwner = { id: string; lease: NonNullable<ReturnType<typeof acquireDialogueLease>>; account: string; context: string };
type CompletedResponse = { id: string; text: string };

function textServiceFailure(error: unknown) {
  const candidate = error as { name?: unknown; message?: unknown; status?: unknown; statusCode?: unknown; response?: { status?: unknown } } | null;
  const status = [candidate?.status, candidate?.statusCode, candidate?.response?.status].find(value => typeof value === 'number') as number | undefined;
  const name = typeof candidate?.name === 'string' ? candidate.name : '';
  const message = typeof candidate?.message === 'string' ? candidate.message : '';
  if (status === 401) return 'AI文本服务认证失败（HTTP 401），请检查服务端凭证。';
  if (status === 402) return 'AI文本服务余额不足（HTTP 402），请为服务端账户充值或切换供应商；本地碳计算与知识库仍可用。';
  if (status === 403) return 'AI文本服务拒绝请求（HTTP 403），请检查服务权限。';
  if (status === 429) return 'AI文本服务请求频率或额度受限（HTTP 429），请稍后重试。';
  if (status && status >= 500) return `AI文本服务暂不可用（HTTP ${status}），请稍后重试。`;
  if (/timeout|timed out|超时/i.test(`${name} ${message}`)) return 'AI文本服务请求超时；语音服务尚未调用，请稍后重试。';
  if (error instanceof TypeError || /network|fetch|连接中断/i.test(`${name} ${message}`)) return 'AI文本服务网络连接中断；语音服务尚未调用，请检查网络后重试。';
  return 'AI文本服务返回错误；语音服务尚未调用，请稍后重试。';
}

/** Each identity owns a separate mounted session; late/aborted streams cannot execute actions. */
export function useCarbonChat(identity: Identity, onSpeakable?: (id: string, text: string) => void) {
  const { inputs } = useSimulator();
  const account = useLearningAccount();
  const [failure, setFailure] = useState('');
  const [completedResponse, setCompletedResponse] = useState<CompletedResponse | null>(null);
  const owner = useRef<RequestOwner | null>(null), alive = useRef(true);
  const executor = useMemo(() => createAIExecutor(dispatchAIAction), []);
  const transport = useMemo(() => new DefaultChatTransport<CarbonMessage>({ api: '/api/chat', prepareSendMessagesRequest: ({ messages, body }) => ({ body: { ...body, messages: messages.slice(-16) } }) }), []);
  const chat = useChat<CarbonMessage>({ transport,
    onFinish: ({ message, isAbort, isError, isDisconnect }) => {
      const current = owner.current;
      if (!alive.current || !current) return;
      owner.current = null;
      current.lease.finish();
      if (isAbort || isError || isDisconnect) {
        if (!isAbort) { setFailure(isDisconnect ? 'AI文本服务连接中断；已保留收到的文字，未执行界面动作或语音合成。' : 'AI文本服务响应失败；已保留收到的文字，未执行界面动作或语音合成。'); notifyToast(offlineMessage); }
        return;
      }
      const source = messageText(message), parsed = parseCompleteResponse(source);
      // Only reject a stale answer when the response actually carries a requestId. Older
      // streams (and some SDK paths) omit message metadata entirely; requiring it silently
      // discarded valid answers, which also meant completedResponse / TTS never ran.
      const metaRequest = message.metadata?.requestId;
      if ((metaRequest && metaRequest !== current.id) || !parsed) {
        setFailure('回复未完整通过校验；已保留可读文字，并阻止执行动作。');
        return;
      }
      // A response without citation metadata is a conversational intro/answer, not an
      // evidence-backed advisory answer: surface it for reading + TTS instead of failing
      // the citation gate (which previously left a red error under a perfectly good reply).
      if (message.metadata?.citations === undefined || message.metadata?.citations?.length === 0) {
        const plain = [parsed.speech, parsed.question].filter(Boolean).join('\n') || source;
        setCompletedResponse({ id: message.id, text: plain });
        onSpeakable?.(message.id, plain);
        return;
      }
      // Role self-introduction turns carry no citations by design (no external factual
      // claims), so they skip the citation/unit gates but still surface through TTS.
      if (message.metadata?.mode === 'intro') {
        void recordLearning({type:'answer',text:source,identity,citations:[]}, current.account);
        const introText = [parsed.speech, parsed.question].filter(Boolean).join('\n') || source;
        setCompletedResponse({ id: message.id, text: introText });
        onSpeakable?.(message.id, introText);
        return;
      }
      if(isEvidenceAbstention(parsed.speech,message.metadata?.citations??[])){setFailure('检索证据不足，已保留拒答，未执行动作或生成诊断。');return;}
      const answer=`${parsed.speech}\n${parsed.question ?? ''}`;
      if(!validateFactorUnits(answer)){setFailure('回复中的排放因子单位倒置，未采纳为建议或导出。正确单位是 kg CO₂/kWh，请重试并核对原文。');return;}
      if(!validateCitations(answer,message.metadata?.citations??[])){setFailure('回答缺少有效检索引用，未采纳为建议，未执行动作。请重试或核对原文。');return;}
      if(!validateSourceAttribution(answer,message.metadata?.citations??[])){setFailure('回答中的机构名称与引用来源不一致，未采纳为建议或导出。请重新提问并核对原文。');return;}
      void recordLearning({type:'answer',text:source,identity,citations:message.metadata?.citations?.map(c=>c.referenceId)??[]}, current.account);
      if (executor.complete(message.id, source)) {
        const speech = [answer, message.metadata?.calculationSummary].filter(Boolean).join('\n\n') || source;
        setAdvice(speech,current.context,usedCitations(answer,message.metadata?.citations??[]));
        setCompletedResponse({ id: message.id, text: speech });
        onSpeakable?.(message.id, speech);
      }
    },
    onError: (error: Error) => {
      if (!alive.current || !owner.current) return;
      const current = owner.current; owner.current = null;
      current.lease.finish();
      setFailure(textServiceFailure(error));
      notifyToast(offlineMessage);
    },
  });
  const { stop,setMessages } = chat;
  useEffect(()=>{let active=true;void allLearning(account).then(rows=>{if(!active)return;const history:CarbonMessage[]=[];for(const row of rows.filter(row=>(row.type==='question'&&(row.identity===identity||!row.identity))||(row.type==='answer'&&row.identity===identity)).slice(-16)){if(row.type==='question') history.push({id:row.id,role:'user',parts:[{type:'text',text:row.text}]} as CarbonMessage); else if(row.type==='answer'){const citations:Citation[]=row.citations.map((id,index)=>{const ref=REFERENCES.find(r=>r.id===id);return ref?{id:index+1,referenceId:ref.id,title:ref.citation,url:ref.url,excerpt:`${ref.locator}: ${ref.quote} 释义：${ref.translation}`} : null;}).filter((c):c is Citation=>c!==null);history.push({id:row.id,role:'assistant',metadata:{citations},parts:[{type:'text',text:row.text}]} as CarbonMessage);}}setMessages(()=>history);});return()=>{active=false;};},[identity,account,setMessages]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; const current = owner.current; owner.current = null; current?.lease.cancel(); void stop(); };
  }, [stop]);
  const busy = chat.status === 'submitted' || chat.status === 'streaming';
  const cancel = () => { const current = owner.current; owner.current = null; current?.lease.cancel(); void stop(); };
  const send = async (text: string) => {
    if (!text.trim() || busy || owner.current) return false;
    const lease = acquireDialogueLease(() => { owner.current = null; void stop(); });
    if (!lease) { setFailure('当前计算尚未完成，请稍后重试。'); return false; }
    const requestId = crypto.randomUUID();
    const snapshot=useTwinStore.getState(),kind=spaceForBuilding(snapshot.experience.building);
    owner.current = { id: requestId, lease, account,context:evidenceContext(kind,snapshot.experience.selected,snapshot.energy,snapshot.devices,inputs) }; setFailure(''); setCompletedResponse(null);
    void recordLearning({ type: 'question', text, activity: inputs, identity }, account).catch(() => notifyToast('提问已发送，但浏览器未能保存这次学习记录。'));
    try { await chat.sendMessage({ text }, { body: { activities: inputs, identity, requestId, room:snapshot.energy,space:{kind,selected:snapshot.experience.selected,devices:snapshot.devices} } }); }
    catch (error) {
      if (owner.current?.id === requestId) { owner.current = null; lease.finish(); setFailure(textServiceFailure(error)); notifyToast(offlineMessage); }
    }
    return true;
  };
  return { messages: chat.messages, status: chat.status, error: chat.error, busy, failure, completedResponse, send, cancel, preview: executor.preview };
}
