'use client';
import { useEffect, useRef, useState } from 'react';
import { Html, OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import SceneStage from './SceneStage';
import { askEvidence, exciteVisuals } from '@/lib/visualDynamics';
import { recordLearning } from '@/lib/storage/LearningDB';
import { useUIStore } from '@/lib/stores/UIStore';

const parts=[
  {name:'原料种植',stage:'01 / FIBRE',position:[0,0,0] as const,scale:[1.6,1.9,.35] as const,offset:[0,0,0] as const,color:'#a9e4b0',note:'种植、土地利用与纤维生产；需要供应商活动量与生命周期数据。'},
  {name:'纺织染整',stage:'02 / PROCESS',position:[-1.05,.55,0] as const,scale:[.8,.9,.35] as const,offset:[-1.25,.25,.2] as const,color:'#39FF14',note:'纺纱、织造和染整用能；不能把整件衣物排放任意分摊给袖子。'},
  {name:'物流分销',stage:'03 / DISTRIBUTE',position:[1.05,.55,0] as const,scale:[.8,.9,.35] as const,offset:[1.25,.25,.2] as const,color:'#8bc2a4',note:'运输方式、距离与货物质量决定运输活动量。'},
  {name:'使用护理',stage:'04 / USE',position:[0,.96,0] as const,scale:[.65,.22,.46] as const,offset:[0,1.2,.2] as const,color:'#6B46C1',note:'洗涤、烘干、使用次数与电网因子共同影响使用阶段。'},
  {name:'回收处置',stage:'05 / END OF LIFE',position:[0,-1,0] as const,scale:[1.62,.16,.38] as const,offset:[0,-1,.2] as const,color:'#d9efd3',note:'再使用、回收与处置的边界和替代假设需单独说明。'},
];
function Shirt({expanded,select}:{expanded:boolean;select:(i:number)=>void}) {
  const group=useRef<THREE.Group>(null),{camera,invalidate}=useThree();
  const reduced=useUIStore(s=>s.reduced);
  useEffect(()=>{camera.position.set(0,1.5,9);camera.lookAt(0,0,0);invalidate();},[camera,invalidate]);
  useEffect(()=>{const tl=gsap.timeline({onUpdate:invalidate});group.current?.children.forEach((child,i)=>{const part=parts[i];if(!part)return;tl.to(child.position,{x:part.position[0]+(expanded?part.offset[0]:0),y:part.position[1]+(expanded?part.offset[1]:0),z:expanded?part.offset[2]:0,duration:reduced?0:1.1,ease:'back.out(1.35)'},0);tl.to(child.rotation,{y:expanded?(i%2?.18:-.18):0,z:expanded?(i===1?-.18:i===2?.18:0):0,duration:reduced?0:1.1},0);});return()=>{tl.kill();};},[expanded,reduced,invalidate]);
  return <><group ref={group}>{parts.map((part,i)=><group key={part.name} position={[...part.position]}><mesh onClick={e=>{e.stopPropagation();select(i);}}><boxGeometry args={[...part.scale]}/><meshStandardMaterial color={part.color} roughness={.35} metalness={.3} emissive={part.color} emissiveIntensity={.15}/></mesh>{expanded&&<Html position={[i===1?-.55:i===2?.55:0,i===3?.4:i===4?-.4:.25,.4]} center distanceFactor={9} zIndexRange={[15,0]}><button className="model-tag" onClick={()=>select(i)}>{part.stage}<b>{part.name} ↗</b></button></Html>}</group>)}</group><gridHelper args={[14,28,'#235f31','#102a25']} position={[0,-2.9,0]}/><OrbitControls enableZoom={false} enablePan={false} minPolarAngle={.8} maxPolarAngle={2}/></>;
}
export default function ExplodedModel({onExplore}:{onExplore?:()=>void}) {
  const [expanded,setExpanded]=useState(false),[selected,setSelected]=useState(0);
  const select=(i:number)=>{setSelected(i);exciteVisuals(.6);onExplore?.();askEvidence(`请依据文献解释一件 T 恤在「${parts[i].name}」阶段的碳核算边界。${parts[i].note}如无该产品实测数据，请明确不能给出真实 kg CO₂e 或部件占比，并告诉我需要补充什么活动数据。`);};
  const toggle=()=>{setExpanded(v=>!v);onExplore?.();exciteVisuals();void recordLearning({type:'module',module:'exploded-lifecycle'}).catch(()=>undefined);};
  return <section className="exploded-lab" data-expanded={expanded}><div className="interactive-heading"><div><span className="section-kicker">OBJECT / 01 — FOLLOW THE THREAD</span><h2>一件衣服。<br/><i>五段看不见的旅程。</i></h2></div><button className="primary-button" onClick={toggle}>{expanded?'重新合拢':'拆解生命周期'} ↗</button></div><SceneStage label="T 恤生命周期三维拆解模型" fallback={<p>从原料到回收，点击下方阶段继续探索。</p>}><Shirt expanded={expanded} select={select}/></SceneStage><div className="model-stage-tabs">{parts.map((part,i)=><button aria-pressed={selected===i} key={part.name} onClick={()=>select(i)}><small>{part.stage}</small>{part.name} ↗</button>)}</div><p className="method-note">{parts[selected].note} 几何分件是生命周期导航隐喻，不是物理解剖或已测量分摊。本模型不编造服装排放值。</p></section>;
}
