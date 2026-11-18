'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Pause, Play, X } from 'lucide-react';
import type { Identity } from '@/lib/store';
import type { AvatarAction } from './3d/IdentityAvatar';
import type { AvatarView } from './3d/ExploreCharacter';
import { exploreCharacterAssets,isNativeClipPreview,isV132StudentPreview } from '@/lib/visuals/exploreCharacterAssets';

const Avatar = dynamic(() => import('./3d/ExploreCharacter'), { ssr: false });
export const characterViews = [{ id: 'front', label: '正面' }, { id: 'left', label: '左侧' }, { id: 'right', label: '右侧' }, { id: 'threequarter', label: '45°' }, { id: 'back', label: '背面' }, { id: 'detail', label: '面部' }] as const;
export const characterActions = (id: Identity): { action: AvatarAction; label: string }[] => isNativeClipPreview?[
  {action:'greeting',label:'挥手致意'},{action:'turning',label:'轻转身'},{action:'idle',label:'自然休息'},
  // V13.2 candidate exports two new authored clips: Look (head turn + blink) and
  // Smile (morph-based). They are only offered for the student candidate build.
  ...(isV132StudentPreview && id === 'student' ? [{action:'thinking' as const,label:'观察 Look'},{action:'recording' as const,label:'微笑 Smile'}] : []),
]:[
  { action: 'greeting', label: id === 'student' ? '挥手' : id === 'business' ? '致意' : '引导' },
  { action: 'blink', label: '眨眼' }, { action: 'nod', label: '点头' },
  { action: 'listening', label: id === 'student' ? '展示相机' : id === 'city' ? '查看平板' : '看数据' },
  { action: 'guide', label: '介绍' },
  { action: 'observing', label: id === 'student' ? '观察城市' : id === 'city' ? '观察规划' : '观察趋势' },
  ...(id === 'student' ? [{ action: 'recording' as const, label: '记录笔记' }, { action: 'turning' as const, label: '轻转身' }] : [{ action: 'thinking' as const, label: '思考' }]),
  ...(id !== 'student' && exploreCharacterAssets[id].version.startsWith('v12') ? [{ action: 'standing' as const, label: id === 'business' ? '起身站立' : '自然站姿' }, { action: 'walking' as const, label: '步态检查' }, { action: 'turning' as const, label: '轻转身' }] : []),
];
const details = {
  student: { title: '星遥 · 学生探索者', scene: '在城市里，保持好奇。', description: '玫粉编发、护目镜和薰衣草色外套，配合相机、环保背包与浅色工装裤。用观察与记录发现日常生活中的低碳线索。' },
  business: { title: '产业领航者 · 企业主', scene: '让每一次决策，面向更长远的未来。', description: '深色细条纹西装、绿领带、眼镜与腕表。玻璃窗外是城市，桌上是规划模型；把企业的价值链放回更大的环境里思考。' },
  city: { title: '智衡 · 城市管理者', scene: '把城市，看作共同的生活。', description: '象牙白分层长外套、深色内搭、金色衣缘与数据平板。用克制的动作与开阔的视野，观察交通、空间和公共生活。' },
};

export default function CharacterRoom({ id, reduced, onClose }: { id: Identity; reduced: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), remaining = useRef(0), timedSequence = useRef(-1);
  const [view, setView] = useState<AvatarView>('front'), [paused, setPaused] = useState(false);
  const [gesture, setGesture] = useState<{ action: AvatarAction; sequence: number }>({ action: 'idle', sequence: 0 });
  useEffect(() => {
    const node = dialog.current!, focus = document.activeElement as HTMLElement | null;
    node.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { node.close(); document.body.style.overflow = overflow; focus?.focus(); };
  }, []);
  useEffect(() => {
    if (isNativeClipPreview || paused || gesture.action === 'idle') return;
    if (timedSequence.current !== gesture.sequence) {
      timedSequence.current = gesture.sequence;
      remaining.current = gesture.action === 'walking' ? 9000 : ['recording', 'listening', 'thinking', 'standing'].includes(gesture.action) ? 6500 : 3000;
    }
    const started = performance.now();
    const timer = setTimeout(() => {
      remaining.current = 0;
      setGesture(g => ({ ...g, action: 'idle' }));
    }, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [gesture, paused]);
  const perform = (action: AvatarAction) => {
    setPaused(false); setGesture(g => ({ action, sequence: g.sequence + 1 }));
  };
  const completed=useCallback((sequence:number)=>setGesture(current=>current.sequence===sequence?{...current,action:'idle'}:current),[]);
  const copy = details[id];
  return <dialog ref={dialog} className="character-room" aria-labelledby="character-room-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="character-room__layout">
      <header><div><small>CARBONTWIN / CHARACTER PORTRAITS</small><h2 id="character-room-title">{copy.title}</h2></div><button type="button" aria-label="关闭角色展厅" onClick={onClose}><X size={22} /></button></header>
      <div className={`character-room__scene character-room__scene--${id}`}>
        <Avatar id={id} reduced={reduced} visible active engaged={false} view={view} action={gesture.action} sequence={gesture.sequence} paused={paused} interactive onActionComplete={completed} />
        <span className="character-room__hint">拖动旋转 · 滚轮缩放 · Esc 关闭</span>
      </div>
      <aside><span className="character-room__kicker">ANOTHER WAY TO SEE THE CITY</span><h3>{copy.scene}</h3><p>{copy.description}</p>
        <div className="character-views" role="group" aria-label="展厅观察角度">{[...characterViews, {id:'eyes',label:'眼部'}, {id:'hair',label:'头发'}, {id:'outfit',label:'服装'}, {id:'hands',label:'手部'}, {id:'prop',label:'道具'}].map(item => <button type="button" key={item.id} aria-pressed={view === item.id} onClick={() => setView(item.id as AvatarView)}>{item.label}</button>)}</div>
        <div className="character-actions" role="group" aria-label="展厅角色动作">{characterActions(id).map(item => <button type="button" key={item.action} aria-pressed={gesture.action === item.action} onClick={() => perform(item.action)}>{item.label}</button>)}</div>
        <button type="button" className="character-room__pause" aria-pressed={paused} onClick={() => setPaused(p => !p)}>{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? '继续动作' : '暂停动作'}</button>
        <p className="character-room__credit">面部基础 © pixiv Inc. · VRM Public License 1.0<br />Rain / Snow © Blender Foundation · CC BY 4.0<br />CarbonTwin 改编网格、服装、材质、道具与表情。</p>
      </aside>
    </div>
  </dialog>;
}
