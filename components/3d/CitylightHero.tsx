'use client';
import { SceneResources, useGLTF } from '@/lib/three/scene-assets';
import { SceneFrameReady, SceneLifecycle, useSceneRuntime } from '@/lib/three/scene-runtime';

import Link from 'next/link';
import {Component,Suspense,useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';

import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStableRenderer,needsStableDrawingBuffer} from '@/lib/citylight/stable-renderer';
import {HERO_VIEWS,LIGHT_TOWER,clampWorldTime,type HeroView} from '@/lib/citylight/hero';

class ViewBoundary extends Component<{children:ReactNode;fallback:ReactNode;onError:(error:Error)=>void},{failed:boolean}>{
  state={failed:false};static getDerivedStateFromError(){return{failed:true};}
  componentDidCatch(error:Error){this.props.onError(error);}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}

function Tower({time,glass,near,wireframe,onHover,onPick}:{time:number;glass:boolean;near:boolean;wireframe:boolean;onHover:(v:boolean)=>void;onPick:()=>void}){
  const asset=useGLTF(LIGHT_TOWER.uri);
  const owned=useMemo(()=>{
    const scene=asset.scene.clone(true),materials:THREE.MeshStandardMaterial[]=[];
    scene.traverse(child=>{const mesh=child as THREE.Mesh;if(!mesh.isMesh)return;
      mesh.castShadow=true;mesh.receiveShadow=true;
      const clone=(source:THREE.Material)=>{const local=source.clone() as THREE.MeshStandardMaterial;materials.push(local);return local;};
      mesh.material=Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);
    });return{scene,materials};
  },[asset.scene]);
  useEffect(()=>{
    for(const material of owned.materials){
      if(!material.isMeshStandardMaterial)continue;
      material.wireframe=wireframe;
      if(material.name==='curtain-warm'){material.emissive.set('#ffd09b');material.emissiveIntensity=Math.max(0,(time-.22)/.78)*.55;}
      if(material.name==='light-strip'){material.emissiveIntensity=.3+time*1.7;}
      // Satin metal keeps the canopy readable under the lobby point lights;
      // the earlier narrow specular lobes produced white vertical hot spots.
      if(material.name==='copper'){material.roughness=.5;material.metalness=.65;}
      if(material.name==='clear-glass'||material.name==='office-glass'){
        const physical=material as THREE.MeshPhysicalMaterial;
        if(physical.isMeshPhysicalMaterial){physical.transmission=glass&&near?.98:0;physical.roughness=.04;physical.thickness=.025;physical.ior=1.45;physical.needsUpdate=true;}
      }
      material.envMapIntensity=1-time*.35;
    }
  },[owned,time,glass,near,wireframe]);
  useEffect(()=>()=>owned.materials.forEach(material=>material.dispose()),[owned]);
  return <group name={LIGHT_TOWER.id} userData={{entityId:LIGHT_TOWER.id}} onPointerOver={e=>{e.stopPropagation();onHover(true);}} onPointerOut={()=>onHover(false)} onClick={e=>{e.stopPropagation();if(e.delta<=5)onPick();}}><primitive object={owned.scene} dispose={null}/></group>;
}

function Environment({time}:{time:number}){
  const{gl,scene}=useThree();
  const sky=useMemo(()=>new THREE.Color('#bec5cb').lerp(new THREE.Color('#152d52'),Math.min(time/.55,1)).lerp(new THREE.Color('#07101e'),Math.max(0,(time-.55)/.45)),[time]);
  const sun=useMemo(()=>new THREE.Color('#ffd3a1').lerp(new THREE.Color('#a4bee1'),Math.min(time/.55,1)),[time]);
  useEffect(()=>{
    const width=128,height=64,data=new Float32Array(width*height*4);
    const horizon=sky.clone().lerp(new THREE.Color('#dbb38b').lerp(new THREE.Color('#617388'),time),.5-time*.22);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const v=y/height;
      const c=v>.5?sky.clone().lerp(horizon,Math.exp(-(((v-.5)*9)**2))):new THREE.Color('#202c35').lerp(horizon,.12);
      // A shared analytic sky/probe for this isolated G2 asset study. Local
      // reflection capture of surrounding buildings belongs to the G3 block.
      const i=(y*width+x)*4;data[i]=c.r;data[i+1]=c.g;data[i+2]=c.b;data[i+3]=1;
    }
    const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);texture.mapping=THREE.EquirectangularReflectionMapping;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
    const pmrem=new THREE.PMREMGenerator(gl),target=pmrem.fromEquirectangular(texture);scene.environment=target.texture;scene.background=texture;
    return()=>{if(scene.environment===target.texture)scene.environment=null;if(scene.background===texture)scene.background=null;target.dispose();texture.dispose();pmrem.dispose();};
  },[gl,scene,sky,time]);
  return <><hemisphereLight args={[new THREE.Color('#b2c6e1').lerp(new THREE.Color('#7796bd'),time),'#3b3b32',1.35-time*.7]}/><directionalLight position={[-65,Math.max(12,45-time*33),80]} color={sun} intensity={2.2-time*1.4} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-48} shadow-camera-right={48} shadow-camera-top={145} shadow-camera-bottom={-22} shadow-camera-far={260} shadow-normalBias={.16}/><pointLight position={[0,3.8,7]} color="#ffdcac" intensity={95} distance={32} decay={2}/><pointLight position={[-11,3.8,6]} color="#ffdcac" intensity={50} distance={22} decay={2}/><fog attach="fog" args={[sky,260,650]}/></>;
}

function PavingJoints(){
  const mesh=useRef<THREE.InstancedMesh>(null);
  useEffect(()=>{if(!mesh.current)return;const object=new THREE.Object3D();let i=0;
    for(let n=0;n<21;n++){object.position.set(-40+n*4,.005,0);object.scale.set(.018,.008,70);object.updateMatrix();mesh.current.setMatrixAt(i++,object.matrix);}
    for(let n=1;n<20;n++){object.position.set(0,.006,-40+n*4);object.scale.set(80,.008,.018);object.updateMatrix();mesh.current.setMatrixAt(i++,object.matrix);}
    mesh.current.instanceMatrix.needsUpdate=true;mesh.current.computeBoundingSphere();
  },[]);
  return <instancedMesh ref={mesh} args={[undefined,undefined,40]}><boxGeometry/><meshStandardMaterial color="#464c4c" roughness={1}/></instancedMesh>;
}

function StaticShadows({time,enabled,view,glass,wireframe}:{time:number;enabled:boolean;view:HeroView;glass:boolean;wireframe:boolean}){
  const{gl}=useThree();
  useEffect(()=>{
    const previous=gl.shadowMap.autoUpdate;
    // This isolated asset has no animated geometry. Camera motion does not
    // change its directional shadow map; redraw when lighting/material changes.
    gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;
    gl.domElement.dataset.shadowPolicy='static-scene-update-on-change';
    return()=>{gl.shadowMap.autoUpdate=previous;};
  },[gl,time,enabled,view,glass,wireframe]);
  return null;
}

function Forecourt({time}:{time:number}){
  return <group>
    <mesh position={[0,-.18,0]} receiveShadow><boxGeometry args={[95,.3,84]}/><meshStandardMaterial color="#555d60" roughness={.9}/></mesh>
    <mesh position={[0,-.025,0]} receiveShadow><boxGeometry args={[81,.05,71]}/><meshStandardMaterial color="#8b8b7e" roughness={.72}/></mesh>
    <PavingJoints/>
    {[-29,29].map(x=><group key={x} position={[x,0,21]}><mesh position={[0,.4,0]}><boxGeometry args={[4,.8,7]}/><meshStandardMaterial color="#434c4b" roughness={.8}/></mesh><mesh position={[0,1.1,0]}><boxGeometry args={[3.5,.7,6.5]}/><meshStandardMaterial color="#263e30" roughness={.95}/></mesh><mesh position={[0,2.8,0]}><cylinderGeometry args={[.13,.2,4.6,8]}/><meshStandardMaterial color="#514638"/></mesh><mesh position={[0,5.5,0]} castShadow><sphereGeometry args={[2.4,16,12]}/><meshStandardMaterial color="#344e3b" roughness={.95}/></mesh></group>)}
    {[-26,-18,-10,10,18,26].map(x=><group key={x} position={[x,0,31]}><mesh position={[0,.45,0]}><cylinderGeometry args={[.12,.16,.9,8]}/><meshStandardMaterial color="#3d4547" roughness={.48}/></mesh><mesh position={[0,.82,0]}><cylinderGeometry args={[.1,.1,.12,8]}/><meshStandardMaterial color="#f4ca8c" emissive="#ffd39b" emissiveIntensity={time*1.8}/></mesh></group>)}
  </group>;
}

function CameraDirector({view,revision,onUser,onReady,onMetrics}:{view:HeroView;revision:number;onUser:()=>void;onReady:()=>void;onMetrics:(v:string)=>void}){
  const{camera,gl,scene}=useThree();const controls=useRef<OrbitControls>(),travelling=useRef(true),stable=useRef(false),reduced=useRef(false);
  const sample=useRef({time:0,frames:[] as number[]}),target=HERO_VIEWS[view].pose;
  useEffect(()=>{
    const orbit=new OrbitControls(camera,gl.domElement);orbit.enableDamping=true;orbit.minDistance=5;orbit.maxDistance=260;orbit.maxPolarAngle=Math.PI*.53;controls.current=orbit;
    const start=()=>{travelling.current=false;onUser();};orbit.addEventListener('start',start);
    const media=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>{reduced.current=media.matches;};change();media.addEventListener('change',change);
    return()=>{orbit.removeEventListener('start',start);orbit.dispose();controls.current=undefined;media.removeEventListener('change',change);};
  },[camera,gl,onUser]);
  useEffect(()=>{travelling.current=true;stable.current=false;gl.domElement.dataset.stable='false';},[view,revision,gl]);
  const position=useMemo(()=>new THREE.Vector3(...target.position),[target]),lookAt=useMemo(()=>new THREE.Vector3(...target.target),[target]);
  useFrame((_,dt)=>{
    const orbit=controls.current;if(!orbit)return;
    orbit.dampingFactor=reduced.current?1:1-Math.pow(.88,Math.min(dt,.5)*60);
    if(travelling.current){
      const amount=reduced.current?1:1-Math.exp(-dt*4),radius=Math.hypot(camera.position.x,camera.position.z),desiredRadius=Math.hypot(position.x,position.z);
      const angle=Math.atan2(camera.position.x,camera.position.z),desiredAngle=Math.atan2(position.x,position.z),shortest=Math.atan2(Math.sin(desiredAngle-angle),Math.cos(desiredAngle-angle));
      // Move around the tower instead of interpolating through its centre.
      camera.position.setFromCylindricalCoords(THREE.MathUtils.lerp(radius,desiredRadius,amount),angle+shortest*amount,THREE.MathUtils.lerp(camera.position.y,position.y,amount));
      orbit.target.lerp(lookAt,amount);if(camera.position.distanceTo(position)<.04){camera.position.copy(position);orbit.target.copy(lookAt);travelling.current=false;}
    }
    orbit.update();camera.position.y=Math.max(1.65,camera.position.y);
    const radius=Math.hypot(camera.position.x,camera.position.z),safeRadius=18+12*THREE.MathUtils.clamp((12-camera.position.y)/2,0,1);
    if(radius<safeRadius){if(radius>.001){camera.position.x*=safeRadius/radius;camera.position.z*=safeRadius/radius;}else camera.position.z=safeRadius;}
    camera.lookAt(orbit.target);
    const data=gl.domElement.dataset;data.entityId=LIGHT_TOWER.id;data.camera=camera.position.toArray().map(n=>n.toFixed(3)).join(',');data.target=orbit.target.toArray().map(n=>n.toFixed(3)).join(',');
    if(!travelling.current&&!stable.current){stable.current=true;data.stable='true';onReady();}
    const s=sample.current;if(dt>.5||document.hidden)return;s.time+=dt;s.frames.push(dt*1000);
    if(s.time>=2){const sorted=s.frames.slice().sort((a,b)=>a-b);data.fps=(s.frames.length/s.time).toFixed(1);data.p95=sorted[Math.floor(sorted.length*.95)].toFixed(1);data.drawCalls=String(gl.info.render.calls);data.triangles=String(gl.info.render.triangles);data.geometries=String(gl.info.memory.geometries);data.textures=String(gl.info.memory.textures);data.entityCount=String(scene.children.length);onMetrics(`${data.fps} FPS · p95 ${data.p95} ms`);s.time=0;s.frames=[];}
  });return null;
}

export default function CitylightHero(){
  const[view,setView]=useState<HeroView>('front'),[time,setTime]=useState(.55),[glass,setGlass]=useState(true),[wireframe,setWireframe]=useState(false),[hover,setHover]=useState(false),[mode,setMode]=useState('PHOTO'),[revision,setRevision]=useState(0),[ready,setReady]=useState(false),[metrics,setMetrics]=useState('正在采样'),[economy,setEconomy]=useState(false);
  const[paused,setPaused]=useState(false);
  const[pageVisible,setPageVisible]=useState(true);
  useEffect(()=>{const update=()=>setPageVisible(!document.hidden);update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
  const runtime=useSceneRuntime(!paused&&pageVisible,'光之塔');
  const displayed=ready&&runtime.ready&&!paused;
  const viewport=useRef<HTMLElement>(null),[surface,setSurface]=useState({width:0,height:0,stable:false});
  const ratio=economy?.7:1;
  useEffect(()=>{const element=viewport.current;if(!element)return;let timer:ReturnType<typeof setTimeout>;const observer=new ResizeObserver(entries=>{const box=entries[0].contentRect;clearTimeout(timer);timer=setTimeout(()=>setSurface(p=>p.width===box.width&&p.height===box.height?p:{width:box.width,height:box.height,stable:needsStableDrawingBuffer()}),120);});observer.observe(element);return()=>{clearTimeout(timer);observer.disconnect();};},[]);
  const select=useCallback((next:HeroView)=>{setReady(false);setView(next);setRevision(v=>v+1);setMode('PHOTO');if(next==='night')setTime(1);},[]);
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')select('front');};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[select]);
  const onUser=useCallback(()=>setMode('ORBIT'),[]),onReady=useCallback(()=>setReady(true),[]),onMetrics=useCallback((v:string)=>setMetrics(v),[]);
  const renderer=useCallback((canvas:HTMLCanvasElement|OffscreenCanvas)=>createStableRenderer(canvas,ratio),[ratio]);
  const fallback=<div className="citylight-fallback" role="status"><h2>{paused?'三维视图已暂停':runtime.lost?'图形连接正在恢复':'三维视图暂不可用'}</h2><p>{paused?'三维渲染已停止，可手动恢复。':runtime.error||'等待浏览器恢复图形连接；也可手动重建视图。'}</p><button onClick={()=>{runtime.retry();setPaused(false);setReady(false);}}>重新加载三维</button><Link href="/">返回原站</Link></div>;
  return <>
    <header className="citylight-heading"><div><span className="citylight-kicker">CARBONTWIN / 城市有光 / G2 资产工作台</span><h1>光，落在真实的结构上。</h1><p>一座原创地标，从远处的轮廓，到眼前的幕墙与门厅。先检查这一栋，再让城市生长。</p></div><Link href="/city-studies">保留的三栋研究样片 ↗</Link></header>
    <div className="citylight-workbench">
      <section ref={viewport} className="citylight-viewport" aria-label="光之塔三维模型" data-ready={displayed} data-load-state={runtime.phase} data-entity={LIGHT_TOWER.id} data-view={view} data-mode={mode} data-world-time={time.toFixed(3)} data-glass={glass?'transmission':'opaque'}>
        {paused||runtime.error?fallback:surface.width>0&&<ViewBoundary key={runtime.generation} fallback={fallback} onError={runtime.fail}><SceneResources.Provider value={runtime.scope}><Canvas key={surface.stable?`${surface.width}:${surface.height}:${ratio}`:'native'} frameloop={!pageVisible||runtime.lost?'never':'always'} camera={{position:[108,82,174],fov:45,near:.12,far:700}} dpr={ratio} gl={renderer} shadows={!economy} onCreated={({gl})=>{const canvas=gl.domElement,context=gl.getContext(),ext=context.getExtension('WEBGL_debug_renderer_info');canvas.dataset.renderer=String(ext?context.getParameter(ext.UNMASKED_RENDERER_WEBGL):context.getParameter(context.RENDERER));}}>
          <SceneLifecycle runtime={runtime}/><Environment time={time}/><Suspense fallback={null}><Tower time={time} glass={glass} near={view==='entry'||view==='window'||view==='roof'} wireframe={wireframe} onHover={setHover} onPick={()=>{setMode('BUILDING_FOCUS');setView('front');setReady(false);setRevision(v=>v+1);}}/><Forecourt time={time}/><StaticShadows time={time} enabled={!economy} view={view} glass={glass} wireframe={wireframe}/><CameraDirector view={view} revision={revision} onUser={onUser} onReady={onReady} onMetrics={onMetrics}/><SceneFrameReady scope={runtime.scope} onReady={runtime.onRendered}/></Suspense>
        </Canvas></SceneResources.Provider></ViewBoundary>}
        {runtime.lost&&fallback}
        {!runtime.lost&&!paused&&!runtime.error&&<div className="citylight-caption"><span><strong>{hover?'CL-T01 / 光之塔 · 点击聚焦':HERO_VIEWS[view].label}</strong>{displayed?'拖动环绕 · 滚轮靠近 · Esc 复位':`正在加载模型 / 调整镜头 · ${runtime.progress.loaded}/${runtime.progress.total} 组资源`}</span><small>原创三维资产 / 1 单位 = 1 米<br/>G2 研究中，尚非完整城市</small></div>}
      </section>
      <aside className="citylight-controls"><div><span className="citylight-kicker">CL-T01 / THE LIGHT TOWER</span><h2>光之塔</h2><p>133.8 米，32 层主体。退台幕墙、非对称金属翼、灯笼式塔冠；首层为有实体纵深的双层门厅。</p></div>
        <fieldset><legend>七个验收视角 + 窗内特写</legend><div className="citylight-buttons">{(Object.keys(HERO_VIEWS) as HeroView[]).map(key=><button key={key} aria-pressed={view===key} onClick={()=>select(key)}>{HERO_VIEWS[key].label}</button>)}</div></fieldset>
        <fieldset><legend>同一个世界时钟</legend><label className="citylight-time">夕阳 → 蓝调 → 夜景<input aria-label="世界时间" type="range" min="0" max="1" step=".01" value={time} onChange={e=>setTime(clampWorldTime(Number(e.target.value)))}/></label><div className="citylight-buttons">{[['夕阳',0],['蓝调',.55],['夜景',1]].map(([label,value])=><button key={label} aria-pressed={Math.abs(time-Number(value))<.01} onClick={()=>setTime(Number(value))}>{label}</button>)}</div></fieldset>
        <fieldset><legend>材质与结构对照</legend><div className="citylight-buttons"><button aria-pressed={glass} onClick={()=>setGlass(v=>!v)}>{glass?'B · 门厅透射玻璃':'A · 门厅不透明玻璃'}</button><button aria-pressed={wireframe} onClick={()=>setWireframe(v=>!v)}>{wireframe?'恢复材质':'检查真实线框'}</button><button aria-pressed={economy} onClick={()=>setEconomy(v=>!v)}>{economy?'恢复标准画质':'降低分辨率与阴影'}</button><button onClick={()=>select('front')}>复位镜头</button></div><p>入口、窗内与屋顶机位启用透射；远景保留反射与实体结构，省去透射额外绘制。当前环境探针尚非周围楼群的局部捕获。</p></fieldset>
        <output className="citylight-metrics">{metrics}</output><div className="citylight-buttons"><button onClick={()=>setPaused(true)}>暂停三维渲染</button></div><p className="citylight-disclosure">内部制作阶段。没有步行模式或完整八幕故事；不把本工作台当作整城验收结果。</p>
      </aside>
    </div>
    <section className="citylight-notes"><article><span>01 / 几何</span><h3>近看，仍有结构。</h3><p>幕墙分格、窗梃与楼板边缘具有实体几何；背面有独立服务脊，屋顶包含设备与围护。线框仅用于核验，不代表美术已经达标。</p></article><article><span>02 / 光线</span><h3>天空与建筑，共用时间。</h3><p>拖动时间，观察日光、环境、窗内光和门厅灯带连续变化。没有云端生成，也没有将参考图片铺在楼体上。</p></article><article><span>03 / 边界</span><h3>把这一栋做好，再扩展。</h3><p>完整滨水街区、桥梁、交通、第一视角与八幕电影尚待实现。原站、豆包语音和 AI 试衣保持原入口。</p><Link href="/">返回原站 ↗</Link></article></section>
    <p className="citylight-status">IN_PROGRESS · 原城市用户视觉基线 60/100 保留 · 未达到 R98 正式验收门槛 · 本轮收费 AI API 调用 0 次</p>
  </>;
}
