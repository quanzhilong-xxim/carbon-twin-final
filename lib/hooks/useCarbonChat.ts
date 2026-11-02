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
import { useSession } from 'next-auth/react';
import { allLearning, recordLearning } from '@/lib/storage/LearningDB';
import { notifyToast, offlineMessage } from '@/components/Toast';
import { REFERENCES } from '@/lib/references';
import type { Citation } from '@/lib/ai/retrieval';
import {spaceForBuilding} from '@/lib/experience/spaces';
import {useTwinStore} from '@/lib/experience/store';

export const messageText = (message: CarbonMessage) => message.parts.filter(p => p.type === 'text').map(p => p.text).join('');
type RequestOwner = { id: string; lease: NonNullable<ReturnType<typeof acquireDialogueLease>>; account: string; context: string };

/** Each identity owns a separate mounted session; late/aborted streams cannot execute actions. */
export function useCarbonChat(identity: Identity) {
  const { inputs } = useSimulator();
  const {data:session,status:sessionStatus}=useSession();
  const [failure, setFailure] = useState('');
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
        if (!isAbort) { setFailure('连接中断；已保留收到的文字，未执行界面动作。'); notifyToast(offlineMessage); }
        return;
      }
      const source = messageText(message), parsed = parseCompleteResponse(source);
      if (message.metadata?.requestId !== current.id || !parsed) {
        setFailure('回复未完整通过校验；已保留可读文字，并阻止执行动作。');
        return;
      }
      if(isEvidenceAbstention(parsed.speech,message.metadata?.citations??[])){setFailure('检索证据不足，已保留拒答，未执行动作或生成诊断。');return;}
      const answer=`${parsed.speech}\n${parsed.question ?? ''}`;
      if(!validateFactorUnits(answer)){setFailure('回复中的排放因子单位倒置，未采纳为建议或导出。正确单位是 kg CO₂/kWh，请重试并核对原文。');return;}
      if(!validateCitations(answer,message.metadata?.citations??[])){setFailure('回答缺少有效检索引用，未采纳为建议，未执行动作。请重试或核对原文。');return;}
      if(!validateSourceAttribution(answer,message.metadata?.citations??[])){setFailure('回答中的机构名称与引用来源不一致，未采纳为建议或导出。请重新提问并核对原文。');return;}
      void recordLearning({type:'answer',text:source,identity,citations:message.metadata?.citations?.map(c=>c.referenceId)??[]}, current.account);
      if (executor.complete(message.id, source)) setAdvice([answer,message.metadata?.calculationSummary].filter(Boolean).join('\n\n'),current.context,usedCitations(answer,message.metadata?.citations??[]));
    },
    onError: () => {
      if (!alive.current || !owner.current) return;
      const current = owner.current; owner.current = null;
      current.lease.finish();
      setFailure('AI 暂时无法连接。活动数据与本地知识库仍可使用，请稍后重试。');
      notifyToast(offlineMessage);
    },
  });
  const { stop,setMessages } = chat;
  useEffect(()=>{if(sessionStatus==='loading')return;let active=true;const account=session?.user.id??'guest';void allLearning(account).then(rows=>{if(!active)return;const history:CarbonMessage[]=[];for(const row of rows.filter(row=>(row.type==='question'&&(row.identity===identity||!row.identity))||(row.type==='answer'&&row.identity===identity)).slice(-16)){if(row.type==='question') history.push({id:row.id,role:'user',parts:[{type:'text',text:row.text}]} as CarbonMessage); else if(row.type==='answer'){const citations:Citation[]=row.citations.map((id,index)=>{const ref=REFERENCES.find(r=>r.id===id);return ref?{id:index+1,referenceId:ref.id,title:ref.citation,url:ref.url,excerpt:`${ref.locator}: ${ref.quote} 释义：${ref.translation}`} : null;}).filter((c):c is Citation=>c!==null);history.push({id:row.id,role:'assistant',metadata:{citations},parts:[{type:'text',text:row.text}]} as CarbonMessage);}}setMessages(()=>history);});return()=>{active=false;};},[identity,session?.user.id,sessionStatus,setMessages]);
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
    const account=session?.user.id??'guest';
    const snapshot=useTwinStore.getState(),kind=spaceForBuilding(snapshot.experience.building);
    owner.current = { id: requestId, lease, account,context:evidenceContext(kind,snapshot.experience.selected,snapshot.energy,snapshot.devices,inputs) }; setFailure('');
    void recordLearning({ type: 'question', text, activity: inputs, identity }, account).catch(() => notifyToast('提问已发送，但浏览器未能保存这次学习记录。'));
    try { await chat.sendMessage({ text }, { body: { activities: inputs, identity, requestId, room:snapshot.energy,space:{kind,selected:snapshot.experience.selected,devices:snapshot.devices} } }); }
    catch {
      if (owner.current?.id === requestId) { owner.current = null; lease.finish(); setFailure('连接中断；你的活动数据已保留。'); notifyToast(offlineMessage); }
    }
    return true;
  };
  return { messages: chat.messages, status: chat.status, error: chat.error, busy, failure, send, cancel, preview: executor.preview };
}
