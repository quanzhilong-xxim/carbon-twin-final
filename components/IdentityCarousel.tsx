'use client';
import dynamic from 'next/dynamic';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { ArrowUpRight, Check } from 'lucide-react';
import { THEMES, useCarbonStore, type Identity } from '@/lib/store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/lib/stores/UIStore';
import RoleGuide from './RoleGuide';
import type { AvatarAction } from './3d/IdentityAvatar';
import type { AvatarView } from './3d/ExploreCharacter';
import { selectLiteraryCopy } from '@/lib/copywriting';
import {isNativeClipPreview} from '@/lib/visuals/exploreCharacterAssets';
import CharacterRoom, { characterActions, characterViews } from './CharacterRoom';
import './explore-v7.css';
import './character-room.css';
// Reserve the same space while the viewer chunk loads. On mobile a late
// 39px card growth could move the exhibit button between pointerdown/up.
const Avatar=dynamic(()=>import('./3d/IdentityAvatar'),{ssr:false,loading:()=> <div className="avatar-stage avatar-stage-v3" aria-hidden="true"/>});
const identities:Identity[]=['student','business','city'];
function IdentityCard({id,index,active,choose,visible}:{id:Identity;index:number;active:boolean;choose:()=>void;visible:boolean}){
 const reduced=useUIStore(s=>s.reduced),locked=useUIStore(s=>s.networkBusy),[hover,setHover]=useState(false);
 const targetX=useMotionValue(0),targetY=useMotionValue(0),rx=useSpring(targetX,{stiffness:160,damping:24}),ry=useSpring(targetY,{stiffness:160,damping:24});
 const rect=useRef<DOMRect|null>(null),theme=THEMES[id];
 const unit=useRef<HTMLDivElement>(null),cardVisible=useInView(unit,{margin:'120px'});
 const [gesture,setGesture]=useState<{action:AvatarAction;sequence:number}>({action:'idle',sequence:0});
 const remaining=useRef(0),timedSequence=useRef(-1);
 const [view,setView]=useState<AvatarView>('front');
 const [room,setRoom]=useState(false),[paused,setPaused]=useState(false);
 const perform=(action:AvatarAction)=>{if(!active)choose();setGesture(g=>({action,sequence:g.sequence+1}));};
 const names:Record<Identity,string>={student:'星遥 · THE EXPLORER',business:'产业领航者 · THE BUILDER',city:'智衡 · THE STEWARD'};
 useEffect(()=>{if(isNativeClipPreview||paused||gesture.action==='idle')return;if(timedSequence.current!==gesture.sequence){timedSequence.current=gesture.sequence;remaining.current=2400;}const started=performance.now();const timer=setTimeout(()=>{remaining.current=0;setGesture(g=>({...g,action:'idle'}));},remaining.current);return()=>{clearTimeout(timer);remaining.current=Math.max(0,remaining.current-(performance.now()-started));};},[gesture,paused]);
 const completed=useCallback((sequence:number)=>setGesture(current=>current.sequence===sequence?{...current,action:'idle'}:current),[]);
 return <div ref={unit} className="identity-unit" data-character={id} data-action={gesture.action}><motion.button className={`identity-card identity-${id} ${active?'selected':''}`} aria-pressed={active} aria-label={`选择身份：${theme.label}`} disabled={locked} onClick={()=>{choose();perform('guide');}}
 onFocus={()=>setHover(true)} onBlur={()=>setHover(false)} onPointerEnter={event=>{rect.current=event.currentTarget.getBoundingClientRect();setHover(true);}}
 onPointerMove={event=>{if(reduced||event.pointerType==='touch')return;const r=rect.current;if(!r)return;const x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;targetX.set((.5-y)*7);targetY.set((x-.5)*9);event.currentTarget.style.setProperty('--pointer-x',`${x*100}%`);event.currentTarget.style.setProperty('--pointer-y',`${y*100}%`);}}
 onPointerLeave={()=>{setHover(false);targetX.set(0);targetY.set(0);}} style={{rotateX:reduced?0:rx,rotateY:reduced?0:ry,'--card-accent':theme.accent} as never}>
  <div className="identity-card-top"><span>0{index+1} / {id==='student'?'THE LEARNER':id==='business'?'THE BUILDER':'THE STEWARD'}</span>{active?<Check size={18}/>:<ArrowUpRight size={18}/>}</div>
  <Avatar id={id} engaged={hover} reduced={reduced} visible={visible&&cardVisible&&active&&!room} active={active} action={gesture.action} sequence={gesture.sequence} view={view} paused={paused} onActionComplete={completed}/>
  <div className="identity-copy"><span className="tiny-label">{names[id]}</span><h3>{theme.label}</h3><p>{theme.description}</p><div className="identity-tags">{theme.tags.map(tag=><span key={tag}>{tag}</span>)}</div></div>
 </motion.button><div className="character-views" role="group" aria-label={`${theme.label}的观察角度`}>{characterViews.map(item=><button key={item.id} disabled={locked} aria-pressed={view===item.id} onClick={()=>{if(!active)choose();setView(item.id);}}>{item.label}</button>)}</div><div className="character-actions" role="group" aria-label={`${theme.label}的独立动作`}>{characterActions(id).map(item=><button key={item.action} disabled={locked} aria-pressed={gesture.action===item.action} onClick={()=>{setPaused(false);perform(item.action);}}>{item.label}</button>)}</div><div className="character-open-controls"><button disabled={locked} onClick={()=>{if(!active)choose();setRoom(true);}}>进入角色展厅 <ArrowUpRight size={14}/></button><button disabled={locked} aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?'继续动作':'暂停动作'}</button></div>{room&&<CharacterRoom id={id} reduced={reduced} onClose={()=>setRoom(false)}/>}</div>;
}
export default function IdentityCarousel(){
 const active=useCarbonStore(s=>s.activeIdentity),setIdentity=useCarbonStore(s=>s.setIdentity),locked=useUIStore(s=>s.networkBusy),ref=useRef<HTMLDivElement>(null),visible=useInView(ref,{margin:'160px'});
 return <div className="identity-experience" ref={ref}><div className="identity-stage" role="group" aria-label="选择你的身份" onKeyDown={event=>{if(!(event.target instanceof HTMLElement)||!event.target.matches('.identity-card')||!['ArrowLeft','ArrowRight'].includes(event.key)||locked)return;event.preventDefault();const i=(identities.indexOf(active)+(event.key==='ArrowLeft'?2:1))%3;setIdentity(identities[i]);ref.current?.querySelectorAll<HTMLButtonElement>('.identity-card')[i]?.focus();}}>
 {identities.map((id,index)=><IdentityCard key={id} id={id} index={index} active={active===id} visible={visible} choose={()=>setIdentity(id)}/>)}</div>
 <div className="identity-selection-note"><span className="live-dot"/><p aria-live="polite">{THEMES[active].focus}</p><span>{selectLiteraryCopy({page:'identity',scene:active,position:'reflection',category:'philosophy'})?.text}</span></div><p className="identity-v7-help">三个视角共享同一套科学依据。选择后，探索引导随之改变；身份保存在当前浏览器。键盘左右方向键可切换身份。</p><RoleGuide/></div>;
}
