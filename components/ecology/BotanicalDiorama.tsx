'use client';
import { Environment, useTexture } from '@/lib/three/scene-assets';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import SceneStage from '../3d/SceneStage';
import BotanicalCanvas from './BotanicalCanvas';
import { useUIStore } from '@/lib/stores/UIStore';
import { CompanionAnimal, MeadowExplorer } from './LivingAssets';
import SeasonalCanopy from './SeasonalCanopy';
import { useStoryAtmosphere } from '@/lib/stores/StoryAtmosphere';
import { StoryWater } from './NaturalSurfaces';
export type Season='spring'|'summer'|'autumn'|'winter';
function taperedStem(points:THREE.Vector3[],radius:number){const curve=new THREE.CatmullRomCurve3(points),g=new THREE.TubeGeometry(curve,16,radius,7,false),p=g.attributes.position;for(let i=0;i<=16;i++){const c=curve.getPointAt(i/16),r=1-i/16*.88;for(let j=0;j<=7;j++){const k=i*8+j;p.setXYZ(k,c.x+(p.getX(k)-c.x)*r,c.y+(p.getY(k)-c.y)*r,c.z+(p.getZ(k)-c.z)*r);}}g.computeVertexNormals();return g;}
function Bonsai({vitality,season,seasonProgress,paused=false}:{vitality:number;season:Season;seasonProgress?:number;paused?:boolean}){
 const phase=seasonProgress??(['spring','summer','autumn','winter'] as Season[]).indexOf(season),time=useStoryAtmosphere(s=>s.time),night=time==='night';
 const reduced=useUIStore(s=>s.reduced),stopped=paused||reduced,group=useRef<THREE.Group>(null),eased=useRef(vitality),elapsed=useRef(0);
 const texture=useTexture(['/textures/sakura/bark-color.jpg','/textures/sakura/bark-normal.jpg','/textures/behaviour-v108/grass/color.jpg']);
 const maps=useMemo(()=>texture.map((t,i)=>{const m=t.clone();m.wrapS=m.wrapT=THREE.RepeatWrapping;m.repeat.set(i===2?1:2,i===2?1:3);if(i!==1)m.colorSpace=THREE.SRGBColorSpace;m.needsUpdate=true;return m;}),[texture]);
 useEffect(()=>()=>maps.forEach(m=>m.dispose()),[maps]);
 const {camera,invalidate}=useThree();useEffect(()=>{camera.position.set(3.4,2.25,5);camera.lookAt(0,.6,0);invalidate();},[camera,invalidate]);
 const objects=useMemo(()=>{const branches:THREE.TubeGeometry[]=[],positions:{x:number;y:number;z:number;phase:number}[]=[];const stem=(p:THREE.Vector3[],r:number)=>branches.push(taperedStem(p,r));stem([new THREE.Vector3(0,-.2,0),new THREE.Vector3(-.12,.8,0),new THREE.Vector3(.12,1.6,0),new THREE.Vector3(0,2.35,0)],.065);
  for(let i=0;i<12;i++){const a=i*2.3999,h=.5+i*.115,x=Math.cos(a)*(.75-i*.025),z=Math.sin(a)*(.75-i*.025);stem([new THREE.Vector3(0,h,0),new THREE.Vector3(x*.6,h+.2,z*.6),new THREE.Vector3(x,h+.52,z)],.022);for(let j=0;j<14;j++){const q=j*2.4;positions.push({x:x+Math.cos(q)*.23,y:h+.5+Math.sin(j)*.16,z:z+Math.sin(q)*.23,phase:i*14+j});}}
  const roots=Array.from({length:7},(_,i)=>{const a=i*Math.PI*2/7;return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.1,0),new THREE.Vector3(Math.cos(a)*.25,-.45,Math.sin(a)*.25),new THREE.Vector3(Math.cos(a)*.65,-.8,Math.sin(a)*.65)]),10,.025,5,false);});return{branches,positions,roots,o:new THREE.Object3D()};},[]);
 useEffect(()=>()=>{objects.branches.forEach(g=>g.dispose());objects.roots.forEach(g=>g.dispose());},[objects]);
 useFrame(({gl},dt)=>{if(!stopped){elapsed.current+=Math.min(dt,.05);eased.current=THREE.MathUtils.damp(eased.current,vitality,3,Math.min(dt,.1));}const v=eased.current,t=elapsed.current;
  if(group.current)group.current.rotation.z=Math.sin(t*.5)*.006;gl.domElement.dataset.vitality=v.toFixed(3);gl.domElement.dataset.season=season;gl.domElement.dataset.seasonProgress=phase.toFixed(3);gl.domElement.dataset.motionTime=t.toFixed(4);
 });

 return <><color attach="background" args={[night?'#10202b':'#142f29']}/><ambientLight intensity={.35}/><hemisphereLight args={['#eee9d6','#65765c',.8]}/><directionalLight position={[-3,5,4]} intensity={night?.4:1.8} color="#ffedcd"/><pointLight position={[3,3,-2]} intensity={night?5:9} color="#a4d7c6"/><Environment files="/environments/citylight/kloppenheim_06_puresky_1k.hdr" environmentIntensity={night?.18:.5}/><group position={[0,-.5,0]} ref={group}>{objects.branches.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial map={maps[0]} normalMap={maps[1]} normalScale={new THREE.Vector2(.35,.35)} color="#d4bc9b" roughness={.95}/></mesh>)}<SeasonalCanopy vitality={vitality} phase={phase} paused={stopped}/>{objects.roots.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color="#c0a07d" roughness={.98}/></mesh>)}
  <mesh position={[0,-.4,0]}><cylinderGeometry args={[1.51,1.49,.18,64]}/><meshStandardMaterial map={maps[2]} color={season==='winter'?'#d5ded3':'#b3b99d'} roughness={1}/></mesh><mesh position={[0,-.66,0]}><cylinderGeometry args={[1.49,1.49,.34,64]}/><meshStandardMaterial color="#684f36" transparent opacity={.35} roughness={1} depthWrite={false}/></mesh><mesh position={[0,-.9,0]}><cylinderGeometry args={[1.58,1.58,.11,64]}/><meshStandardMaterial color="#638f83" metalness={.6} roughness={.35}/></mesh><mesh position={[0,-.3,0]} scale={[1.54,2.68,1.54]}><sphereGeometry args={[1,48,28,0,Math.PI*2,0,Math.PI/2]}/><meshPhysicalMaterial color="#e0ede6" transmission={.72} transparent opacity={.24} roughness={.08} metalness={0} ior={1.46} thickness={.035} clearcoat={1} side={THREE.DoubleSide} depthWrite={false}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.3,0]}><torusGeometry args={[1.55,.015,6,64]}/><meshStandardMaterial color="#89bbab" metalness={.8} roughness={.3}/></mesh>
  <StoryWater position={[0,-.295,.30]} size={[1.85,.24]} paused={stopped} night={night}/><CapsuleGarden season={season} night={night}/>
  <group position={[.44,-.26,.30]}>{Array.from({length:9},(_,i)=><mesh key={i} position={[0,Math.sin(i/8*Math.PI)*.035,(i-4)*.06]}><boxGeometry args={[.30,.035,.055]}/><meshStandardMaterial color="#b5a17d" roughness={.85}/></mesh>)}{[-.16,.16].map(x=><mesh key={x} position={[x,.085,0]}><boxGeometry args={[.012,.018,.55]}/><meshStandardMaterial color="#cbb995"/></mesh>)}</group>
  <MeadowExplorer position={[-.47,-.29,.59]} scale={.23} paused={stopped}/><CompanionAnimal position={[-.17,-.29,.62]} scale={.32} paused={stopped} vitality={vitality}/>
 </group><OrbitControls target={[0,.6,0]} enableZoom={false} enablePan={false} minPolarAngle={.5} maxPolarAngle={1.8}/></>;
}
function CapsuleGarden({season,night}:{season:Season;night:boolean}){
 const flowers=useMemo(()=>Array.from({length:44},(_,i)=>{const a=i*2.39996,r=.75+(Math.sin(i*17.3)+1)*.25;return{x:Math.cos(a)*r,z:Math.sin(a)*r,h:.035+(Math.sin(i*7)+1)*.025};}),[]);
 return <><group>{flowers.map((p,i)=><group key={i} position={[p.x,-.30,p.z]}><mesh position={[0,p.h/2,0]}><cylinderGeometry args={[.004,.006,p.h,4]}/><meshStandardMaterial color="#5e8760" roughness={1}/></mesh>{season!=='winter'&&<mesh position={[0,p.h,0]} scale={[1,.45,1]}><sphereGeometry args={[.022,5,4]}/><meshStandardMaterial color={season==='autumn'?'#ddba6c':i%3?'#f1dfbb':'#ddafc4'} roughness={.8}/></mesh>}</group>)}</group>{[[-.95,-.75],[.95,-.65],[.86,.78]].map(([x,z],i)=><mesh key={i} position={[x,-.27,z]} scale={[.16,.07,.11]} rotation={[0,i*.7,0]}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color={season==='winter'?'#d7ded5':'#83947e'} roughness={1}/></mesh>)}<group position={[.75,-.27,.65]}><mesh position={[0,.08,0]}><boxGeometry args={[.065,.16,.065]}/><meshStandardMaterial color="#785d40" roughness={.85}/></mesh><mesh position={[0,.09,0]}><boxGeometry args={[.07,.07,.07]}/><meshStandardMaterial color="#edcf86" emissive="#e9b85c" emissiveIntensity={night?2:.35}/></mesh><mesh position={[0,.185,0]} rotation={[0,Math.PI/4,0]}><coneGeometry args={[.075,.05,4]}/><meshStandardMaterial color="#516e5f" metalness={.35} roughness={.6}/></mesh></group></>;
}
export default function BotanicalDiorama(props:{vitality:number;season:Season;seasonProgress?:number;paused?:boolean}){return <SceneStage label="可旋转的植物与土壤根系教学盆景" sceneLights={false} pauseWhenHidden paused={props.paused} fallback={<><BotanicalCanvas vitality={props.vitality} season={props.season}/><p>轻量 2D 后备 · 季节与活动情景仍可分别选择。</p></>}><Bonsai {...props}/></SceneStage>;}
