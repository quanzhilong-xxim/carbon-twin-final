'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import {Billboard,Html,Line} from '@react-three/drei';
import * as THREE from 'three';
import {useTwinStore} from '@/lib/experience/store';
import {OBJECTS,SPACES,objectKWh,spaceForBuilding,type SpaceObject} from '@/lib/experience/spaces';
import {useUIStore} from '@/lib/stores/UIStore';
import {FACTORS} from '@/lib/emissions';
import {askEvidence} from '@/lib/visualDynamics';
import {evidenceContext} from '@/lib/ai/evidence';
import {useSimulator} from '@/lib/core/SimulatorEngine';
import {REFERENCES} from '@/lib/references';

export function SpaceReady(){
 const kind=spaceForBuilding(useTwinStore(s=>s.experience.building));
 useEffect(()=>{useTwinStore.setState({roomReady:true});return()=>{useTwinStore.setState({roomReady:false});};},[]);
 return <Html position={[-3,.15,2]} style={{pointerEvents:'none',display:'none'}}><span className="space-ready" data-space-ready={kind}>{SPACES[kind].english} / LIVE</span></Html>;
}
export function ObjectTarget({id,children,position,rotation}:{id:SpaceObject;children:ReactNode;position?:[number,number,number];rotation?:[number,number,number]}){
 const dispatch=useTwinStore(s=>s.dispatch),busy=useUIStore(s=>s.networkBusy||s.presentation);
 useEffect(()=>()=>{document.body.style.cursor='';},[]);
 const over=(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();document.body.style.cursor='pointer';useTwinStore.setState({hovered:id});window.dispatchEvent(new Event('twin-foley'));};
 return <group name={`inspect-${id}`} position={position} rotation={rotation} onPointerOver={over} onPointerOut={()=>{document.body.style.cursor='';useTwinStore.setState({hovered:null});}} onClick={e=>{e.stopPropagation();if(!busy)dispatch({type:'SELECT',object:id});}}>{children}</group>;
}
export function ObjectHologram(){
 const id=useTwinStore(s=>s.hovered??s.experience.selected),energy=useTwinStore(s=>s.energy),devices=useTwinStore(s=>s.devices),layout=useTwinStore(s=>s.layout);
 if(!id||id==='aircon')return null;
 const spec=OBJECTS[id],pos:[number,number,number]=id==='kettle'?[layout.table.x+.1,.9,layout.table.z+.12]:id==='table'||id==='sofa'?[layout[id].x,spec.position[1],layout[id].z]:spec.position;
 const co2=objectKWh(id,energy,devices)*FACTORS.electricity.value;
 return <group position={pos}><Line points={[[0,.1,0],[0,.5,0],[.35,.7,0]]} color="#c1d8c5" lineWidth={1}/><Billboard position={[.4,.75,0]}><Html transform distanceFactor={2} zIndexRange={[13,0]} style={{pointerEvents:'none'}}><div className="object-hologram"><small>{spec.name} / TEACHING SCENARIO</small><b>S2 · {spec.watts?co2.toFixed(3)+' kg CO₂ / 日':'无运行用电'}</b><span>S1 · 核验燃料 / 冷媒　S3 · 待产品 EPD</span><span>{spec.note}</span></div></Html></Billboard></group>;
}
export function SpaceGuide(){
 const {inputs}=useSimulator(),[citationId,setCitationId]=useState<string|null>(null),citations=useUIStore(s=>s.adviceCitations);
 const layout=useTwinStore(s=>s.layout),selected=useTwinStore(s=>s.experience.selected),building=useTwinStore(s=>s.experience.building),walking=useTwinStore(s=>s.experience.view==='walk'),energy=useTwinStore(s=>s.energy),devices=useTwinStore(s=>s.devices),audio=useTwinStore(s=>s.audio);
 const context=useUIStore(s=>s.adviceContext),busy=useUIStore(s=>s.networkBusy||s.presentation),advice=useUIStore(s=>s.advice),reduced=useUIStore(s=>s.reduced),guide=useRef<THREE.Group>(null),label=useRef<THREE.Group>(null),labelWorld=useRef(new THREE.Vector3());
 const valid=context===evidenceContext(spaceForBuilding(building),selected,energy,devices,inputs),reference=REFERENCES.find(r=>r.id===citationId&&citations.some(c=>c.referenceId===r.id));
 const kind=spaceForBuilding(building),id=selected??SPACES[kind].objects[0],spec=OBJECTS[id];
 useFrame(({clock,camera},dt)=>{if(!guide.current)return;if(label.current){label.current.getWorldPosition(labelWorld.current);label.current.scale.setScalar(THREE.MathUtils.clamp(camera.position.distanceTo(labelWorld.current)/12,.15,3));}const p=id==='kettle'?[layout.table.x+.1,.9,layout.table.z+.12]:id==='table'||id==='sofa'?[layout[id].x,spec.position[1],layout[id].z]:spec.position;const target=[Math.max(-2.7,Math.min(2.5,p[0]-.6)),Math.min(2.5,p[1]+.7),p[2]+.7];guide.current.position.x=THREE.MathUtils.damp(guide.current.position.x,target[0],3,dt);guide.current.position.y=THREE.MathUtils.damp(guide.current.position.y,target[1]+(reduced?0:Math.sin(clock.elapsedTime*1.2)*.04),3,dt);guide.current.position.z=THREE.MathUtils.damp(guide.current.position.z,target[2],3,dt);});
 useEffect(()=>()=>{if('speechSynthesis' in window)window.speechSynthesis.cancel();},[]);
 const speak=()=>{if(!audio||!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`${spec.name}。${spec.note}`);u.lang='zh-CN';u.rate=.95;window.speechSynthesis.speak(u);};
 return <group ref={guide} position={[-2,1.8,0]}>
  <mesh><sphereGeometry args={[.07,16,16]}/><meshPhysicalMaterial color="#d6edcb" emissive="#9cc8ae" emissiveIntensity={1.5} roughness={.2}/></mesh>
  <mesh rotation={[.4,0,.4]}><torusGeometry args={[.13,.006,6,32]}/><meshStandardMaterial color="#bdd9cb" emissive="#bdd9cb"/></mesh>
  <group ref={label} position={[-.35,.1,0]}><Html transform sprite distanceFactor={walking?2.5:8} zIndexRange={[15,0]} style={{pointerEvents:walking&&!selected?'none':'auto'}}><div className="guide-label" style={{maxHeight:380,overflowY:'auto',pointerEvents:walking&&!selected?'none':'auto'}} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}><small>EVIDENCE GUIDE / {SPACES[kind].name}</small><button className="guide-ask" onClick={()=>askEvidence(`当前在${SPACES[kind].name}，我选择了${spec.name}。${spec.note} 请根据本次空间上下文解释 Scope 1/2/3 边界与减排选择，引用来源，高亮用电图表，不编造产品EPD。120字以内并反问我。`)}>{busy?'正在查证文献…':`${spec.name} · ${objectKWh(id,energy,devices).toFixed(3)} kWh / 日 ↗`}</button>{!selected&&<span>点击物件，让能耗被看见。</span>}{advice&&valid&&!reference&&<div data-spatial-answer style={{maxHeight:160,overflowY:'auto',fontSize:11}}>{advice.split(/(\[\d+\])/).map((part,i)=>{const match=/^\[(\d+)\]$/.exec(part),citation=match?citations.find(c=>c.id===Number(match[1])):undefined;return citation?<button key={i} className="inline-citation" aria-label={`空间引用 ${citation.id}`} onClick={()=>setCitationId(citation.referenceId)}>{part}</button>:<span key={i}>{part}</span>;})}</div>}{!valid&&advice&&<small>参数或物件已变化，请重新查证。</small>}{audio&&<button className="guide-ask" onClick={speak}>朗读物件提示 ◖</button>}{valid&&!reference&&citations.map(c=><button className="guide-ask" key={c.id} onClick={()=>setCitationId(c.referenceId)}>[{c.id}] {c.title} ↗</button>)}{reference&&valid&&<div className="guide-source" role="region" aria-label="空间证据原文" style={{maxHeight:260,overflowY:'auto',fontSize:11}}><button className="guide-ask" onClick={()=>setCitationId(null)}>关闭原文 ×</button><b>{reference.organization} / {reference.year}</b><p>原文：{reference.quote}</p><p>本站译文：{reference.translation}</p><small>{reference.locator}</small><p>边界：{reference.limitation}</p><a href={reference.url} target="_blank" rel="noreferrer">官方原文 ↗</a>{reference.doi&&<a href={reference.doi} target="_blank" rel="noreferrer"> DOI ↗</a>}</div>}</div></Html></group>
 </group>;
}

