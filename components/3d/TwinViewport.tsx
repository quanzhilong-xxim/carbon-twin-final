'use client';
import { SceneFrameReady, useSceneRuntime } from '@/lib/three/scene-runtime';
import { SceneResources, Environment } from '@/lib/three/scene-assets';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import { Html, useProgress } from '@react-three/drei';
import {Bloom,DepthOfField,EffectComposer,Noise,SSAO,Vignette} from '@react-three/postprocessing';
import {Suspense,lazy,Component,useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {Leva,useControls} from 'leva';
import * as THREE from 'three';
import gsap from 'gsap';
import {CityBuildings,PhotographicFacade,StreetFurniture,MODEL_BASE} from './TwinAssets';
import CityLife from './CityLife';
import LivingCityStreets from './LivingCityStreets';
import CityBackdrop, {CityPedestrians} from './CityBackdrop';
import CityArchitecture from './CityArchitecture';
import {DistrictReflection,DistrictContactShadows} from './DistrictLighting';
import CitySkyDome from './CitySkyDome';
import SpatialAudio from './SpatialAudio';
const CarbonSculpture=lazy(()=>import('./CarbonSculpture'));
const RoomScene=lazy(()=>import('./RoomScene'));
const OfficeScene=lazy(()=>import('./OfficeScene'));
const CafeScene=lazy(()=>import('./CafeScene'));
import {spaceForBuilding} from '@/lib/experience/spaces';
import TwinCamera from './TwinCamera';
import {useTwinStore} from '@/lib/experience/store';
import {buildingPosition,ORBIT_POSE,type CameraSnapshot} from '@/lib/experience/CameraDirector';
import {createStableRenderer,needsStableDrawingBuffer} from '@/lib/citylight/stable-renderer';
import {useUIStore} from '@/lib/stores/UIStore';
import {performanceTier} from '@/lib/experience/performance';
import {notifyToast} from '../Toast';
import {createTwinId,recordTwinDiagnostic} from '@/lib/experience/diagnostics';
import StorySky, {StoryInteriorAtmosphere} from '../ecology/StorySky';
import {useStoryAtmosphere} from '@/lib/stores/StoryAtmosphere';
import {storyLighting} from '@/lib/visuals/storyLighting';

class TwinBoundary extends Component<{children:ReactNode;onFail:(error:Error)=>void;fallback:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(error:Error){this.props.onFail(error);}render(){return this.state.failed?this.props.fallback:this.props.children;}}
function CaptureFrame(){
 const {gl,scene,camera}=useThree();
 useEffect(()=>{const capture=(event:Event)=>{const done=(event as CustomEvent<{done:(data:string)=>void}>).detail.done;try{if(gl.getContext().isContextLost()){done('');return;}gl.render(scene,camera);done(gl.domElement.toDataURL('image/png'));}catch{done('');}};window.addEventListener('twin-capture',capture);return()=>window.removeEventListener('twin-capture',capture);},[gl,scene,camera]);return null;
}
function RoomLoading(){const {progress}=useProgress();return <Html center><div className="holo-meter" role="status"><small>ENTERING / YOUR EVERYDAY SPACE</small><b>{Math.round(progress)}%</b><span>正在载入家具与室内材质…</span></div></Html>;}
function Loading(){const {progress,active}=useProgress();return <div className="twin-loading" role="status"><span className="twin-loading-symbol">◌</span><small>[ SYSTEM / MATERIALIZING THE INVISIBLE ]</small><b>{active?Math.round(progress):0}<em>%</em></b><div className="twin-load-track"><i style={{width:`${progress}%`}}/></div><span>正在载入真实模型、物理材质与环境光</span></div>;}
function Runtime({onSlow,visible}:{onSlow:()=>void;visible:boolean}){
 const {gl}=useThree(),active=useProgress(s=>s.active),state=useTwinStore(s=>s.experience.state),frameCount=useRef(0),sample=useRef({seconds:0,frames:0,slow:0,warmup:0,resume:2});
 useEffect(()=>{sample.current={seconds:0,frames:0,slow:0,warmup:0,resume:2};},[state,active,visible]);
 useFrame((_,dt)=>{gl.domElement.dataset.sceneFrames=String(++frameCount.current);gl.domElement.dataset.sceneTriangles=String(gl.info.render.triangles);gl.domElement.dataset.drawCalls=String(gl.info.render.calls);const s=sample.current;
  // A resumed offscreen canvas has a long clock delta, not a slow GPU frame.
  if(!visible||document.hidden||active){s.seconds=0;s.frames=0;s.slow=0;s.warmup=0;s.resume=2;return;}
  if(s.resume>0){s.resume--;return;}
  if(!['orbit','focused','room','inspecting','layout','viewing'].includes(state))return;s.warmup+=dt;if(s.warmup<8)return;s.seconds+=dt;s.frames++;if(s.seconds<3)return;const fps=s.frames/s.seconds,q=useTwinStore.getState().quality;gl.domElement.dataset.fps=fps.toFixed(1);const next=performanceTier(fps,q);s.slow=next!==q?s.slow+1:0;if(s.slow>=3){s.slow=0;if(next==='static')onSlow();else{useTwinStore.setState({quality:next,particles:32});notifyToast(next==='low'?'持续低帧率，已关闭阴影与后处理，保留可交互三维。':'已降低画质与粒子预算，保留空间导航。');}}s.seconds=0;s.frames=0;});
 useEffect(()=>()=>{gl.renderLists.dispose();},[gl]);
 return null;
}
function World({rotationMode,preview,bloom,lighting,contextActive,ambientPaused}:{rotationMode:boolean;preview:boolean;bloom:number;lighting:number;contextActive:boolean;ambientPaused:boolean}){
 const sculpture=useTwinStore(s=>s.sculpture),experience=useTwinStore(s=>s.experience),quality=useTwinStore(s=>s.quality),[x,,z]=buildingPosition(experience.building),space=spaceForBuilding(experience.building),inside=['entering','viewing','room','inspecting','layout','scrolling'].includes(experience.state);
 const time=useStoryAtmosphere(s=>s.time),night=time==='night',lightingPreset=storyLighting(time);
 return <>
  <color attach="background" args={['#101b25']}/>{inside?<><fogExp2 attach="fog" args={['#162630',.003]}/><StoryInteriorAtmosphere/></>:<StorySky scale={10} shadows={quality!=='low'} cachedShadows paused={ambientPaused} fogRange={[95,320]} skyVisible={false}/>}
  {!inside&&<CitySkyDome paused={ambientPaused}/>}
  <Environment files={inside?`${MODEL_BASE}interior.hdr`:night?`${MODEL_BASE}night.hdr`:'/environments/citylight/kloppenheim_06_puresky_1k.hdr'} environmentIntensity={inside?.65:lightingPreset.environment} environmentRotation={[0,1.2,0]}/>
  <ambientLight intensity={inside?.03:night?.06:.12*lighting} color="#b5d2e5"/>
  <directionalLight position={[18,45,24]} intensity={inside?.1:night?.12:.28*lighting} color="#a5c7e0"/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.08,-990]} receiveShadow><planeGeometry args={[2000,2000]}/><meshStandardMaterial color="#7c8c80" roughness={.95}/></mesh>
  {(!inside||experience.state==='entering'||experience.state==='scrolling')&&<><CityBackdrop/><LivingCityStreets paused={ambientPaused}/><CityArchitecture/><CityBuildings landmarksOnly/><PhotographicFacade/><StreetFurniture/><CityLife paused={ambientPaused}/><CityPedestrians/><DistrictContactShadows/>{!inside&&quality!=='low'&&<DistrictReflection/>}</>}
  {!preview&&inside&&<group position={[x,5,z]}><Suspense fallback={<RoomLoading/>}>{space==='office'?<OfficeScene/>:space==='cafe'?<CafeScene/>:<RoomScene rotationMode={rotationMode}/>} </Suspense>{sculpture&&<Suspense fallback={null}><CarbonSculpture/></Suspense>}</group>}
  <CaptureFrame/>{inside&&<SpatialAudio/>}
  {contextActive&&quality==='high'&&bloom>0&&<EffectComposer enableNormalPass multisampling={0}>
    <Bloom luminanceThreshold={.8} mipmapBlur intensity={bloom}/>
    {quality==='high'?<SSAO samples={8} rings={3} radius={.15} intensity={8} worldDistanceThreshold={20} worldDistanceFalloff={5} worldProximityThreshold={.3} worldProximityFalloff={.1}/>:<Vignette darkness={.18} offset={.25}/>}
    {quality==='high'?<DepthOfField target={inside?[x-1,6,z-1]:[0,6,0]} focalLength={.035} bokehScale={1.2} height={360}/>:<Noise opacity={.007}/>}
  </EffectComposer>}
 </>;
}
export default function TwinViewport({preview=false,rotationMode=false}:{preview?:boolean;rotationMode?:boolean}){
 const experience=useTwinStore(s=>s.experience),renderFault=useTwinStore(s=>s.renderFault),dispatch=useTwinStore(s=>s.dispatch),quality=useTwinStore(s=>s.quality),roomReady=useTwinStore(s=>s.roomReady),reduced=useUIStore(s=>s.reduced);
  const [debug,setDebug]=useState(false),[mounted,setMounted]=useState(false),[lost,setLost]=useState(false),[version,setVersion]=useState(0),[visible,setVisible]=useState(true);
  const sessionId=useRef(createTwinId('session')),root=useRef<HTMLDivElement>(null),reveal=useRef<HTMLDivElement>(null),listenerCleanup=useRef<()=>void>(),activeCanvas=useRef<HTMLCanvasElement|null>(null),activeCanvasId=useRef<string>(),activeRendererId=useRef<string>(),sessionActive=useRef(false),lostAt=useRef<string>(),restoredAt=useRef<string>();
 const [ambientPaused,setAmbientPaused]=useState(false),[pageVisible,setPageVisible]=useState(true);
 const runtime=useSceneRuntime(mounted&&visible&&pageVisible&&quality!=='static','城市与生活空间');
 const beforeLoss=useRef(experience);
 useEffect(()=>{const update=()=>setPageVisible(!document.hidden);update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 useEffect(()=>{if(runtime.ready&&useTwinStore.getState().experience.state==='loading')dispatch({type:'READY'});},[runtime.ready,dispatch]);
 const [surface,setSurface]=useState(''),savedPose=useRef<CameraSnapshot|null>(null);
 const stable=needsStableDrawingBuffer(),renderDpr=ambientPaused?.6:quality==='low'?.8:1;
 useEffect(()=>{const node=root.current;if(!node)return;let timer:ReturnType<typeof setTimeout>|undefined;const observer=new ResizeObserver(([entry])=>{if(!stable){setSurface('native');return;}const next=`${Math.floor(entry.contentRect.width)}:${Math.floor(entry.contentRect.height)}`;clearTimeout(timer);timer=setTimeout(()=>setSurface(next),120);});observer.observe(node);return()=>{clearTimeout(timer);observer.disconnect();};},[stable]);
 const controls=useControls('RENDER / 画质',{Bloom:{value:.65,min:0,max:1.5,step:.05},Lighting:{value:1,min:.4,max:2,step:.1},Particles:{value:64,min:0,max:128,step:16}});
 useEffect(()=>{useTwinStore.setState({particles:controls.Particles});},[controls.Particles]);
  const fallback=useCallback(()=>{if(!sessionActive.current)return;recordTwinDiagnostic({kind:'stale-event-ignored',sessionId:sessionId.current,businessState:useTwinStore.getState().experience.state,renderState:useTwinStore.getState().quality,detail:'fallback callback from inactive session'});useTwinStore.setState({quality:'static',renderFault:true});dispatch({type:'FAIL'});notifyToast('已切换轻量视图；电器核算、滑块与 AI 继续可用。');},[dispatch]);
  useEffect(()=>{
    const activeSessionId=sessionId.current;
    sessionActive.current=true;
    const initial=useTwinStore.getState();
    recordTwinDiagnostic({kind:'session-mount',sessionId:activeSessionId,businessState:initial.experience.state,renderState:initial.quality});
    setMounted(true);
    if(!preview)useTwinStore.setState(s=>s.renderFault?{}:{cityShot:'overview',experience:{state:'loading',building:0,selected:null,revision:0,view:'orbit'},renderFault:false});
    // Compact screens still get the actual spatial model. Start with a smaller
    // GPU budget; only renderer failure or measured sustained slowness may
    // replace it with the explicit recovery view.
    const low=window.matchMedia('(max-width: 640px)').matches||(navigator.hardwareConcurrency??8)<4;
    if(low&&!useTwinStore.getState().renderFault)useTwinStore.setState({quality:'low',particles:32});
    const ob=new IntersectionObserver(([e])=>setVisible(e.isIntersecting),{rootMargin:'150px'});if(root.current)ob.observe(root.current);
    return()=>{sessionActive.current=false;listenerCleanup.current?.();listenerCleanup.current=undefined;activeCanvas.current=null;recordTwinDiagnostic({kind:'session-unmount',sessionId:activeSessionId,businessState:useTwinStore.getState().experience.state,renderState:useTwinStore.getState().quality});ob.disconnect();};
  },[fallback,preview]);
 useEffect(()=>{if(experience.state!=='reveal')return;const t=gsap.to(reveal.current,{opacity:0,duration:reduced?.01:1.1,onComplete:()=>dispatch({type:'REVEALED'})});return()=>{t.kill();};},[dispatch,experience.state,reduced]);
  useEffect(()=>{
    // Returning through CityTour clears the shared fault; recreate this local Canvas
    // only after the user has explicitly chosen to leave the fallback view.
    if(lost&&!renderFault&&experience.state==='orbit'){
      savedPose.current={...ORBIT_POSE,fov:50};
      lostAt.current=undefined;restoredAt.current=undefined;setLost(false);setVersion(v=>v+1);
      recordTwinDiagnostic({kind:'camera-transition-cancel',sessionId:sessionId.current,businessState:'orbit',renderState:useTwinStore.getState().quality,detail:'fallback-exit'});
    }
  },[experience.state,lost,renderFault]);
  useEffect(()=>{if(runtime.error)fallback();},[runtime.error,fallback]);
  const retry=()=>{runtime.retry();savedPose.current=null;setLost(false);setVersion(v=>v+1);useTwinStore.setState(s=>({cityShot:'overview',quality:'balanced',renderFault:false,roomReady:false,experience:{...s.experience,state:'loading',selected:null,view:'orbit',revision:s.experience.revision+1}}));recordTwinDiagnostic({kind:'camera-transition-cancel',sessionId:sessionId.current,canvasId:activeCanvasId.current,rendererId:activeRendererId.current,businessState:'loading',renderState:'balanced',detail:'user-retry'});};
 const poster=<div className="twin-poster"><div className="poster-skyline"/><span>CARBONTWIN / LOCAL FIRST</span><h3>同一座城市。<br/><i>更轻的呈现。</i></h3><p>当前使用静态空间视图。<br/>房间参数、图表和 AI 均可继续操作。</p>{runtime.error&&<p className="stage-error-reason">{runtime.error}</p>}<button className="primary-button" onClick={retry}>尝试恢复 3D ↗</button></div>;
  return <div className={`twin-canvas ${preview?'is-preview':''}`} ref={root} data-experience={lost||renderFault?'fallback':experience.state} data-quality={lost?'static':quality} data-load-state={runtime.phase} data-ready={runtime.ready} data-view={experience.view} data-space={spaceForBuilding(experience.building)} data-room-ready={roomReady} data-context={lost?'lost':'active'} data-twin-session={sessionId.current} data-canvas-id={activeCanvasId.current??''} data-renderer-id={activeRendererId.current??''} data-context-lost-at={lostAt.current??''} data-context-restored-at={restoredAt.current??''} data-render-state={lost||renderFault?'fallback':quality}>
  {mounted&&quality!=='static'?<TwinBoundary key={`${version}:${runtime.generation}`} onFail={runtime.fail} fallback={poster}><SceneResources.Provider value={runtime.scope}>
    {(!stable||surface)&&<Canvas key={stable?`${surface}:${renderDpr}`:'native'} shadows={quality==='low'?false:'percentage'} camera={{position:savedPose.current?.position??[52,42,65],fov:savedPose.current?.fov??50,near:.1,far:340}} dpr={stable?renderDpr:ambientPaused?.6:quality==='high'?[1,1.35]:quality==='low'?.8:1} frameloop={!visible||!pageVisible||lost?'never':ambientPaused?'demand':'always'} gl={stable?canvas=>createStableRenderer(canvas,renderDpr,{antialias:false,alpha:false}):{antialias:false,powerPreference:'high-performance',alpha:false}} onPointerMissed={()=>{if(!preview)dispatch({type:'CLEAR'});}} onCreated={({gl})=>{
      runtime.onCreated();gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=.95;listenerCleanup.current?.();
      const canvas=gl.domElement,canvasId=createTwinId('canvas'),rendererId=createTwinId('renderer');
      activeCanvas.current=canvas;activeCanvasId.current=canvasId;activeRendererId.current=rendererId;
      if(root.current){root.current.dataset.canvasId=canvasId;root.current.dataset.rendererId=rendererId;root.current.dataset.twinSession=sessionId.current;}
      recordTwinDiagnostic({kind:'canvas-created',sessionId:sessionId.current,canvasId,rendererId,businessState:useTwinStore.getState().experience.state,renderState:useTwinStore.getState().quality});
      const isCurrent=()=>sessionActive.current&&activeCanvas.current===canvas&&activeCanvasId.current===canvasId;
      const stale=(detail:string)=>recordTwinDiagnostic({kind:'stale-event-ignored',sessionId:sessionId.current,canvasId,rendererId,businessState:useTwinStore.getState().experience.state,renderState:useTwinStore.getState().quality,detail});
      const lose=(e:Event)=>{
        if(!isCurrent()){stale('context lost from old Canvas');return;}e.preventDefault();beforeLoss.current=useTwinStore.getState().experience;
        lostAt.current=new Date().toISOString();setLost(true);runtime.onLost();
        useTwinStore.setState(s=>({experience:{...s.experience,state:'fallback',selected:null,revision:s.experience.revision+1},renderFault:true,roomReady:false}));
        notifyToast('图形连接暂停，正在等待恢复；下方核算继续可用。');
      };
      const restore=()=>{
        if(!isCurrent()){stale('context restored from old Canvas');return;}
        restoredAt.current=new Date().toISOString();setLost(false);runtime.onRestored();
        const previous=beforeLoss.current;
        useTwinStore.setState(s=>({renderFault:false,experience:{...previous,state:previous.state==='loading'?'loading':previous.state==='fallback'?'orbit':previous.state,revision:s.experience.revision+1}}));
      };
      canvas.addEventListener('webglcontextlost',lose);canvas.addEventListener('webglcontextrestored',restore);
      listenerCleanup.current=()=>{canvas.removeEventListener('webglcontextlost',lose);canvas.removeEventListener('webglcontextrestored',restore);recordTwinDiagnostic({kind:'canvas-cleanup',sessionId:sessionId.current,canvasId,rendererId,businessState:useTwinStore.getState().experience.state,renderState:useTwinStore.getState().quality});if(activeCanvas.current===canvas){activeCanvas.current=null;activeCanvasId.current=undefined;activeRendererId.current=undefined;}};
    }}><Suspense fallback={null}><World preview={preview} rotationMode={rotationMode} bloom={ambientPaused?0:controls.Bloom} lighting={controls.Lighting} contextActive={!lost} ambientPaused={ambientPaused||reduced}/><TwinCamera sessionId={sessionId.current} savedPose={savedPose}/><SceneFrameReady scope={runtime.scope} onReady={runtime.onRendered}/></Suspense><Runtime onSlow={()=>{setAmbientPaused(true);useTwinStore.setState({quality:'low',particles:24});}} visible={visible&&!ambientPaused}/></Canvas>}
   {lost&&poster}
  </SceneResources.Provider></TwinBoundary>:poster}
  {quality!=='static'&&['loading','reveal'].includes(experience.state)&&<div ref={reveal} className="twin-loading-cover"><Loading/></div>}
  <div className="twin-quality"><button onClick={()=>setDebug(v=>!v)} aria-expanded={debug}>◈ 画质</button>{!preview&&<><button aria-pressed={quality==='high'} onClick={()=>useTwinStore.setState({quality:quality==='high'?'balanced':'high'})}>{quality==='high'?'电影':'均衡'}</button><button onClick={fallback}>轻量</button></>}</div>
  {debug&&<div className="twin-leva"><Leva fill flat titleBar={{title:'场景调光'}} collapsed={false}/><small>粒子预算 {controls.Particles} · 当前空间优先使用真实模型</small></div>}
  {!debug&&<Leva hidden/>}
  {ambientPaused&&!renderFault&&<div className="stage-performance-note"><span>已降低画质并暂停环境动态，三维导航和设备操作可用。</span><button onClick={()=>setAmbientPaused(false)}>继续环境动态</button></div>}
 </div>;
}
