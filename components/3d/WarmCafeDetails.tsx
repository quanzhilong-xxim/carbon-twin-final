'use client';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Html } from '@react-three/drei';
import { useTwinStore } from '@/lib/experience/store';
const notes=[
 {label:'一杯咖啡的上游',text:'咖啡豆、牛奶与杯具分别有供应链。只记录设备电量不足以代表整杯咖啡的生命周期；这里不编造单杯排放值。'},
 {label:'材料与使用寿命',text:'木材外观不能证明低碳。比较桌椅需要来源、制造、运输、使用寿命及处置等数据。'},
 {label:'光照与用电',text:'暖光是场景美术。氛围灯随原有咖啡厅照明开关变化，未另加功率。设备模型的额定功率与使用小时是教学假设。'},
];
export default function WarmCafeDetails(){
 const [selected,setSelected]=useState<number|null>(null),lit=useTwinStore(s=>s.devices.cafeLight),closeRef=useRef<HTMLButtonElement>(null),lastTrigger=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(selected===null){lastTrigger.current?.focus();return;}
  closeRef.current?.focus();
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setSelected(null);};
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[selected]);
 const open=(index:number,event?:MouseEvent<HTMLElement>)=>{lastTrigger.current=event?.currentTarget??null;setSelected(index);};
 return <group>
  {[[-.3,2.05],[2.2,1.7]].map(([x,z],index)=><group key={index} position={[x,0,z]}><mesh position={[0,.79,0]} onClick={e=>{e.stopPropagation();open(1);}}><cylinderGeometry args={[.62,.62,.055,40]}/><meshStandardMaterial color="#a67b50" roughness={.72}/></mesh><mesh position={[0,.4,0]}><cylinderGeometry args={[.055,.075,.75,12]}/><meshStandardMaterial color="#34463e" roughness={.5} metalness={.6}/></mesh><mesh position={[0,.035,0]}><cylinderGeometry args={[.32,.32,.045,24]}/><meshStandardMaterial color="#34463e" roughness={.5} metalness={.6}/></mesh>{[-1,1].map(side=><group key={side} position={[side*.72,0,.04]}><mesh position={[0,.43,0]}><cylinderGeometry args={[.23,.23,.05,24]}/><meshStandardMaterial color="#ad895e" roughness={.85}/></mesh>{[-.12,.12].flatMap(a=>[-.12,.12].map(b=><mesh key={`${a}-${b}`} position={[a,.22,b]}><cylinderGeometry args={[.018,.022,.4,8]}/><meshStandardMaterial color="#3b4540" roughness={.7}/></mesh>))}</group>)}<group position={[-.13,.83,0]} onClick={e=>{e.stopPropagation();open(0);}}><mesh><cylinderGeometry args={[.16,.16,.018,24]}/><meshStandardMaterial color="#e6d8bb" roughness={.35}/></mesh><mesh position={[0,.055,0]}><cylinderGeometry args={[.09,.067,.11,24]}/><meshStandardMaterial color="#efe3c9" roughness={.25}/></mesh><mesh position={[0,.113,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.074,24]}/><meshStandardMaterial color="#4c2d20" roughness={.3} side={2}/></mesh><Html position={[0,.35,0]} center zIndexRange={[10,0]}><button aria-label="一杯的旅程 ↗" title="一杯的旅程 ↗" className="world-hotspot world-hotspot-dot" onClick={e=>open(0,e)}><span aria-hidden="true">+</span><span className="world-hotspot-label">一杯的旅程 ↗</span></button></Html></group></group>)}
  <group position={[0,1.85,-3.2]}>{[-2.4,-1.6,-.8,0,.8,1.6,2.4].map((x,i)=><mesh key={x} position={[x,0,0]}><boxGeometry args={[.025,1.3,.08]}/><meshStandardMaterial color={i%2?'#9b7b52':'#795d40'} roughness={.86}/></mesh>)}</group>{[1.45,1.9].map(y=><mesh key={y} position={[.3,y,-3.1]}><boxGeometry args={[4.9,.055,.33]}/><meshStandardMaterial color="#8b6747" roughness={.8}/></mesh>)}
  {[-1,1.25].map(x=><group key={x} position={[x,3.3,1.65]}><mesh position={[0,-.25,0]}><cylinderGeometry args={[.009,.009,.5,6]}/><meshStandardMaterial color="#423c30"/></mesh><mesh position={[0,-.56,0]} onClick={e=>{e.stopPropagation();setSelected(2);}}><coneGeometry args={[.27,.24,24,1,true]}/><meshStandardMaterial color="#ac8054" roughness={.45} metalness={.5} side={2}/></mesh><mesh position={[0,-.62,0]}><sphereGeometry args={[.045,12,8]}/><meshStandardMaterial color="#f9dfb7" emissive="#ffc87e" emissiveIntensity={lit?2:0}/></mesh></group>)}
  <group position={[3.4,.25,-.2]}><mesh><cylinderGeometry args={[.21,.16,.4,20]}/><meshStandardMaterial color="#bb9e79" roughness={.85}/></mesh>{[0,1,2,3,4].map(i=><mesh key={i} position={[Math.cos(i*2.4)*.12,.3+i*.08,Math.sin(i*2.4)*.12]} rotation={[.4,i*2.4,-.3]} scale={[.09,.3,.035]}><sphereGeometry args={[1,10,7]}/><meshStandardMaterial color="#4f795b" roughness={.95}/></mesh>)}</group>
  <Html position={[2.4,1.4,1.7]} center zIndexRange={[10,0]}><button aria-label="桌椅与材料" title="桌椅与材料" className="world-hotspot world-hotspot-dot" onClick={e=>open(1,e)}><span aria-hidden="true">+</span><span className="world-hotspot-label">桌椅与材料 ↗</span></button></Html><Html position={[1.25,2.5,1.65]} center zIndexRange={[10,0]}><button aria-label="暖光与用电" title="暖光与用电" className="world-hotspot world-hotspot-dot" onClick={e=>open(2,e)}><span aria-hidden="true">+</span><span className="world-hotspot-label">暖光与用电 ↗</span></button></Html>
  {selected!==null&&<Html fullscreen zIndexRange={[20,0]}><aside className="cafe-field-note" role="dialog" aria-modal="true" aria-label={notes[selected].label}><button ref={closeRef} onClick={()=>setSelected(null)} aria-label="关闭咖啡厅知识">关闭 ×</button><h3>{notes[selected].label}</h3><p>{notes[selected].text}</p><a href="https://ghgprotocol.org/product-standard" target="_blank" rel="noreferrer">生命周期方法来源 ↗</a></aside></Html>}
 </group>;
}
