'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import Link from 'next/link';
import {Component,Suspense,useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';

import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStableRenderer,needsStableDrawingBuffer} from '@/lib/citylight/stable-renderer';
import {HERO_VIEWS,type HeroView} from '@/lib/citylight/hero';
import {V12_TIME_PRESETS,v12WorldTime} from '@/lib/citylight/v12-world-time';

const CANDIDATES={
 a:{id:'CL-H11-A',name:'潮汐之门',file:'tide-gate-a',description:'两片收分翼楼，以高空冬季花园相连；双塔高度错落，转角结构贯穿塔冠。原创 Blender 米制建模。'},
 b:{id:'CL-H11-B',name:'层光台地',file:'terrace-lantern-b',description:'逐级退台的非对称体量、石材竖肋与斜向收口塔冠。授权资产改造状态见阶段报告。'},
};
type Candidate=keyof typeof CANDIDATES;
type Stage='empty'|'geometry'|'transparency'|'shadows'|'reflections';
const STAGES:Stage[]=['empty','geometry','transparency','shadows','reflections'];
class Boundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return{failed:true};}render(){return this.state.failed?this.props.fallback:this.props.children;}
}
function Asset({candidate,time,glass,wire,stage,lod}:{candidate:Candidate;time:number;glass:number;wire:boolean;stage:Stage;lod:boolean}){
 const {gl}=useThree(),night=v12WorldTime(time).night;
 const item=CANDIDATES[candidate],uri=`/models/citylight/v11/${item.file}${lod?'-lod':''}.glb`,asset=useGLTF(uri);
 const owned=useMemo(()=>{const scene=asset.scene.clone(true),materials:THREE.MeshStandardMaterial[]=[];scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;const clone=(s:THREE.Material)=>{const a=s.clone() as THREE.MeshStandardMaterial;materials.push(a);return a;};m.material=Array.isArray(m.material)?m.material.map(clone):clone(m.material);});return{scene,materials};},[asset.scene]);
 useEffect(()=>{for(const m of owned.materials){
  m.wireframe=wire;
  const physical=m as THREE.MeshPhysicalMaterial;
  if(physical.isMeshPhysicalMaterial){physical.transmission=stage==='geometry'?0:glass===2?.92:glass===1?.58:0;physical.roughness=glass===2?.025:.08;physical.thickness=.045;physical.needsUpdate=true;}
  if(m.name==='clear-glass')m.color.set(glass===0?'#243e47':'#bfd7db');
  if(m.name==='copper'){m.roughness=.65;m.metalness=.55;}
  if(m.name==='curtain-warm'){m.emissive.set('#e8b777');m.emissiveIntensity=stage==='geometry'?0:night*.48;}
  if(m.name==='light-strip'){m.emissive.set('#ffd6a0');m.emissiveIntensity=stage==='geometry'?0:.14+night*.65;}
  m.envMapIntensity=stage==='reflections'?(m.name==='clear-glass'?.38:1.05):0;
  if(stage==='geometry'){m.metalness=0;m.roughness=.85;}
 }gl.domElement.dataset.transmissions=JSON.stringify(owned.materials.filter(m=>(m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial).map(m=>(m as THREE.MeshPhysicalMaterial).transmission));},[owned,night,glass,wire,stage,gl]);
 useEffect(()=>()=>owned.materials.forEach(m=>m.dispose()),[owned]);
 return <group name={item.id} userData={{entityId:item.id}}><primitive object={owned.scene} dispose={null}/></group>;
}

function LightRig({time,stage,local,candidate}:{time:number;stage:Stage;local:boolean;candidate:Candidate}){
 const {gl,scene}=useThree(),index=STAGES.indexOf(stage),solar=useMemo(()=>v12WorldTime(time),[time]);
 const sunDirection=useMemo(()=>new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(90-solar.elevation),THREE.MathUtils.degToRad(solar.azimuth)),[solar]);
 useEffect(()=>{gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;gl.toneMappingExposure=solar.exposure;},[gl,solar,stage,candidate]);
 useEffect(()=>{
  const sky=new THREE.Color('#91b6ca').lerp(new THREE.Color('#13233e'),solar.night),horizon=new THREE.Color('#cbd5d5').lerp(new THREE.Color('#edbb91'),solar.skyEnergy*(1-solar.night)).lerp(new THREE.Color('#44566e'),solar.night);
  scene.background=sky;scene.environment=null;
  if(index<4)return()=>{if(scene.background===sky)scene.background=null;};
  const width=256,height=128,data=new Float32Array(width*height*4),direction=new THREE.Vector3();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const v=(y+.5)/height,u=(x+.5)/width,elevation=(.5-v)*Math.PI;
   direction.setFromSphericalCoords(1,Math.PI/2-elevation,(u-.5)*Math.PI*2);
   const c=elevation<0?new THREE.Color('#53604f').multiplyScalar(1-solar.night*.85):sky.clone().lerp(horizon,Math.exp(-Math.abs(elevation)*5));
   const sun=solar.sun*Math.exp((direction.dot(sunDirection)-1)*240);
   const i=(y*width+x)*4;data[i]=c.r+sun;data[i+1]=c.g+sun*.72;data[i+2]=c.b+sun*.4;data[i+3]=1;
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
  const pmrem=new THREE.PMREMGenerator(gl),target=pmrem.fromEquirectangular(texture);scene.environment=target.texture;scene.background=texture;
  let probe:THREE.WebGLCubeRenderTarget|undefined,filtered:THREE.WebGLRenderTarget|undefined;
  if(local){
   const hero=scene.getObjectByName(CANDIDATES[candidate].id),visible=hero?.visible;if(hero)hero.visible=false;
   probe=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType});const camera=new THREE.CubeCamera(.2,350,probe);camera.position.set(0,22,0);scene.updateMatrixWorld(true);
   try{camera.update(gl,scene);filtered=pmrem.fromCubemap(probe.texture);scene.environment=filtered.texture;}finally{if(hero)hero.visible=visible!;}
  }
  gl.domElement.dataset.reflection=local?'local-cube-128-single-probe':'authored-hdr-sky';
  return()=>{scene.environment=null;if(scene.background===texture)scene.background=null;target.dispose();filtered?.dispose();probe?.dispose();texture.dispose();pmrem.dispose();};
 },[gl,scene,solar,sunDirection,index,local,candidate]);
 return <><ambientLight intensity={index===0?0:.28-solar.night*.17}/><hemisphereLight args={['#b5cce0','#5e5544',.65-solar.night*.45]}/><directionalLight position={sunDirection.clone().multiplyScalar(150)} color={new THREE.Color('#fff0d4').lerp(new THREE.Color('#ffc99c'),solar.skyEnergy)} intensity={solar.sun} castShadow={index>=3} shadow-mapSize={[1024,1024]} shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={155} shadow-camera-bottom={-30} shadow-camera-far={320} shadow-normalBias={.16}/><pointLight position={[0,3.4,5]} color="#ffd6a0" intensity={18+solar.night*24} distance={32} decay={2}/></>;
}

type BoxInstance=[number,number,number,number,number,number];
function BoxBatch({items,color,metal=0,rough=.5}:{items:BoxInstance[];color:string;metal?:number;rough?:number}){
 const ref=useRef<THREE.InstancedMesh>(null);
 useLayoutEffect(()=>{if(!ref.current)return;const o=new THREE.Object3D();items.forEach(([x,y,z,w,h,d],i)=>{o.position.set(x,y,z);o.scale.set(w,h,d);o.updateMatrix();ref.current!.setMatrixAt(i,o.matrix);});ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();},[items]);
 return <instancedMesh ref={ref} args={[undefined,undefined,items.length]} castShadow receiveShadow><boxGeometry/><meshStandardMaterial color={color} roughness={rough} metalness={metal}/></instancedMesh>;
}
function ContextPavilions(){
 const parts=useMemo(()=>{const stone:BoxInstance[]=[],glass:BoxInstance[]=[],trim:BoxInstance[]=[],roof:BoxInstance[]=[];
  for(const side of [-1,1]){const x=side*62,z=-8;stone.push([x,7,z,16,14,32]);roof.push([x,14.2,z,17.2,.4,33.2]);
   for(const y of [3,7,11]){
    for(const direction of [-1,1]){
     for(let i=0;i<9;i++){glass.push([x+direction*8.03,y,z-13+i*3.2,.07,2.7,2.8]);trim.push([x+direction*8.12,y,z-14.5+i*3.2,.16,3,.12]);}
     for(let i=0;i<4;i++){glass.push([x-6+i*4,y,z+direction*16.03,3.5,2.7,.07]);trim.push([x-7.9+i*4,y,z+direction*16.13,.12,3,.16]);}
     trim.push([x+direction*8.14,y-1.45,z,.18,.12,32]);trim.push([x,y-1.45,z+direction*16.14,16,.12,.18]);
    }
   }
   for(let i=0;i<12;i++)trim.push([x-7.5+i*1.35,15,z,.1,1.3,28]);
  }return{stone,glass,trim,roof};},[]);
 return <group name="reflection-context-pavilions"><BoxBatch items={parts.stone} color="#918a77" rough={.75}/><BoxBatch items={parts.glass} color="#466878" metal={.65} rough={.27}/><BoxBatch items={parts.trim} color="#565b57" metal={.6}/><BoxBatch items={parts.roof} color="#293c43" metal={.3}/></group>;
}
function Director({view,revision,candidate,onReady,onLost}:{view:HeroView;revision:number;candidate:Candidate;onReady:()=>void;onLost:()=>void}){
 const {camera,gl}=useThree();const controls=useRef<OrbitControls>(),travel=useRef(true),stable=useRef(false),elapsed=useRef(0),frames=useRef<number[]>([]);
 const reduced=useRef(false);
 const pose=useMemo(()=>{const p=HERO_VIEWS[view].pose;return{position:new THREE.Vector3(...p.position),target:new THREE.Vector3(...p.target)};},[view]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>{reduced.current=media.matches;};change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{const orbit=new OrbitControls(camera,gl.domElement);orbit.enableDamping=true;orbit.minDistance=8;orbit.maxDistance=300;orbit.maxPolarAngle=Math.PI*.53;controls.current=orbit;const stop=()=>{travel.current=false;};orbit.addEventListener('start',stop);const fail=(e:Event)=>{e.preventDefault();if(gl.domElement.isConnected)onLost();};gl.domElement.addEventListener('webglcontextlost',fail);return()=>{orbit.removeEventListener('start',stop);orbit.dispose();gl.domElement.removeEventListener('webglcontextlost',fail);};},[camera,gl,onLost]);
 useEffect(()=>{travel.current=true;stable.current=false;gl.domElement.dataset.stable='false';},[view,revision,candidate,gl]);
 useFrame((_,dt)=>{const orbit=controls.current;if(!orbit)return;
  const {position,target}=pose;
  // Entrance is outside the new 24m canopy, at the same 1.7m eye height.
  if(view==='entry'){position.set(9,1.7,34);target.set(0,3.2,13);}
  if(view==='window'){position.set(-7,21,32);target.set(-10,21,10);}
  if(travel.current){const a=reduced.current?1:1-Math.exp(-dt*4);const r=Math.hypot(camera.position.x,camera.position.z),r1=Math.hypot(position.x,position.z),angle=Math.atan2(camera.position.x,camera.position.z),dest=Math.atan2(position.x,position.z);const delta=Math.atan2(Math.sin(dest-angle),Math.cos(dest-angle));camera.position.setFromCylindricalCoords(THREE.MathUtils.lerp(r,r1,a),angle+delta*a,THREE.MathUtils.lerp(camera.position.y,position.y,a));orbit.target.lerp(target,a);if(camera.position.distanceTo(position)<.05){camera.position.copy(position);orbit.target.copy(target);travel.current=false;}}
  orbit.update();camera.position.y=Math.max(1.65,camera.position.y);const r=Math.hypot(camera.position.x,camera.position.z),safe=camera.position.y<12?33:30;if(r<safe){camera.position.x*=safe/Math.max(.001,r);camera.position.z*=safe/Math.max(.001,r);}camera.lookAt(orbit.target);
  const data=gl.domElement.dataset;data.camera=camera.position.toArray().join(',');data.target=orbit.target.toArray().join(',');data.entityId=CANDIDATES[candidate].id;
  if(!travel.current&&!stable.current){stable.current=true;data.stable='true';onReady();}
  if(document.hidden){frames.current=[];elapsed.current=0;return;}frames.current.push(dt*1000);elapsed.current+=dt;data.maxFrameMs=String(Math.max(Number(data.maxFrameMs)||0,dt*1000));if(dt>.5)data.framesOver500ms=String((Number(data.framesOver500ms)||0)+1);
  if(elapsed.current>2){const a=frames.current.sort((a,b)=>a-b);data.fps=(a.length/elapsed.current).toFixed(2);data.p95=a[Math.floor(a.length*.95)].toFixed(2);data.drawCalls=String(gl.info.render.calls);data.triangles=String(gl.info.render.triangles);data.geometries=String(gl.info.memory.geometries);data.textures=String(gl.info.memory.textures);elapsed.current=0;frames.current=[];}
 });return null;
}

export default function CitylightV11Lab(){
 const[candidate,setCandidate]=useState<Candidate>('a'),[view,setView]=useState<HeroView>('front'),[time,setTime]=useState(.35),[local,setLocal]=useState(false),[glass,setGlass]=useState(2),[wire,setWire]=useState(false),[low,setLow]=useState(false),[stage,setStage]=useState<Stage>('reflections'),[revision,setRevision]=useState(0),[ready,setReady]=useState(false),[lost,setLost]=useState(false),[paused,setPaused]=useState(false),[generation,setGeneration]=useState(0);
 const host=useRef<HTMLElement>(null),[surface,setSurface]=useState({w:0,h:0,stable:false});
 const ratio=low?.7:1,item=CANDIDATES[candidate];
 useEffect(()=>{const el=host.current;if(!el)return;const observer=new ResizeObserver(([e])=>{const {width:w,height:h}=e.contentRect;setSurface(s=>s.w===w&&s.h===h?s:{w,h,stable:needsStableDrawingBuffer()});});observer.observe(el);const p=new URLSearchParams(location.search),c=p.get('candidate'),s=p.get('probe');if(c==='b')setCandidate('b');if(process.env.NODE_ENV!=='production'&&STAGES.includes(s as Stage)){setStage(s as Stage);setGlass(2);}return()=>observer.disconnect();},[]);
 const select=useCallback((v:HeroView)=>{setView(v);setReady(false);setRevision(r=>r+1);if(v==='night')setTime(1);},[]);
 useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')select('front');};window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc);},[select]);
 const onReady=useCallback(()=>setReady(true),[]),onLost=useCallback(()=>{setLost(true);setReady(false);},[]);
 const renderer=useCallback((canvas:HTMLCanvasElement|OffscreenCanvas)=>createStableRenderer(canvas,ratio),[ratio]);
 const fallback=<div className="citylight-fallback" role="status"><h2>{paused?'三维视图已暂停':'三维视图暂不可用'}</h2><p>未使用静态图冒充三维。可手动恢复，或返回保留的原版。</p><button onClick={()=>{useGLTF.clear(`/models/citylight/v11/${item.file}${low?'-lod':''}.glb`);setLost(false);setPaused(false);setReady(false);setGeneration(n=>n+1);}}>重新加载三维</button><Link href="/citylight">返回原版</Link></div>;
 return <><header className="citylight-heading"><div><span className="citylight-kicker">CARBONTWIN / ARCHITECTURE ATELIER / TIDE GATE</span><h1>双塔之间，让城市与光相遇。</h1><p>沿着双塔的结构，观察空中花园、玻璃与日光。切换六种时段，或走近入口，探索建筑与人的尺度。</p></div><Link href="/citylight">保留的 V8.1 原版 ↗</Link></header>
 <div className="citylight-workbench"><section ref={host} className="citylight-viewport" aria-label="V11 候选建筑三维模型" data-ready={ready&&!lost&&!paused} data-candidate={candidate} data-view={view} data-stage={stage} data-world-time={time} data-reflection={local?'local':'sky'}>
 {lost||paused?fallback:surface.w>0&&<Boundary key={generation} fallback={fallback}><Canvas key={surface.stable?`${surface.w}:${surface.h}:${ratio}`:'native'} camera={{position:[108,82,174],fov:45,near:.12,far:700}} dpr={ratio} gl={renderer} shadows={STAGES.indexOf(stage)>=3&&!low} onCreated={({gl})=>{const g=gl.getContext(),ext=g.getExtension('WEBGL_debug_renderer_info');gl.domElement.dataset.renderer=String(ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER));}}>
 <Suspense fallback={null}>{stage!=='empty'&&<><Asset candidate={candidate} time={time} glass={glass} wire={wire} stage={stage} lod={low}/><ContextPavilions/></>}<LightRig time={time} stage={stage} local={local} candidate={candidate}/><Director view={view} revision={revision} candidate={candidate} onReady={onReady} onLost={onLost}/></Suspense>
 </Canvas></Boundary>}
 <div className="citylight-caption"><span><strong>{item.id} / {item.name}</strong>{HERO_VIEWS[view].label} · 拖动环绕 / Esc 复位</span><small>{ready?'真实三维 / 固定机位已稳定':'正在加载 / 调整镜头'}<br/>原创双塔研究 / 建筑与灯光可交互</small></div></section>
 <aside className="citylight-controls"><div><span className="citylight-kicker">TWO ARCHITECTURAL STUDIES</span><h2>{item.name}</h2><p>{item.description}</p></div>
 <fieldset><legend>候选建筑</legend><div className="citylight-buttons">{(['a','b'] as Candidate[]).map(c=><button key={c} aria-pressed={candidate===c} onClick={()=>{setCandidate(c);setReady(false);setRevision(n=>n+1);}}>{c.toUpperCase()} · {CANDIDATES[c].name}</button>)}</div></fieldset>
 <fieldset><legend>固定七视角与室内</legend><div className="citylight-buttons">{(Object.keys(HERO_VIEWS)as HeroView[]).map(v=><button key={v} aria-pressed={view===v} onClick={()=>select(v)}>{HERO_VIEWS[v].label}</button>)}</div></fieldset>
 <fieldset><legend>世界时间</legend><label className="citylight-time">清晨 → 正午 → 下午 → 夕阳 → 蓝调 → 深夜<input aria-label="世界时间" type="range" min="0" max="1" step=".01" value={time} onChange={e=>setTime(Number(e.target.value))}/></label><div className="citylight-buttons">{V12_TIME_PRESETS.map(p=><button key={p.label} aria-pressed={time===p.time} onClick={()=>setTime(p.time)}>{p.label}</button>)}</div></fieldset>
 <fieldset><legend>材质实测</legend><div className="citylight-buttons"><button aria-pressed={local} onClick={()=>setLocal(v=>!v)}>{local?'B · 局部反射探针':'A · 天空 HDR 环境'}</button>{['不透射','柔化玻璃','清透玻璃'].map((s,i)=><button key={s} aria-pressed={glass===i} onClick={()=>setGlass(i)}>{s}</button>)}<button aria-pressed={wire} onClick={()=>setWire(v=>!v)}>实体线框</button><button aria-pressed={low} onClick={()=>setLow(v=>!v)}>{low?'恢复标准画质':'LOD / 低分辨率'}</button><button onClick={()=>setPaused(true)}>暂停三维渲染</button></div><p>默认清透玻璃；三档玻璃选择直接作用于所有机位，不随视角暗中切换。清透玻璃能显示室内，但开销更高。天空 HDR 为本地数学生成。局部探针捕获两侧真实试验廊房，仅单点捕获、没有视差校正；它不是完整邻楼反射或完整城市。</p></fieldset>
 <details className="architecture-technical"><summary>研究边界与历史验收记录</summary><p className="citylight-disclosure">G1/G2 整改中 · H98/C98/X98/E98/R98：NOT_READY。旧版单塔约70、整城约10、整站约20为用户主观评价，保留不改写。完整滨水城市与五闸门未通过；本页不作完整城市认证。</p></details></aside></div></>;
}
