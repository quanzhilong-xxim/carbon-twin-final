'use client';
import {useEffect,useRef,useState} from 'react';
import gsap from 'gsap';
import {useTwinStore} from '@/lib/experience/store';
import {useUIStore,setAdvice} from '@/lib/stores/UIStore';
import {useSimulator} from '@/lib/core/SimulatorEngine';
import {evidenceContext} from '@/lib/ai/evidence';
import {retrieve} from '@/lib/ai/retrieval';
import {calculateSpace} from '@/lib/experience/spaces';
import {notifyToast} from '../Toast';

/** The reducer remains the camera authority. Timings never fake asset readiness. */
export default function PresentationMode(){
 const [running,setRunning]=useState(false),[step,setStep]=useState(''),abort=useRef<AbortController|null>(null),state=useTwinStore(s=>s.experience.state),busy=useUIStore(s=>s.networkBusy);
 const {inputs}=useSimulator();
 const stop=()=>{abort.current?.abort();window.dispatchEvent(new Event('carbon-presentation-cancel'));window.speechSynthesis?.cancel();};
 useEffect(()=>()=>{abort.current?.abort();useUIStore.setState({presentation:false});window.speechSynthesis?.cancel();},[]);
 useEffect(()=>{
  if(!running)return;
  const block=(e:Event)=>{if(e instanceof KeyboardEvent&&e.key==='Escape'){stop();e.preventDefault();return;}if(e.target instanceof Element&&e.target.closest('.presentation-control'))return;e.preventDefault();e.stopImmediatePropagation();};
  const events=['pointerdown','pointerup','click','keydown','wheel'] as const;
  events.forEach(name=>document.addEventListener(name,block,{capture:true,passive:false}));
  return()=>events.forEach(name=>document.removeEventListener(name,block,true));
 },[running]);
 const start=async()=>{
  const controller=new AbortController();abort.current=controller;const signal=controller.signal;
  const before=useTwinStore.getState(),savedEnergy={...before.energy},savedSculpture=before.sculpture;
  useUIStore.setState({presentation:true});setRunning(true);setAdvice('');
  let complete=false,timedOut=false;
  const deadline=setTimeout(()=>{timedOut=true;controller.abort();},110000);
  const pause=(seconds:number)=>new Promise<void>((resolve,reject)=>{
   if(signal.aborted){reject(new Error('cancelled'));return;}
   const cancel=()=>{tween.kill();reject(new Error('cancelled'));},tween=gsap.delayedCall(seconds,()=>{signal.removeEventListener('abort',cancel);if(useTwinStore.getState().quality==='static')reject(new Error('static'));else resolve();});signal.addEventListener('abort',cancel,{once:true});
  });
  const wait=async(predicate:()=>boolean,seconds=35)=>{const end=Date.now()+seconds*1000;while(!predicate()){if(useTwinStore.getState().quality==='static')throw new Error('static');if(Date.now()>end)throw new Error('timeout');await pause(.1);}};
  const dispatch=useTwinStore.getState().dispatch;
  try{
   document.querySelector('.twin-stage-wrap')?.scrollIntoView({block:'center',behavior:'smooth'});
   setStep('01 / 城市与日常 · Esc 可停止');
   if(state!=='orbit'){dispatch({type:'RETURN'});await wait(()=>useTwinStore.getState().experience.state==='orbit');}
   const beginning=performance.now();
   await pause(3);dispatch({type:'FOCUS',building:0});await wait(()=>useTwinStore.getState().experience.state==='focused');await pause(3);
   setStep('02 / 按需载入住宅');dispatch({type:'ENTER'});await wait(()=>useTwinStore.getState().roomReady&&useTwinStore.getState().experience.state==='room');
   useTwinStore.setState({energy:{...savedEnergy,enabled:true},sculpture:false});dispatch({type:'SELECT',object:'aircon'});await pause(5);
   setStep('03 / 开启设备，让能耗被看见');useTwinStore.setState({sculpture:true});await pause(4);
   setStep('04 / AI 查证 · 网络超时自动切本地讲解');
   const snapshot=useTwinStore.getState(),context=evidenceContext('home','aircon',snapshot.energy,snapshot.devices,inputs);
   window.dispatchEvent(new CustomEvent('carbon-presentation-ask',{detail:`请根据当前住宅空调参数，用120字内解释每天用电、教学约定因子0.581的适用边界，并引用IPCC的气候科学背景；气候结论不可当作设备因子来源。不改参数，不切换选中物件，action用NONE。最后反问我。演示请求 ${Date.now()}`}));
   const aiEnd=Date.now()+22000;
   while(Date.now()<aiEnd&&!(useUIStore.getState().adviceContext===context&&useUIStore.getState().advice)){await pause(.15);}
   if(!(useUIStore.getState().adviceContext===context&&useUIStore.getState().advice)){
    window.dispatchEvent(new Event('carbon-presentation-cancel'));
    const r=calculateSpace('home',snapshot.energy,snapshot.devices),citations=retrieve('IPCC 气候科学 人类活动 减排');
    setAdvice(`本地证据讲解（AI 未在时限内完成，非生成式回答）：当前房间 ${r.daily.toFixed(3)} kWh/日，按教学约定值 0.581 估算 ${r.scope2Daily.toFixed(3)} kg CO₂/日。原始因子版本待核验。IPCC 结论是气候背景[1]，不能证明家电因子。你愿意先比较关闭待机还是缩短时长？`,context,citations.slice(0,1));
   }
   await pause(4);window.dispatchEvent(new Event('carbon-presentation-close'));
   setStep('05 / 进入 1.6 m 视高，近看机器');dispatch({type:'VIEW',view:'walk'});await wait(()=>useTwinStore.getState().experience.state==='room');await pause(5);
   dispatch({type:'VIEW',view:'orbit'});await wait(()=>useTwinStore.getState().experience.state==='room');dispatch({type:'SELECT',object:'aircon'});
   if(useTwinStore.getState().audio&&'speechSynthesis' in window){const voice=new SpeechSynthesisUtterance('运行排放可以比较，未知的制造排放仍然保持未知。查看原文，再做选择。');voice.lang='zh-CN';window.speechSynthesis.speak(voice);}
   setStep('06 / 可复算、可查证、可导出');await pause(Math.max(4,60-(performance.now()-beginning)/1000));complete=true;
   notifyToast('导览结束。空调已开启；可继续调整参数、查阅原文并导出报告。');
  }catch(error){
   if(timedOut||error instanceof Error&&['timeout','static'].includes(error.message)){
    useTwinStore.setState({quality:'static'});dispatch({type:'FAIL'});
    notifyToast('演示已熔断：资源超时或设备进入轻量模式。数据与手动核算保留。');
   }else if(!signal.aborted)notifyToast('演示未完成，已解除控制锁，可手动继续。');
  }finally{
   clearTimeout(deadline);window.dispatchEvent(new Event('carbon-presentation-cancel'));window.dispatchEvent(new Event('carbon-presentation-close'));window.speechSynthesis?.cancel();
   if(!complete)useTwinStore.setState({energy:savedEnergy,sculpture:savedSculpture});
   useUIStore.setState({presentation:false});if(abort.current===controller)abort.current=null;setRunning(false);setStep('');
  }
 };
 return <div className="presentation-control"><button disabled={!running&&(busy||!['orbit','room','inspecting','focused'].includes(state))} aria-pressed={running} onClick={()=>running?stop():void start()}>{running?'■ 停止演示':'▷ 一键空间导览'}</button>{running&&<span role="status">{step}</span>}</div>;
}
