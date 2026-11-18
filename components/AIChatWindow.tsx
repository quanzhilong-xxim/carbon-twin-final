'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, MessageCircle, Square, X, BookOpen, Mic } from 'lucide-react';
import { validateCitations, usedCitations, validateFactorUnits, validateSourceAttribution } from '@/lib/ai/evidence';
import { parseCompleteResponse } from '@/lib/ai/AIExecutor';
import { useCarbonChat, messageText } from '@/lib/hooks/useCarbonChat';
import type { Citation } from '@/lib/ai/retrieval';
import { useCarbonStore, THEMES, type Identity } from '@/lib/store';
import { roleProfile } from '@/lib/ai/roles';
import { useUIStore } from '@/lib/stores/UIStore';
import { REFERENCES, type AcademicReference } from '@/lib/references';
import GlassSurface from './GlassSurface';
import CitationModal from './CitationModal';
import AIStoryboard from './ecology/AIStoryboard';
import { useLearningAccount } from '@/lib/hooks/useLearningAccount';
import { exciteVisuals } from '@/lib/visualDynamics';
import { useSpeech } from '@/lib/hooks/useSpeech';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import SpeechControls from './SpeechControls';

function AIChatWindow({ identity, close, presentationQuestion }: { identity: Identity; close: () => void; presentationQuestion: string | null }) {
  const [draft, setDraft] = useState(''), [reference, setReference] = useState<AcademicReference | null>(null);
  const speakRef = useRef<(id: string, text: string) => void>(() => {});
  const { messages, status, busy, failure, error, completedResponse, send, cancel, preview } = useCarbonChat(identity, (id, text) => speakRef.current(id, text));
  const speechPlayer = useSpeech();
  const asr = useSpeechRecognition('zh-CN');
  const role = roleProfile(identity);
  const speechAutoSpeak = speechPlayer.autoSpeak, speakAnswer = speechPlayer.speak;
  const [readingId, setReadingId] = useState('');
  const autoHandled = useRef('');
  const submittedPresentation = useRef<string|null>(null);
  useEffect(() => {
    if (!completedResponse) return;
    if (autoHandled.current === completedResponse.id) return;
    autoHandled.current = completedResponse.id;
    // autoSpeak is the user's explicit preference (shared speech state). Do not gate it on
    // a separate "activated" flag: if the audio context is still suspended the player
    // surfaces an explicit autoplay notice with a one-click replay instead of staying silent.
    if (speechAutoSpeak) {
      setReadingId(completedResponse.id);
      speakAnswer(completedResponse.text);
    }
  }, [completedResponse, speechAutoSpeak, speakAnswer]);
  // Chat completion can also arrive before the completedResponse state is observed by this
  // component (stream finish/remount races). Drive auto-read from the completion callback as
  // well; the shared handled-id ref keeps it exactly-once.
  speakRef.current = (id, text) => {
    if (!speechAutoSpeak || !text || autoHandled.current === id) return;
    autoHandled.current = id;
    setReadingId(id);
    speakAnswer(text);
  };
  // UI-level fallback trigger: some SDK paths never invoke the hook completion callback, so
  // watch the busy -> idle transition and speak the last assistant message exactly once.
  const prevBusy = useRef(false);
  useEffect(() => {
    const finished = prevBusy.current && !busy && !error;
    prevBusy.current = busy;
    if (!finished || !speechAutoSpeak) return;
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    if (!last || autoHandled.current === last.id) return;
    const raw = messageText(last);
    const parsed = parseCompleteResponse(raw);
    const text = parsed ? [parsed.speech, parsed.question].filter(Boolean).join('\n') || raw : raw;
    if (!text) return;
    autoHandled.current = last.id;
    setReadingId(last.id);
    speakAnswer(text);
  }, [busy, error, messages, speechAutoSpeak, speakAnswer]);
  useEffect(()=>{if(presentationQuestion&&submittedPresentation.current!==presentationQuestion){submittedPresentation.current=presentationQuestion;void send(presentationQuestion);}},[presentationQuestion,send]);
  useEffect(()=>{const stop=()=>cancel();window.addEventListener('carbon-presentation-cancel',stop);return()=>window.removeEventListener('carbon-presentation-cancel',stop);},[cancel]);
  const scroll = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const lastAction = useUIStore(s => s.lastAction);
  useEffect(() => { input.current?.focus(); }, []);
  // Speech-to-text fills the draft; the user always confirms by pressing send
  // (or keeps typing), so a mis-recognition can never be sent automatically.
  useEffect(() => {
    if (!asr.transcript) return;
    setDraft(asr.transcript.slice(0, 2000));
  }, [asr.transcript]);
  useEffect(() => { const receive = (event: Event) => { if (event instanceof CustomEvent && typeof event.detail === 'string') { setDraft(event.detail); input.current?.focus(); } }; window.addEventListener('carbon-chat-draft',receive); return () => window.removeEventListener('carbon-chat-draft',receive); }, []);
  useEffect(() => { const receive = (event: Event) => { if (event instanceof CustomEvent && typeof event.detail === 'string') setDraft(event.detail); }; window.addEventListener('carbon-ask-evidence',receive); return () => window.removeEventListener('carbon-ask-evidence',receive); }, []);
  useEffect(() => {
    const element = scroll.current;
    if (element && element.scrollHeight - element.scrollTop - element.clientHeight < 220) element.scrollTo({ top: element.scrollHeight, behavior: 'auto' });
  }, [messages, status]);
  const submit = () => { const text = draft.trim(); if (!text || busy) return; speechPlayer.stop(); setDraft(''); void send(text); };
  const closeCitation = useCallback(() => setReference(null), []);
  const cite = (citation: Citation) => setReference(REFERENCES.find(r => r.id === citation.referenceId) ?? null);
  const renderCitations = (text: string, citations: Citation[]) => text.split(/(\[\d+\])/).map((part, index) => {
    const match = /^\[(\d+)\]$/.exec(part), citation = match ? citations.find(row => row.id === Number(match[1])) : undefined;
    return citation ? <button className="inline-citation" key={index} onClick={() => cite(citation)} aria-label={`阅读引用 ${citation.id}：${citation.title}`}>{part}</button> : <span key={index}>{part}</span>;
  });
  const actionLabel = lastAction.startsWith('RESTORE_ECOSYSTEM') ? '已点亮生态沙盘减碳路径' : lastAction.startsWith('FOCUS_MODEL') ? '已调整模型观察视角' : lastAction.startsWith('HIGHLIGHT_CHART') ? '已突出对应排放来源' : lastAction.startsWith('CHANGE_THEME') ? '已同步情景氛围' : '';
  return <><motion.aside initial={{ opacity: 0, x: 35, y: 12 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 25 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} id="ai-chat-panel" className="ai-chat" aria-label="碳知识 AI 教练" onKeyDown={event => { if (event.key === 'Escape') close(); }}><GlassSurface tilt={false}>
    <div className="chat-header"><span><span className="live-dot" /> CARBON / INTELLIGENCE</span><button aria-label="关闭 AI 聊天窗" onClick={close}><X size={17} /></button></div>
    <div className="chat-context"><BookOpen size={13} />{role.name} · {THEMES[identity].label}视角 · {role.scope.slice(0, 2).join(' / ')}</div>
    <SpeechControls speech={speechPlayer} />
    <div ref={scroll} className="chat-messages" data-lenis-prevent role="log" aria-label="对话记录">
      {messages.length === 0 && <div className="chat-welcome"><span>{role.english}.<br />{role.title}</span><p>{role.welcome}</p>{role.suggestions.map(question => <button key={question} onClick={() => setDraft(question)}>{question} ↗</button>)}</div>}
      {messages.map(message => {
        const raw = messageText(message), parsed = message.role === 'assistant' ? parseCompleteResponse(raw) : null;
        const speech = message.role === 'user' ? raw : parsed?.speech ?? preview(raw), citations = message.metadata?.citations ?? [];
        const answer=`${speech}\n${parsed?.question??''}`,verified=!!parsed&&validateCitations(answer,citations)&&validateFactorUnits(answer)&&validateSourceAttribution(answer,citations),displayCitations=verified?usedCitations(answer,citations):[];
        return <article key={message.id} className={`chat-message ${message.role}`}><span className="tiny-label">{message.role === 'user' ? 'YOU' : message.metadata?.mode === 'intro' ? `${message.metadata?.role ? roleProfile(message.metadata.role).name : role.name} · 角色介绍（非文献引用）` : verified?'EVIDENCE COACH / 引用编号已校验':'待核验 · 不作诊断'}</span><p>{renderCitations(speech, displayCitations)}</p>{message.role === 'assistant' && parsed && !busy && <button type="button" className="speech-read-button" onClick={() => { if (readingId === message.id && (speechPlayer.speaking || speechPlayer.loading || speechPlayer.paused)) speechPlayer.stop(); else { setReadingId(message.id); speechPlayer.speak([answer, verified && message.metadata?.calculationSummary].filter(Boolean).join('\n\n')); } }}>{readingId === message.id && (speechPlayer.speaking || speechPlayer.loading || speechPlayer.paused) ? '停止朗读' : '朗读回复'}</button>}{verified&&parsed?.storyboard && <AIStoryboard storyboard={parsed.storyboard}/>}{parsed?.question && <p className="coach-question">{renderCitations(parsed.question,displayCitations)}</p>}{verified&&message.metadata?.calculationSummary&&<p className="coach-question" style={{whiteSpace:'pre-line'}}>{message.metadata.calculationSummary}</p>}{displayCitations.length > 0 && <div className="chat-references">{displayCitations.map(c => <button key={c.id} onClick={() => cite(c)}>[{c.id}] {c.title} ↗</button>)}</div>}</article>;
      })}
      {busy && <AIStoryboard streaming/>}{busy && <p className="stream-status" role="status"><span className="live-dot" /> {status === 'submitted' ? '检索文献与连接模型…' : '正在生成 · 可随时停止'}</p>}
      {(failure || error) && <div className="chat-error" role="alert">{failure || '连接暂时中断，本地计算与知识库依然可用。'}</div>}
      {!busy && actionLabel && <p className="action-receipt" role="status">↗ {actionLabel}</p>}
    </div>
    {(asr.notice || asr.listening) && <p className="chat-asr-status" role="status">{(asr.listening ? (asr.transcript ? `识别中：${asr.transcript.slice(0, 90)}` : '正在聆听…说完会自动结束；也可点麦克风停止。') : asr.notice)}</p>}
    <form onSubmit={event => { event.preventDefault(); submit(); }} className="chat-input"><input ref={input} value={draft} maxLength={2000} onChange={e => setDraft(e.target.value)} placeholder="询问数据背后的原因…" aria-label="向碳知识教练提问" disabled={busy} /><button type="button" className={`chat-mic${asr.listening ? ' is-listening' : ''}`} aria-label={asr.listening ? '停止语音输入' : '语音输入'} aria-pressed={asr.listening} title={asr.support === 'unsupported' ? '当前浏览器不支持语音识别，请使用键盘输入' : '语音输入（由浏览器识别，可能需要联网）'} onClick={() => { if (asr.listening) asr.stop(); else asr.start(); }} disabled={busy}><Mic size={16} /></button>{asr.listening && <button type="button" className="chat-mic-cancel" aria-label="取消语音输入" onClick={() => asr.cancel()}><X size={14} /></button>}{busy ? <button type="button" aria-label="停止生成" onClick={cancel}><Square size={15} /></button> : <button aria-label="发送问题" disabled={!draft.trim()}><ArrowUp size={18} /></button>}</form>
    <div className="chat-disclaimer">AI 建议需结合文献核验 · 不替代专业盘查</div>
  </GlassSurface></motion.aside><CitationModal reference={reference} onClose={closeCitation} /></>;
}
export default function AIChat() {
  const account = useLearningAccount();
  const [presentationQuestion,setPresentationQuestion]=useState<string|null>(null);
  useEffect(()=>{const ask=(e:Event)=>{if(e instanceof CustomEvent&&typeof e.detail==='string'){setPresentationQuestion(e.detail);setOpen(true);}};const done=()=>{setPresentationQuestion(null);setOpen(false);};window.addEventListener('carbon-presentation-ask',ask);window.addEventListener('carbon-presentation-close',done);return()=>{window.removeEventListener('carbon-presentation-ask',ask);window.removeEventListener('carbon-presentation-close',done);};},[]);
  const [open, setOpen] = useState(false), identity = useCarbonStore(s => s.activeIdentity);
  const launcher = useRef<HTMLButtonElement>(null);
  useEffect(() => { const receive = (event: Event) => { if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') return; setOpen(true); const question = event.detail; const timer = setTimeout(() => window.dispatchEvent(new CustomEvent('carbon-chat-draft',{detail:question})),200); pending.current.push(timer); exciteVisuals(.7); }; const pending = { current: [] as ReturnType<typeof setTimeout>[] }; window.addEventListener('carbon-ask-evidence',receive); return () => { window.removeEventListener('carbon-ask-evidence',receive);pending.current.forEach(clearTimeout); }; }, []);
  const close = () => { setOpen(false); launcher.current?.focus(); };
  return <><motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: .96 }} ref={launcher} aria-label="打开碳知识 AI 教练" className={`chat-launcher ${open ? 'is-open' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="ai-chat-panel"><MessageCircle size={21} /><span>EVIDENCE COACH</span><span className="live-dot" /></motion.button><AnimatePresence>{open && <AIChatWindow key={`${identity}:${account}`} identity={identity} close={close} presentationQuestion={presentationQuestion} />}</AnimatePresence></>;
}
