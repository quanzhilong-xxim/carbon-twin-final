'use client';
import { SceneResources } from '@/lib/three/scene-assets';
import { SceneFrameReady, SceneLifecycle, useSceneRuntime } from '@/lib/three/scene-runtime';
import { useGLTF } from '@/lib/three/scene-assets';

import Link from 'next/link';
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlType } from 'three-stdlib';
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { createStableRenderer, needsStableDrawingBuffer } from '@/lib/citylight/stable-renderer';
import { V12_TIME_PRESETS } from '@/lib/citylight/v12-world-time';

type Time = 'morning' | 'day' | 'afternoon' | 'dusk' | 'blue' | 'night';
const TIME_KEYS:Time[] = ['morning','day','afternoon','dusk','blue','night'];
type View = 'district' | 'front' | 'side' | 'roof' | 'entry';
type Placement = { position: [number, number, number]; rotation?: number; scale?: [number, number, number] };
const PATH = '/models/city-studies/';
const BUILDINGS = [
  { id:'B01', file:'b01-diagrid', name:'春笋 · 斜网格塔', x:-34, z:0, height:96, description:'收束轮廓、贯通斜网格与开放塔冠。建筑意向参考 KPF 春笋塔，非原楼精确复刻。' },
  { id:'B02', file:'b02-spiral', name:'云旋 · 双层幕墙塔', x:0, z:-28, height:110, description:'连续扭转的圆角三角形外壳，幕墙竖梃随体量旋转；参考 Gensler 上海中心的螺旋与空中花园意向。' },
  { id:'B03', file:'b03-deco', name:'时序 · 装饰艺术塔', x:35, z:1, height:84, description:'连续六级退台、凹入窗格、石材壁柱和金属尖顶。采用纽约装饰艺术建筑语汇。' },
] as const;
const CAMERA = { position: [144,89,168] as [number,number,number], fov:38, near:.3, far:900 };
const TIMES: Record<Time,{ sky:string; fog:string; sun:string; power:number; ambient:number; position:[number,number,number] }> = {
  morning:{sky:'#9bb7bd',fog:'#b6c3ba',sun:'#ffe5c1',power:3.1,ambient:1.7,position:[-80,58,100]},
  day:{sky:'#83aebc',fog:'#b3c4c2',sun:'#fff5e0',power:3.8,ambient:2,position:[-75,140,80]},
  afternoon:{sky:'#91b2bf',fog:'#bdc8c2',sun:'#ffe6c6',power:3.5,ambient:1.8,position:[80,85,90]},
  dusk:{sky:'#89999d',fog:'#b7a99a',sun:'#ffd2a0',power:3.3,ambient:1.5,position:[-115,43,90]},
  blue:{sky:'#324866',fog:'#53667b',sun:'#adc8ed',power:.35,ambient:.85,position:[-75,35,80]},
  night:{sky:'#111e31',fog:'#1c2d3d',sun:'#aac6e8',power:.8,ambient:.8,position:[-65,95,80]},
};

class Boundary extends Component<{children:ReactNode;fallback:ReactNode;onError:(error:Error)=>void},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error){this.props.onError(error);}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}

// The GLTF cache owns geometry. Only cloned materials belong to this mounted study.
function useAsset(file:string,time:Time) {
  const {scene}=useGLTF(PATH+file+'.glb');
  const prepared=useMemo(()=>{
    const materials:THREE.Material[]=[];
    const copy=scene.clone(true);
    copy.traverse(child=>{
      if(!(child as THREE.Mesh).isMesh)return;
      const object=child as THREE.Mesh;
      object.castShadow=true;object.receiveShadow=true;
      const clone=(material:THREE.Material)=>{const local=material.clone();materials.push(local);return local;};
      object.material=Array.isArray(object.material)?object.material.map(clone):clone(object.material);
    });
    return {copy,materials};
  },[scene]);
  useEffect(()=>{
    for(const local of prepared.materials){
      if(!(local as THREE.MeshStandardMaterial).isMeshStandardMaterial)continue;
      const material=local as THREE.MeshStandardMaterial;
      if(material.name==='night-window'||material.name==='window-light'){
        material.emissive.set('#ffb663');material.emissiveIntensity=time==='night'?1.25:time==='blue'?.8:time==='dusk'?.035:0;
        material.color.setRGB(file.startsWith('b03')?.055:.12,file.startsWith('b03')?.105:.27,file.startsWith('b03')?.14:.32);material.metalness=.62;material.roughness=.22;
        material.needsUpdate=true;
      }
      material.envMapIntensity=time==='night'?.65:1.1;
    }
  },[prepared,time,file]);
  useEffect(()=>()=>{prepared.materials.forEach(material=>material.dispose());},[prepared]);
  return prepared.copy;
}

function Building({index,time,low,onSelect}:{index:number;time:Time;low:boolean;onSelect:(n:number)=>void}){
  const b=BUILDINGS[index],object=useAsset(b.file+(low?'-lod':''),time);
  return <group position={[b.x,0,b.z]} onClick={event=>{event.stopPropagation();onSelect(index);}} onPointerOver={()=>{document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='';}}>
    <primitive object={object} dispose={null}/>
  </group>;
}

// Material batching in Blender + instancing here keeps street detail independent of instance count.
function AssetInstances({file,placements,time,moving=false}:{file:string;placements:Placement[];time:Time;moving?:boolean}) {
  const object=useAsset(file,time), refs=useRef<THREE.InstancedMesh[]>([]),motion=useRef(0);
  const parts=useMemo(()=>{
    object.updateMatrixWorld(true);const list:{geometry:THREE.BufferGeometry;material:THREE.Material|THREE.Material[];matrix:THREE.Matrix4}[]=[];
    object.traverse(child=>{const mesh=child as THREE.Mesh;if(mesh.isMesh)list.push({geometry:mesh.geometry,material:mesh.material,matrix:mesh.matrixWorld.clone()});});return list;
  },[object]);
  const scratch=useMemo(()=>({matrix:new THREE.Matrix4(),position:new THREE.Vector3(),rotation:new THREE.Quaternion(),scale:new THREE.Vector3(),axis:new THREE.Vector3(0,1,0)}),[]);
  const updateInstances=useCallback(()=>{
    parts.forEach((part,partIndex)=>{
      const mesh=refs.current[partIndex];if(!mesh)return;
      placements.forEach((p,i)=>{
        const x=((p.position[0]+motion.current*2.4*(i%2?-1:1)+90)%180+180)%180-90;
        scratch.position.set(x,p.position[1],p.position[2]);scratch.rotation.setFromAxisAngle(scratch.axis,p.rotation||0);scratch.scale.set(...(p.scale||[1,1,1]));
        scratch.matrix.compose(scratch.position,scratch.rotation,scratch.scale).multiply(part.matrix);mesh.setMatrixAt(i,scratch.matrix);
      });mesh.instanceMatrix.needsUpdate=true;
    });
  },[parts,placements,scratch]);
  useEffect(updateInstances,[updateInstances]);
  useFrame((_,dt)=>{if(!moving||document.hidden)return;motion.current+=Math.min(dt,.1);updateInstances();});
  return <group>{parts.map((part,i)=><instancedMesh key={i} ref={mesh=>{if(mesh)refs.current[i]=mesh;}} args={[part.geometry,part.material,placements.length]} castShadow receiveShadow frustumCulled={false} dispose={null}/>)}</group>;
}

function Instances({placements,children,color,emissive}:{placements:Placement[];children:ReactNode;color:string;emissive?:boolean}) {
  const ref=useRef<THREE.InstancedMesh>(null);
  useEffect(()=>{const mesh=ref.current;if(!mesh)return;const temp=new THREE.Object3D();placements.forEach((p,i)=>{temp.position.set(...p.position);temp.rotation.set(0,p.rotation||0,0);temp.scale.set(...(p.scale||[1,1,1]));temp.updateMatrix();mesh.setMatrixAt(i,temp.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();},[placements]);
  return <instancedMesh ref={ref} args={[undefined,undefined,placements.length]} castShadow={!emissive} receiveShadow>{children}<meshStandardMaterial color={color} roughness={.78} emissive={emissive?color:'#000000'} emissiveIntensity={emissive?1.5:0}/></instancedMesh>;
}

const TREES:Placement[]=Array.from({length:26},(_,i)=>({position:[-62+(i%13)*10,0,i<13?23:-65]}));
const PEOPLE:Placement[]=Array.from({length:26},(_,i)=>({position:[-59+(i%13)*9.2,0,i<13?20:30],rotation:(i*2.4)%6.28}));
const MARKINGS:Placement[]=Array.from({length:22},(_,i)=>({position:[-73+i*7,.035,40],scale:[3.4,.025,.15]}));
const CROSSING:Placement[]=Array.from({length:16},(_,i)=>({position:[-19+(i%8)*1.2,.045,i<8?40:-50],scale:[.65,.035,9]}));
const PAVERS:Placement[]=Array.from({length:50},(_,i)=>({position:[-74+(i%25)*6,.015,i<25?28:21],scale:[5.93,.025,6.9]}));
const LAMPS:Placement[]=Array.from({length:12},(_,i)=>({position:[-65+(i%6)*26,3.9,i<6?28:-41],scale:[.15,7.8,.15]}));
const LAMP_ARMS:Placement[]=LAMPS.map(p=>({position:[p.position[0],7.9,p.position[2]+.7],scale:[.18,.18,1.6]}));
const LAMP_HEADS:Placement[]=LAMPS.map(p=>({position:[p.position[0],7.75,p.position[2]+1.45],scale:[.65,.12,.75]}));
const BENCHES:Placement[]=Array.from({length:8},(_,i)=>({position:[-59+i*17, .65,25],scale:[3,.18,.65]}));

function Street({time,animate}:{time:Time;animate:boolean}) {
  const traffic=useMemo(()=>['sedan','taxi','bus','delivery','electric'].map((file,i)=>({file,placements:[{position:[-53+i*25,0,36],rotation:Math.PI/2},{position:[-58+i*25,0,44],rotation:-Math.PI/2}] as Placement[]})),[]);
  const trunks=useMemo<Placement[]>(()=>TREES.map(p=>({position:[p.position[0],2,p.position[2]],scale:[.3,4,.3]})),[]);
  const crowns=useMemo(()=>TREES.flatMap((p,i)=>[0,1,2].map(j=>({position:[p.position[0]+Math.sin(j*2.1)*1.05,4.4+j*.65,p.position[2]+Math.cos(j*2.1)*.9] as [number,number,number],scale:[1.8+(i%3)*.15,2,1.65] as [number,number,number]}))),[]);
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[700,700]}/><meshStandardMaterial color="#8e9b8a" roughness={1}/></mesh>
    <mesh position={[0,-.10,0]} receiveShadow><boxGeometry args={[152,.2,132]}/><meshStandardMaterial color="#859185" roughness={.93}/></mesh>
    {[40,-50].map(z=><mesh key={z} position={[0,-.01,z]} receiveShadow><boxGeometry args={[152,.04,14]}/><meshStandardMaterial color="#303d43" roughness={.96}/></mesh>)}
    <Instances placements={PAVERS} color="#b5b8a7"><boxGeometry/></Instances>
    <Instances placements={[...MARKINGS,...CROSSING]} color="#dbd5b7"><boxGeometry/></Instances>
    <Instances placements={trunks} color="#5b4938"><cylinderGeometry args={[1,1,1,7]}/></Instances>
    <Instances placements={crowns} color="#46694c"><sphereGeometry args={[1,12,8]}/></Instances>
    <Instances placements={[...LAMPS,...LAMP_ARMS]} color="#394945"><boxGeometry/></Instances>
    <Instances placements={LAMP_HEADS} color={time==='night'||time==='blue'?'#ffe1a1':'#d2cdb3'} emissive={time==='night'||time==='blue'}><boxGeometry/></Instances>
    <Instances placements={BENCHES} color="#886b48"><boxGeometry/></Instances>
    <Instances placements={BENCHES.flatMap(p=>[-1,1].map(s=>({position:[p.position[0]+s*1.1,.3,p.position[2]] as [number,number,number],scale:[.12,.6,.6] as [number,number,number]})))} color="#414d48"><boxGeometry/></Instances>
    {traffic.map(({file,placements})=><AssetInstances key={file} file={'vehicle-'+file} placements={placements} time={time} moving={animate}/>)}
    <AssetInstances file="pedestrian" placements={PEOPLE} time={time}/>
  </group>;
}

function Lighting({time}:{time:Time}) {
  const {gl,scene}=useThree(),t=TIMES[time];
  // Locally authored analytic skyline reflection: no remote HDRI or network dependency.
  useEffect(()=>{
    const w=256,h=128,data=new Uint8Array(w*h*4),background=new Uint8Array(w*h*4),sky=new THREE.Color(t.sky),horizon=new THREE.Color(time==='night'?'#35455d':'#ded2bf'),ground=new THREE.Color('#526459');
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const v=y/h,u=x/w;const color=v>.5?sky.clone().lerp(horizon,Math.pow((1-v)*2,3)):ground.clone().lerp(horizon,Math.exp(-(((v-.5)*28)**2)));
      const cloud=Math.max(0,Math.sin(u*35+Math.sin(v*28)*.8)*Math.sin(v*47+u*8))*.2*Math.max(0,(v-.5)*2);
      color.lerp(new THREE.Color('#f4eade'),cloud);
      const p=(y*w+x)*4;const bg=sky.clone().lerp(horizon,.5*Math.exp(-(((v-.5)*10)**2))).convertLinearToSRGB();background[p]=bg.r*255;background[p+1]=bg.g*255;background[p+2]=bg.b*255;background[p+3]=255;
      const sun=Math.exp(-(((u-.18)*55)**2+((v-.56)*36)**2));color.addScalar(sun*(time==='night'?.2:1));
      if(v>.4&&v<.5&&Math.sin(x*.67)>.25)color.multiplyScalar(.45);
      color.convertLinearToSRGB();data[p]=Math.min(255,color.r*255);data[p+1]=Math.min(255,color.g*255);data[p+2]=Math.min(255,color.b*255);data[p+3]=255;
    }
    const texture=new THREE.DataTexture(data,w,h);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
    const backdrop=new THREE.DataTexture(background,w,h);backdrop.mapping=THREE.EquirectangularReflectionMapping;backdrop.colorSpace=THREE.SRGBColorSpace;backdrop.needsUpdate=true;scene.background=backdrop;
    const pmrem=new THREE.PMREMGenerator(gl),target=pmrem.fromEquirectangular(texture);scene.environment=target.texture;gl.domElement.dataset.environment='local-analytic';
    let active=true,photographic:THREE.WebGLRenderTarget|undefined,hdr:THREE.DataTexture|undefined;
    if(time!=='night'&&time!=='blue')new HDRLoader().load(PATH+(time==='dusk'||time==='morning'?'venice_sunset_1k.hdr':'potsdamer_platz_1k.hdr'),image=>{
      if(!active){image.dispose();return;}hdr=image;photographic=pmrem.fromEquirectangular(image);scene.environment=photographic.texture;gl.domElement.dataset.environment=time==='day'?'PolyHaven CC0 / Potsdamer Platz':'PolyHaven CC0 / Venice Sunset';
    },undefined,()=>{if(active)gl.domElement.dataset.environment='local-analytic / HDRI load failed';});
    return()=>{active=false;if(scene.environment===target.texture||scene.environment===photographic?.texture)scene.environment=null;if(scene.background===backdrop)scene.background=null;photographic?.dispose();hdr?.dispose();target.dispose();texture.dispose();backdrop.dispose();pmrem.dispose();};
  },[gl,scene,time,t.sky]);
  return <>
    <fog attach="fog" args={[t.fog,210,650]}/>
    <hemisphereLight color={time==='night'?'#9ebdda':'#d7e8e8'} groundColor="#64735b" intensity={t.ambient}/>
    <directionalLight position={t.position} color={t.sun} intensity={t.power} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-100} shadow-camera-right={100} shadow-camera-top={140} shadow-camera-bottom={-80} shadow-camera-near={.5} shadow-camera-far={400} shadow-bias={-.00015} shadow-normalBias={.16}/>
  </>;
}

function Director({selected,view,revision,time,quality,policy,onSlow,onReady}:{selected:number;view:View;revision:number;time:Time;quality:'standard'|'economy';policy:string;onSlow:()=>void;onReady:()=>void}){
  const {camera,gl,scene}=useThree();const controls=useRef<OrbitControlType>(null),travel=useRef(true),ready=useRef(false),slow=useRef(0),reduced=useRef(false);
  const destination=useMemo(()=>{
    const b=BUILDINGS[selected],target=new THREE.Vector3(b.x,b.height*.48,b.z),distance=b.height/(2*Math.tan(THREE.MathUtils.degToRad(19)))*1.18;
    if(view==='district')return {position:new THREE.Vector3(144,89,168),target:new THREE.Vector3(0,38,-8)};
    if(view==='entry')return {position:new THREE.Vector3(b.x+9,6.8,b.z+(selected===1?26:22)),target:new THREE.Vector3(b.x,3.6,b.z+(selected===1?14:10))};
    if(view==='roof')return {position:new THREE.Vector3(b.x+42,b.height+28,b.z+49),target:new THREE.Vector3(b.x,b.height*.78,b.z)};
    return {position:new THREE.Vector3(b.x+distance*(view==='side'?.995:.47),b.height*.64,b.z+distance*(view==='side'?.10:.883)),target};
  },[selected,view]);
  useEffect(()=>{travel.current=true;ready.current=false;},[destination,revision]);
  useEffect(()=>{gl.domElement.dataset.quality=quality;gl.domElement.dataset.renderPolicy=policy;slow.current=0;},[gl,quality,policy]);
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>{reduced.current=query.matches;};change();query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  useEffect(()=>{gl.shadowMap.needsUpdate=true;},[gl,time]);
  const sample=useRef({seconds:0,frames:0,ms:[] as number[]}),pose=useRef(0);
  useEffect(()=>{const el=gl.domElement;const cancel=()=>{travel.current=false;};el.addEventListener('pointerdown',cancel);el.addEventListener('wheel',cancel,{passive:true});return()=>{el.removeEventListener('pointerdown',cancel);el.removeEventListener('wheel',cancel);};},[gl]);
  // OrbitControls damping is per frame; compensate for low frame rates before drei updates it.
  useFrame((_,dt)=>{if(controls.current)controls.current.dampingFactor=reduced.current?1:1-Math.pow(1-.12,Math.min(dt,.5)*60);},-2);
  useFrame((_,dt)=>{
    if(controls.current&&travel.current){const amount=reduced.current?1:1-Math.exp(-dt*4);camera.position.lerp(destination.position,amount);controls.current.target.lerp(destination.target,amount);controls.current.update();if(camera.position.distanceTo(destination.position)<.04)travel.current=false;}
    pose.current+=dt;if(pose.current>.2){gl.domElement.dataset.camera=camera.position.toArray().map(n=>n.toFixed(2)).join(',');gl.domElement.dataset.target=controls.current?.target.toArray().map(n=>n.toFixed(2)).join(',');pose.current=0;}
    if(!travel.current&&!ready.current){ready.current=true;gl.domElement.dataset.modelsLoaded=view==='district'?'3':'1';onReady();}
    if(document.hidden){sample.current={seconds:0,frames:0,ms:[]};return;}const s=sample.current;s.seconds+=dt;s.frames++;s.ms.push(dt*1000);
    gl.domElement.dataset.maxFrameMs=String(Math.max(Number(gl.domElement.dataset.maxFrameMs)||0,dt*1000));
    if(dt>.5)gl.domElement.dataset.framesOver500ms=String((Number(gl.domElement.dataset.framesOver500ms)||0)+1);
    if(s.seconds>2){const sorted=s.ms.sort((a,b)=>a-b);const data=gl.domElement.dataset;const fps=s.frames/s.seconds;data.fps=fps.toFixed(1);data.frameP95=sorted[Math.floor(sorted.length*.95)].toFixed(1);data.drawCalls=String(gl.info.render.calls);data.triangles=String(gl.info.render.triangles);data.geometries=String(gl.info.memory.geometries);data.textures=String(gl.info.memory.textures);const materials=new Set<THREE.Material>();scene.traverse(child=>{const mesh=child as THREE.Mesh;if(mesh.isMesh)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>materials.add(m));});data.windowMaterials=JSON.stringify(Array.from(materials).filter(m=>/window|light/.test(m.name)).map(m=>({name:m.name,type:m.type,emissive:(m as THREE.MeshStandardMaterial).emissiveIntensity})));slow.current=fps<22?slow.current+1:0;if(slow.current===2&&policy==='standard'&&quality==='standard')onSlow();s.seconds=0;s.frames=0;s.ms=[];}
  });
  return <OrbitControls ref={controls} makeDefault target={[0,38,-8]} minDistance={12} maxDistance={320} maxPolarAngle={Math.PI*.49} enableDamping onStart={()=>{travel.current=false;}}/>;
}

export default function CityStudies(){
  const [time,setTime]=useState<Time>('dusk'),[selected,setSelected]=useState(0),[view,setView]=useState<View>('district'),[quality,setQuality]=useState<'standard'|'economy'>('standard'),[revision,setRevision]=useState(0),[ready,setReady]=useState(false),[animate,setAnimate]=useState(false);
  const [pageVisible,setPageVisible]=useState(true);
  useEffect(()=>{const update=()=>setPageVisible(!document.hidden);update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
  const runtime=useSceneRuntime(pageVisible,'建筑研究街区');
  useEffect(()=>setReady(false),[view,selected,revision]);
  useEffect(()=>{const params=new URLSearchParams(location.search),index=BUILDINGS.findIndex(b=>b.id===params.get('building')),requested=params.get('view');if(index>=0)setSelected(index);if(['district','front','side','roof','entry'].includes(requested||''))setView(requested as View);else if(index>=0)setView('front');},[]);
  const viewport=useRef<HTMLElement>(null);
  const [surface,setSurface]=useState({width:0,height:0,stable:false});
  useEffect(()=>{
    const element=viewport.current;if(!element)return;
    let timer:ReturnType<typeof setTimeout>;
    const observer=new ResizeObserver(entries=>{const box=entries[0].contentRect;clearTimeout(timer);timer=setTimeout(()=>setSurface(previous=>previous.width===box.width&&previous.height===box.height?previous:{width:box.width,height:box.height,stable:needsStableDrawingBuffer()}),120);});
    observer.observe(element);return()=>{clearTimeout(timer);observer.disconnect();};
  },[]);
  const [software,setSoftware]=useState(false),[limited,setLimited]=useState(false);
  const onSlow=useCallback(()=>setLimited(true),[]),onReady=useCallback(()=>setReady(true),[]);
  const policy=quality==='economy'?'manual-economy':software?'software-safe':limited?'adaptive-low-throughput':'standard';
  const ratio=quality==='economy'?.65:software||limited?.7:1;
  const createRenderer=useCallback((canvas:HTMLCanvasElement|OffscreenCanvas)=>createStableRenderer(canvas,ratio),[ratio]);
  useEffect(()=>()=>{document.body.style.cursor='';},[]);
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');if(query.matches)setAnimate(false);},[]);
  const fallback=<div className="city-studies-fallback" role="status"><h2>{runtime.lost?'图形连接正在恢复':'三维视图暂不可用'}</h2><p>{runtime.error||'等待浏览器恢复图形连接，也可重建视图。'}</p><div className="city-studies-buttons"><button onClick={()=>{runtime.retry();setReady(false);}}>重新加载三维视图</button><Link href="/">返回原城市</Link></div></div>;
  const b=BUILDINGS[selected];
  return <>
    <header className="city-studies-header"><div><span className="city-studies-kicker">CARBONTWIN / ARCHITECTURE ATELIER / 01—03</span><h1>让城市拥有真实的轮廓。</h1><p>沿着斜网格、扭转与退台三种结构探索城市。拖动观察体量，滚轮靠近幕墙；从天际线走到街道入口，观察每一层细节。</p></div><Link href="/">返回原城市 ↗</Link></header>
    <div className="city-studies-layout">
      <section ref={viewport} className="city-studies-viewport" aria-label="三栋标杆建筑交互样片" data-ready={ready&&runtime.ready} data-load-state={runtime.phase} data-time={time} data-view={view} data-selected={b.id}>
        {runtime.error?fallback:surface.width>0&&<Boundary key={runtime.generation} fallback={fallback} onError={runtime.fail}><SceneResources.Provider value={runtime.scope}><Canvas key={surface.stable?`${surface.width}:${surface.height}:${ratio}`:'native'} frameloop={!pageVisible||runtime.lost?'never':'always'} shadows={quality==='standard'&&!software&&!limited} camera={CAMERA} dpr={ratio} gl={createRenderer} onCreated={({gl})=>{const canvas=gl.domElement,context=gl.getContext(),ext=context.getExtension('WEBGL_debug_renderer_info'),renderer=String(ext?context.getParameter(ext.UNMASKED_RENDERER_WEBGL):context.getParameter(context.RENDERER));const isSoftware=/swiftshader|llvmpipe|software/i.test(renderer);setSoftware(isSoftware);canvas.dataset.renderer=renderer;canvas.dataset.software=String(isSoftware);} }>
          <SceneLifecycle runtime={runtime}/><Lighting time={time}/><Suspense fallback={null}><Street time={time} animate={animate}/>{BUILDINGS.map((_,i)=>(view==='district'||i===selected)&&<Building key={i} index={i} time={time} low={software||limited||quality==='economy'} onSelect={i=>{setSelected(i);setView('front');setRevision(v=>v+1);}}/>)}<Director selected={selected} view={view} revision={revision} time={time} quality={quality} policy={policy} onSlow={onSlow} onReady={onReady}/><SceneFrameReady scope={runtime.scope} onReady={runtime.onRendered}/></Suspense>
        </Canvas></SceneResources.Provider></Boundary>}
        {runtime.lost&&fallback}
        {!runtime.lost&&!runtime.error&&<div className="city-studies-overlay"><div><strong>{view==='district'?'三种建筑语汇 · 一个城市街区':b.name}</strong>{ready&&runtime.ready?'拖动旋转 / 滚轮缩放 / 点击建筑靠近':`正在加载建筑与街道 · ${runtime.progress.loaded}/${runtime.progress.total} 组资源`}</div><span>BLENDER → GLB → WEBGL<br/>三种结构 · 六段光线</span></div>}
      </section>
      <aside className="city-studies-panel"><div><span className="city-studies-kicker">MODEL / MATERIAL / LIGHT</span><h2>{b.name}</h2><p>{b.description}</p><small>本地原创模型，非照片贴面。当前仅审查 B01–B03，尚未替换主页的 25 栋建筑。</small></div>
        <fieldset><legend>建筑样片</legend><div className="city-studies-buttons city-study-buildings">{BUILDINGS.map((item,i)=><button key={item.id} aria-pressed={selected===i&&view!=='district'} onClick={()=>{setSelected(i);setView('front');setRevision(v=>v+1);}}>{item.id} {item.name}</button>)}</div></fieldset>
        <fieldset><legend>观察距离</legend><div className="city-studies-buttons">{([['district','街区全景'],['front','正面体量'],['side','侧面幕墙'],['roof','屋顶细节'],['entry','入口街道']] as [View,string][]).map(([key,label])=><button key={key} aria-pressed={view===key} onClick={()=>{setView(key);setRevision(v=>v+1);}}>{label}</button>)}</div></fieldset>
        <fieldset><legend>光线研究</legend><div className="city-studies-buttons">{V12_TIME_PRESETS.map((preset,i)=><button key={preset.label} aria-pressed={time===TIME_KEYS[i]} onClick={()=>setTime(TIME_KEYS[i])}>{preset.label}</button>)}</div></fieldset>
        <fieldset><legend>运行设置</legend><div className="city-studies-buttons"><button aria-pressed={quality==='economy'} onClick={()=>{setQuality(q=>q==='standard'?'economy':'standard');setLimited(false);}}>{quality==='standard'?'切换节能画质':'恢复标准画质'}</button><button aria-pressed={animate} onClick={()=>setAnimate(v=>!v)}>{animate?'暂停街道交通':'播放街道交通'}</button></div><p>{software?'检测到软件渲染，已启用保留轮廓的轻量模型，降低分辨率并关闭动态阴影。':limited?'当前渲染速度较低，已切换轻量模型、降低分辨率并关闭动态阴影。':'节能档使用保留轮廓的轻量模型、降低分辨率并关闭动态阴影。'}所有操作均在本地渲染。</p></fieldset>
      </aside>
    </div>
    <section className="city-studies-note" aria-label="样片审查说明"><article><h3>01 / 看轮廓</h3><p>收束、扭转、退台，三种不同的结构逻辑。以侧面与屋顶视角检查体量，不能只看一张正面截图。</p></article><article><h3>02 / 看街道</h3><p>车辆包含车窗、轮毂与车灯；行人、树木、斑马线、长椅和灯杆提供尺度参照。近景仍需用户逐项审美验收。</p></article><article><h3>03 / 看依据</h3><p>建筑意向参考 KPF 与 Gensler 官方项目介绍。本页为原创建筑研究，并非精确数字孪生；不提供虚构能耗或减排数据。</p></article></section>
    <details className="architecture-technical"><summary>研究范围与历史验收记录</summary><p className="city-studies-status">阶段状态：三栋建筑样片审查中。原城市用户视觉评价维持 60/100，尚未获得新的验收评分。收费 AI 生成调用：0。</p></details>
  </>;
}
