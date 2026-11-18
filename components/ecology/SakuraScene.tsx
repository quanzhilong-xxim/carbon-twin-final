'use client';
import { SceneFrameReady, SceneLifecycle, useSceneRuntime } from '@/lib/three/scene-runtime';
import { SceneResources, Environment, useTexture } from '@/lib/three/scene-assets';
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useDataStore } from '@/lib/stores/DataStore';
import { useUIStore } from '@/lib/stores/UIStore';
import { ECOLOGY_BASELINE, ecologyState } from '@/lib/ecology';
import SakuraMeadow from './SakuraMeadow';
import StorySky from './StorySky';
import { MeadowGround, StoryWater } from './NaturalSurfaces';
import { useStoryAtmosphere } from '@/lib/stores/StoryAtmosphere';
import { CompanionAnimal, MeadowExplorer, RetainedCity } from './LivingAssets';
import MeadowFlowers from './MeadowFlowers';
class Boundary extends Component<{children:React.ReactNode;onError:(error:Error)=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}componentDidCatch(error:Error){this.props.onError(error);}render(){return this.state.failed?null:this.props.children;}}
function rng(seed:number){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function blossomGeometry(){
 const p:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let j=0;j<=7;j++){const t=j/7,w=Math.sin(Math.PI*t)*.035;for(const side of [-1,1]){p.push(side*w,.012*Math.sin(t*Math.PI)-.008*t*t,.009+t*.085);uv.push((side+1)/2,t);}if(j<7){const i=j*2;indices.push(i,i+1,i+3,i,i+3,i+2);}}
 const petal=new THREE.BufferGeometry();petal.setAttribute('position',new THREE.Float32BufferAttribute(p,3));petal.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));petal.setIndex(indices);petal.computeVertexNormals();
 const parts=Array.from({length:5},(_,i)=>petal.clone().rotateY(i*Math.PI*2/5));const blossom=mergeGeometries(parts);parts.forEach(g=>g.dispose());return{petal,blossom};
}
function branch(points:THREE.Vector3[],radius:number){const curve=new THREE.CatmullRomCurve3(points),g=new THREE.TubeGeometry(curve,20,radius,8,false),p=g.attributes.position;for(let i=0;i<=20;i++){const c=curve.getPointAt(i/20),t=1-i/20*.84;for(let j=0;j<=8;j++){const n=i*9+j;p.setXYZ(n,c.x+(p.getX(n)-c.x)*t,c.y+(p.getY(n)-c.y)*t,c.z+(p.getZ(n)-c.z)*t);}}g.computeVertexNormals();return g;}
function Tree({reduced,compact,wind}:{reduced:boolean;compact:boolean;wind:number}){
 const {gl,invalidate}=useThree();
 const annual=useDataStore(s=>s.emissions?.annual??ECOLOGY_BASELINE),state=ecologyState(annual),burst=useRef(0),clock=useRef(0),initialized=useRef(false),last=useRef(annual),canopy=useRef<THREE.InstancedMesh>(null),fall=useRef<THREE.InstancedMesh>(null),group=useRef<THREE.Group>(null);
 const maps=useTexture(['/textures/sakura/bark-color.jpg','/textures/sakura/bark-normal.jpg','/textures/sakura/bark-roughness.jpg']);
 const shader=useRef<{uniforms:Record<string,{value:unknown}>}|null>(null),count=compact?1200:3200;
 const barkShaders=useRef<{uniforms:Record<string,{value:unknown}>}[]>([]);
 const assets=useMemo(()=>{const random=rng(2803),branches:THREE.BufferGeometry[]=[],tips:THREE.Vector3[]=[];branches.push(branch([new THREE.Vector3(0,0,0),new THREE.Vector3(-.2,1.4,.08),new THREE.Vector3(.12,2.7,0),new THREE.Vector3(-.25,4.3,.04)],.36));
  for(let i=0;i<15;i++){const a=i*2.3999,h=1.9+random()*1.7,length=1.1+random()*1.75,tip=new THREE.Vector3(Math.cos(a)*length,h+1.1+random()*.7,Math.sin(a)*length*.75);branches.push(branch([new THREE.Vector3(0,h,0),new THREE.Vector3(tip.x*.48,h+.42,tip.z*.35),tip],.105+(1-h/5)*.045));tips.push(tip);for(let j=0;j<3;j++){const twig=tip.clone().add(new THREE.Vector3((random()-.5)*1.2,random()*.7,(random()-.5)*1.2));branches.push(branch([tip.clone().multiplyScalar(.86),tip,twig],.025));tips.push(twig);}}
  const {petal,blossom}=blossomGeometry();const matrices:THREE.Matrix4[]=[],colors:THREE.Color[]=[],o=new THREE.Object3D();for(let i=0;i<count;i++){const tip=tips[Math.floor(random()*tips.length)],angle=random()*Math.PI*2,r=Math.cbrt(random()),z=random()*2-1,w=Math.sqrt(1-z*z);o.position.set(tip.x+Math.cos(angle)*r*w*.9,tip.y+z*r*.6,tip.z+Math.sin(angle)*r*w*.8);o.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);o.scale.setScalar(.65+random()*.85);o.updateMatrix();matrices.push(o.matrix.clone());colors.push(new THREE.Color().setHSL(.94+random()*.035,.25+random()*.35,.64+random()*.25));}
  branches.forEach((g,i)=>{const n=g.attributes.position.count;g.setAttribute('aFlex',new THREE.Float32BufferAttribute(new Float32Array(n).fill(i===0?.004:i%4===0?.015:.035),1));g.setAttribute('aPhase',new THREE.Float32BufferAttribute(new Float32Array(n).fill(i),1));});const wood=mergeGeometries(branches);branches.forEach(g=>g.dispose());
  const fallen=Array.from({length:compact?48:112},()=>({x:(random()-.5)*6,y:2.7+random()*2.3,z:(random()-.5)*3.8,speed:.24+random()*.42,phase:random()*Math.PI*2}));return{wood,petal,blossom,matrices,colors,fallen};},[count,compact]);
 useEffect(()=>{maps[0].colorSpace=THREE.SRGBColorSpace;maps.forEach(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,3);});invalidate();},[maps,invalidate]);
 useEffect(()=>{const mesh=canopy.current;if(mesh){assets.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,assets.colors[i]);});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}return()=>{assets.wood.dispose();assets.petal.dispose();assets.blossom.dispose();};},[assets]);
 useEffect(()=>{const foliage=Math.round(count*(.45+.55*state.vitality));if(canopy.current)canopy.current.count=foliage;gl.domElement.dataset.ecologyVitality=state.vitality.toFixed(3);gl.domElement.dataset.foliageCount=String(foliage);},[gl,count,state.vitality]);
 useEffect(()=>{if(last.current!==annual){burst.current=1;last.current=annual;}},[annual]);const o=useMemo(()=>new THREE.Object3D(),[]);
 useFrame((_,dt)=>{if(reduced&&initialized.current)return;const d=reduced?0:Math.min(dt,.05);clock.current+=d;initialized.current=true;const t=clock.current;barkShaders.current.forEach(s=>{s.uniforms.uTime.value=t;});burst.current=Math.max(0,burst.current-d*.18);if(shader.current){shader.current.uniforms.uTime.value=t;shader.current.uniforms.uWind.value=wind+state.stress*.8+burst.current*.7;}if(group.current)group.current.rotation.z=Math.sin(t*.36)*.008;if(fall.current){assets.fallen.forEach((p,i)=>{const age=(t*p.speed+p.phase)%5.3;o.position.set(p.x+Math.sin(age*1.4+p.phase)*(.25+burst.current*.3)+age*.14,p.y-age,p.z+Math.cos(age*1.2+p.phase)*.28);o.rotation.set(age*2+p.phase,age*.8,Math.sin(age+p.phase)*2);o.scale.setScalar((.8+Math.sin(i)*.3)*(age>4.8?Math.max(0,(5.3-age)/.5):1));o.updateMatrix();fall.current!.setMatrixAt(i,o.matrix);});fall.current.instanceMatrix.needsUpdate=true;}});
 return <group position={[.2,-.9,0]} ref={group}><mesh geometry={assets.wood} castShadow receiveShadow><meshStandardMaterial map={maps[0]} normalMap={maps[1]} normalScale={new THREE.Vector2(.4,.4)} roughnessMap={maps[2]} roughness={.94} color="#d1bea5" onBeforeCompile={s=>{s.uniforms.uTime={value:0};s.vertexShader="attribute float aFlex,aPhase;uniform float uTime;\n"+s.vertexShader;s.vertexShader=s.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\ntransformed.x+=sin(uTime*(.55+mod(aPhase,3.)*.17)+position.y*.8+aPhase)*aFlex*max(0.,position.y-1.4);");barkShaders.current=[s];}}/></mesh>
  <instancedMesh ref={canopy} args={[assets.blossom,undefined,count]} onPointerMove={e=>{e.stopPropagation();burst.current=1.2;}} frustumCulled={false} castShadow><meshPhysicalMaterial emissive="#7f344f" emissiveIntensity={.10} roughness={.8} metalness={0} side={THREE.DoubleSide} transmission={compact?0:.06} thickness={.025} onBeforeCompile={s=>{s.uniforms.uTime={value:0};s.uniforms.uWind={value:.6};s.vertexShader='uniform float uTime; uniform float uWind;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float phase=instanceMatrix[3].x*1.7+instanceMatrix[3].z*2.1; transformed.x+=sin(uTime*1.1+phase)*0.055*uWind; transformed.y+=sin(uTime*.8+phase)*0.026*uWind;');shader.current=s;}}/></instancedMesh>
  {<instancedMesh ref={fall} args={[assets.petal,undefined,assets.fallen.length]} frustumCulled={false}><meshStandardMaterial color="#f2bdd0" roughness={.75} side={THREE.DoubleSide}/></instancedMesh>}
  <SakuraMeadow compact={compact} reduced={reduced} wind={wind}/>
  <MeadowFlowers compact={compact} paused={reduced}/>
  <MeadowGround position={[0,-.045,13.5]} size={[140,42]} tint="#9fba8a"/>
 </group>;
}
function WatersideLife({paused,ending=false,reaction=0,onInteract}:{paused:boolean;ending?:boolean;reaction?:number;onInteract?:()=>void}){
 const night=useStoryAtmosphere(s=>s.time==='night');
 return <><StoryWater position={[0,-.925,-15]} size={[140,15]} paused={paused} night={night}/><MeadowGround position={[0,-.95,-42.5]} size={[140,40]} tint="#a1b390"/><RetainedCity position={[9,-.95,-36]} height={7}/>
 {[-7.46,-22.54].map(z=><mesh key={z} position={[0,-.96,z]} receiveShadow><boxGeometry args={[140,.12,.18]}/><meshStandardMaterial color="#a8ab91" roughness={.96}/></mesh>)}
 <group position={[1.7,-.92,3.0]}><mesh position={[0,.43,0]} receiveShadow castShadow><boxGeometry args={[1.8,.09,.55]}/><meshStandardMaterial color="#ac8b66" roughness={.8}/></mesh>{[-.65,.65].map(x=><mesh key={x} position={[x,.2,0]} castShadow><boxGeometry args={[.075,.4,.42]}/><meshStandardMaterial color="#384338" roughness={.75}/></mesh>)}</group>
 <MeadowExplorer position={[1.55,-1.29,3.15]} scale={1.12} paused={paused} seated/><CompanionAnimal position={[2.5,-.92,3.8]} scale={.95} rotation={-.6} paused={paused} reaction={reaction} onInteract={onInteract}/>
 {ending&&<><CompanionAnimal kind="sheep" position={[-2.3,-.92,.5]} scale={.52} rotation={.7} paused={paused}/><CompanionAnimal position={[-1.8,-.92,1.7]} scale={.7} rotation={1.1} paused={paused}/>{Array.from({length:12},(_,i)=><mesh key={i} position={[.55+Math.sin(i*.35)*.36,-.90,1.9+i*.34]} rotation={[-Math.PI/2,0,i*.17]} receiveShadow><circleGeometry args={[.19,7]}/><meshStandardMaterial color={i%2?'#b5ac95':'#ccc2aa'} roughness={.95}/></mesh>)}<mesh position={[-2.6,-.91,2.7]} rotation={[-Math.PI/2,0,-.2]} scale={[1.1,.65,1]}><circleGeometry args={[1.15,48]}/><meshPhysicalMaterial color="#789e99" roughness={.13} metalness={.22} clearcoat={.8}/></mesh></>}
 </>;
}
export default function SakuraScene({ending=false,paused=false,reaction=0,onInteract}:{ending?:boolean;paused?:boolean;reaction?:number;onInteract?:()=>void}={}) {
 const weather=useStoryAtmosphere(s=>s.weather),wind=weather==='breeze'?1.15:weather==='rain'?.7:.3;
 const reduced=useUIStore(s=>s.reduced)||paused,[visible,setVisible]=useState(false),[pageVisible,setPageVisible]=useState(true),[compact,setCompact]=useState(false),ref=useRef<HTMLDivElement>(null);
 const runtime=useSceneRuntime(visible&&pageVisible,'樱花与滨水花园');
 useEffect(()=>{const media=matchMedia('(max-width:760px)'),sync=()=>setCompact(media.matches);sync();media.addEventListener('change',sync);const ob=new IntersectionObserver(([e])=>setVisible(e.isIntersecting),{rootMargin:'160px'});if(ref.current)ob.observe(ref.current);const visibility=()=>setPageVisible(!document.hidden);visibility();document.addEventListener('visibilitychange',visibility);return()=>{ob.disconnect();media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',visibility);};},[]);
 return <div className="sakura-scene" role="group" ref={ref} data-ready={runtime.ready&&visible} data-load-state={runtime.phase} data-weather={weather} data-ending={ending} data-paused={reduced} aria-label={ending?'樱花下的重逢：女孩、猫咪、羊羔与滨水花园':'随选择与微风变化的三维樱花树'}>
 {(!runtime.ready||runtime.error)&&<div className="sakura-poster" aria-hidden="true"/>}
 {runtime.error?<div className="sakura-retry" role="status"><p>自然场景暂时无法显示。数值计算和情景比较仍然可用。</p><small>{runtime.error}</small><button onClick={runtime.retry}>重新加载自然场景</button></div>:visible&&!runtime.ready&&<div className="sakura-retry" role="status">{runtime.lost?'图形连接暂停，等待恢复':'正在载入樱花、角色与环境材质'} · {runtime.progress.loaded}/{runtime.progress.total} 组资源</div>}
 {visible&&!runtime.error&&<Boundary key={runtime.generation} onError={runtime.fail}><SceneResources.Provider value={runtime.scope}><Canvas shadows={!compact} dpr={[1,compact?1:1.5]} camera={{position:ending?[3.1,2.7,12.5]:[.1,2.6,12.3],fov:39}} frameloop={!pageVisible||runtime.lost?'never':reduced?'demand':'always'} gl={{antialias:!compact,alpha:true,powerPreference:'low-power'}} onCreated={({camera,gl})=>{camera.lookAt(ending?.35:-1.8,1.45,ending?1:0);gl.toneMapping=THREE.ACESFilmicToneMapping;}}>
 <SceneLifecycle runtime={runtime}/><ambientLight intensity={.18}/><Suspense fallback={null}><StorySky paused={reduced}/><Environment files="/environments/citylight/kloppenheim_06_puresky_1k.hdr" environmentIntensity={.35}/><Tree reduced={reduced} compact={compact} wind={wind}/><WatersideLife paused={reduced} ending={ending} reaction={reaction} onInteract={onInteract}/><SceneFrameReady scope={runtime.scope} onReady={runtime.onRendered}/></Suspense>
 </Canvas></SceneResources.Provider></Boundary>}</div>;
}
