'use client';
import dynamic from 'next/dynamic';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { ArrowUpRight, Check } from 'lucide-react';
import { THEMES, useCarbonStore, type Identity } from '@/lib/store';
import { useRef, useState } from 'react';
import { useUIStore } from '@/lib/stores/UIStore';
const Avatar=dynamic(()=>import('./3d/IdentityAvatar'),{ssr:false});
const identities:Identity[]=['student','business','city'];
function IdentityCard({id,index,active,choose,visible}:{id:Identity;index:number;active:boolean;choose:()=>void;visible:boolean}){
 const reduced=useUIStore(s=>s.reduced),locked=useUIStore(s=>s.networkBusy),[hover,setHover]=useState(false);
 const targetX=useMotionValue(0),targetY=useMotionValue(0),rx=useSpring(targetX,{stiffness:160,damping:24}),ry=useSpring(targetY,{stiffness:160,damping:24});
 const rect=useRef<DOMRect|null>(null),theme=THEMES[id];
 return <motion.button className={`identity-card identity-${id} ${active?'selected':''}`} aria-pressed={active} aria-label={`选择身份：${theme.label}`} disabled={locked} onClick={choose}
 onFocus={()=>setHover(true)} onBlur={()=>setHover(false)} onPointerEnter={event=>{rect.current=event.currentTarget.getBoundingClientRect();setHover(true);}}
 onPointerMove={event=>{if(reduced||event.pointerType==='touch')return;const r=rect.current;if(!r)return;const x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;targetX.set((.5-y)*7);targetY.set((x-.5)*9);event.currentTarget.style.setProperty('--pointer-x',`${x*100}%`);event.currentTarget.style.setProperty('--pointer-y',`${y*100}%`);}}
 onPointerLeave={()=>{setHover(false);targetX.set(0);targetY.set(0);}} style={{rotateX:reduced?0:rx,rotateY:reduced?0:ry,'--card-accent':theme.accent} as never}>
  <div className="identity-card-top"><span>0{index+1} / {id==='student'?'THE LEARNER':id==='business'?'THE BUILDER':'THE STEWARD'}</span>{active?<Check size={18}/>:<ArrowUpRight size={18}/>}</div>
  <Avatar id={id} engaged={hover} reduced={reduced} visible={visible}/>
  <div className="identity-copy"><span className="tiny-label">{active?'YOUR PERSPECTIVE / 当前视角':'A DIFFERENT LENS / 另一种视角'}</span><h3>{theme.label}</h3><p>{theme.description}</p><div className="identity-tags">{theme.tags.map(tag=><span key={tag}>{tag}</span>)}</div></div>
 </motion.button>;
}
export default function IdentityCarousel(){
 const active=useCarbonStore(s=>s.activeIdentity),setIdentity=useCarbonStore(s=>s.setIdentity),locked=useUIStore(s=>s.networkBusy),ref=useRef<HTMLDivElement>(null),visible=useInView(ref,{margin:'160px'});
 return <div className="identity-experience" ref={ref}><div className="identity-stage" role="group" aria-label="选择你的身份" onKeyDown={event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key)||locked)return;event.preventDefault();const i=(identities.indexOf(active)+(event.key==='ArrowLeft'?2:1))%3;setIdentity(identities[i]);ref.current?.querySelectorAll<HTMLButtonElement>('.identity-card')[i]?.focus();}}>
 {identities.map((id,index)=><IdentityCard key={id} id={id} index={index} active={active===id} visible={visible} choose={()=>setIdentity(id)}/>)}</div>
 <div className="identity-selection-note"><span className="live-dot"/><p aria-live="polite">{THEMES[active].focus}</p><span>点击人物，切换观察世界的方式</span></div></div>;
}
