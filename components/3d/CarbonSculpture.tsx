'use client';
import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Billboard,Html,Line} from '@react-three/drei';
import * as THREE from 'three';
import {useTwinStore} from '@/lib/experience/store';
import {useUIStore} from '@/lib/stores/UIStore';
import {calculateSpace,OBJECTS,spaceForBuilding,type SpaceObject} from '@/lib/experience/spaces';
import {FACTORS} from '@/lib/emissions';

function EnergyColumn({id,value,index,count}:{id:SpaceObject;value:number;index:number;count:number}){
 const ref=useRef<THREE.Mesh>(null),reduced=useUIStore(s=>s.reduced),dispatch=useTwinStore(s=>s.dispatch),selected=useTwinStore(s=>s.experience.selected),height=value*.075;
 const x=(index-(count-1)/2)*.38;
 useFrame((_,dt)=>{if(!ref.current)return;const h=reduced?height:THREE.MathUtils.damp(ref.current.scale.y,height,5,dt);ref.current.scale.y=Math.max(.002,h);ref.current.position.y=.04+h/2;});
 return <group position={[x,0,0]} onClick={e=>{e.stopPropagation();dispatch({type:'SELECT',object:id});}}>
  <mesh position={[0,.02,0]}><cylinderGeometry args={[.135,.135,.04,24]}/><meshStandardMaterial color="#405b54" metalness={.6} roughness={.4}/></mesh>
  <mesh ref={ref} scale={[1,.002,1]}><boxGeometry args={[.19,1,.19]}/><meshPhysicalMaterial color={selected===id?'#f1c891':'#91c7bd'} metalness={.25} roughness={.28} clearcoat={.6} emissive={selected===id?'#b17b37':'#2b544a'} emissiveIntensity={.45}/></mesh>
  <Billboard position={[0,height+.25,0]}><Html transform distanceFactor={1.25} zIndexRange={[7,0]}><button className="sculpture-label" onClick={()=>dispatch({type:'SELECT',object:id})}>{OBJECTS[id].name}<b>{value.toFixed(3)} kWh</b></button></Html></Billboard>
 </group>;
}
export default function CarbonSculpture(){
 const energy=useTwinStore(s=>s.energy),devices=useTwinStore(s=>s.devices),building=useTwinStore(s=>s.experience.building),kind=spaceForBuilding(building),layout=useTwinStore(s=>s.layout),reduced=useUIStore(s=>s.reduced),quality=useTwinStore(s=>s.quality);
 const result=calculateSpace(kind,energy,devices),items=result.objects.filter(v=>v.id==='aircon'||OBJECTS[v.id].watts>0),dots=useRef<THREE.InstancedMesh>(null),dummy=useMemo(()=>new THREE.Object3D(),[]);
 const paths=useMemo(()=>items.map(({id})=>{const p=id==='kettle'?[layout.table.x+.1,.95,layout.table.z+.12]:OBJECTS[id].position;return new THREE.QuadraticBezierCurve3(new THREE.Vector3(...p),new THREE.Vector3(p[0]*.4,3.1,p[2]*.4),new THREE.Vector3(0,3.55,-3.25));}),[items.map(v=>v.id).join(','),layout.table.x,layout.table.z]); // eslint-disable-line react-hooks/exhaustive-deps
 useFrame(({clock})=>{if(!dots.current)return;paths.forEach((path,i)=>{for(let j=0;j<8;j++){const p=path.getPoint((j/8+(reduced?0:clock.elapsedTime*.13))%1);dummy.position.copy(p);dummy.scale.setScalar(items[i].kWh>0?.018:0);dummy.updateMatrix();dots.current!.setMatrixAt(i*8+j,dummy.matrix);}});dots.current.instanceMatrix.needsUpdate=true;});
 return <group name="energy-sculpture">
  <group position={[1.15,.01,0]}>{items.map((v,i)=><EnergyColumn key={v.id} id={v.id} value={v.kWh} index={i} count={items.length}/>)}<Billboard position={[0,.15,.55]}><Html transform distanceFactor={2} zIndexRange={[7,0]}><div className="sculpture-key"><small>THE WEIGHT OF A DAY</small><b>{result.scope2Daily.toFixed(3)} kg CO₂ / 日</b><span>统一比例 1 m = 13.333 kWh / 日</span><span>含照明总量 · 电网因子 {FACTORS.electricity.value}</span></div></Html></Billboard></group>
  {quality!=='low'&&paths.map((p,i)=><Line key={i} points={p.getPoints(28)} color="#99b8b4" transparent opacity={.18} lineWidth={.6}/>)}
  <instancedMesh ref={dots} args={[undefined,undefined,paths.length*8]} frustumCulled={false}><sphereGeometry args={[1,5,5]}/><meshBasicMaterial color="#b7dbc5" transparent opacity={.65}/></instancedMesh>
  <Html position={[0,3.5,-3.2]} center zIndexRange={[5,0]}><span className="grid-flow-label">GRID / 购电溯源示意 · 非实测管线</span></Html>
 </group>;
}
