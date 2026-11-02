'use client';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Environment,Html,useProgress} from '@react-three/drei';
import {Bloom,DepthOfField,EffectComposer,Noise,SSAO,Vignette} from '@react-three/postprocessing';
import {Suspense,lazy,Component,useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {Leva,useControls} from 'leva';
import * as THREE from 'three';
import gsap from 'gsap';
import {CityBuildings,PhotographicFacade,StreetFurniture,MODEL_BASE} from './TwinAssets';
import CityLife from './CityLife';
import SpatialAudio from './SpatialAudio';
const CarbonSculpture=lazy(()=>import('./CarbonSculpture'));
const RoomScene=lazy(()=>import('./RoomScene'));
const OfficeScene=lazy(()=>import('./OfficeScene'));
const CafeScene=lazy(()=>import('./CafeScene'));
import {spaceForBuilding} from '@/lib/experience/spaces';
import TwinCamera from './TwinCamera';
import {useTwinStore} from '@/lib/experience/store';
import {buildingPosition} from '@/lib/experience/CameraDirector';
import {useUIStore} from '@/lib/stores/UIStore';
import {performanceTier} from '@/lib/experience/performance';
import {notifyToast} from '../Toast';

class TwinBoundary extends Component<{children:ReactNode;onFail:()=>void;fallback:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onFail();}render(){return this.state.failed?this.props.fallback:this.props.children;}}
function CaptureFrame(){
 const {gl,scene,camera}=useThree();
 useEffect(()=>{const capture=(event:Event)=>{const done=(event as CustomEvent<{done:(data:string)=>void}>).detail.done;try{if(gl.getContext().isContextLost()){done('');return;}gl.render(scene,camera);done(gl.domElement.toDataURL('image/png'));}catch{done('');}};window.addEventListener('twin-capture',capture);return()=>window.removeEventListener('twin-capture',capture);},[gl,scene,camera]);return null;
}
function AssetReady(){const dispatch=useTwinStore(s=>s.dispatch);useEffect(()=>{dispatch({type:'READY'});},[dispatch]);return null;}
function RoomLoading(){const {progress}=useProgress();return <Html center><div className="holo-meter" role="status"><small>ENTERING / YOUR EVERYDAY SPACE</small><b>{Math.round(progress)}%</b><span>正在载入家具与室内材质…</span></div></Html>;}
function Loading(){const {progress,active}=useProgress();return <div className="twin-loading" role="status"><span className="twin-loading-symbol">◌</span><small>[ SYSTEM / MATERIALIZING THE INVISIBLE ]</small><b>{active?Math.round(progress):0}<em>%</em></b><div className="twin-load-track"><i style={{width:`${progress}%`}}/></div><span>正在载入真实模型、物理材质与环境光</span></div>;}
function Runtime({onSlow,visible}:{onSlow:()=>void;visible:boolean}){
 const {gl}=useThree(),active=useProgress(s=>s.active),state=useTwinStore(s=>s.experience.state),sample=useRef({seconds:0,frames:0,slow:0,warmup:0,resume:2});
 useEffect(()=>{sample.current={seconds:0,frames:0,slow:0,warmup:0,resume:2};},[state,active,visible]);
 useFrame((_,dt)=>{const s=sample.current;
  // A resumed offscreen canvas has a long clock delta, not a slow GPU frame.
  if(!visible||document.hidden||active){s.seconds=0;s.frames=0;s.slow=0;s.warmup=0;s.resume=2;return;}
  if(s.resume>0){s.resume--;return;}
  if(!['orbit','focused','room','inspecting','layout','viewing'].includes(state))return;s.warmup+=dt;if(s.warmup<8)return;s.seconds+=dt;s.frames++;if(s.seconds<3)return;const fps=s.frames/s.seconds,q=useTwinStore.getState().quality;gl.domElement.dataset.fps=fps.toFixed(1);const next=performanceTier(fps,q);s.slow=next!==q?s.slow+1:0;if(s.slow>=3){s.slow=0;if(next==='static')onSlow();else{useTwinStore.setState({quality:next,particles:32});notifyToast('持续低于 50 FPS，已关闭景深与环境遮蔽并降低粒子预算。');}}s.seconds=0;s.frames=0;});
 useEffect(()=>()=>{gl.renderLists.dispose();},[gl]);
 return null;
}
function World({rotationMode,preview,bloom,lighting,contextActive}:{rotationMode:boolean;preview:boolean;bloom:number;lighting:number;contextActive:boolean}){
 const sculpture=useTwinStore(s=>s.sculpture),experience=useTwinStore(s=>s.experience),quality=useTwinStore(s=>s.quality),[x,,z]=buildingPosition(experience.building),space=spaceForBuilding(experience.building),inside=['entering','viewing','room','inspecting','layout','scrolling'].includes(experience.state);
 return <>
  <color attach="background" args={['#101b25']}/><fogExp2 attach="fog" args={['#162630',inside?.003:.007]}/>
  <Environment files={`${MODEL_BASE}${inside?'interior':'night'}.hdr`} environmentIntensity={inside?.65:1.3} environmentRotation={[0,1.2,0]}/>
  <ambientLight intensity={inside?.03:.8*lighting} color="#b5d2e5"/>
  <directionalLight position={[18,45,24]} intensity={inside?.1:3.2*lighting} color="#a5c7e0"/>
  <directionalLight position={[-36,15,-30]} intensity={inside?.05:2.2*lighting} color="#dcb18c"/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.08,-35]} receiveShadow><planeGeometry args={[260,260]}/><meshStandardMaterial color="#192831" roughness={.44} metalness={.35}/></mesh>
  {!inside&&[-6,7].map(x=><mesh key={x} position={[x,-.04,-38]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.06,160]}/><meshStandardMaterial color="#c4c1aa" emissive="#a6ac8c" emissiveIntensity={.25}/></mesh>)}
  {(!inside||experience.state==='entering'||experience.state==='scrolling')&&<><CityBuildings preview={preview}/><PhotographicFacade/><StreetFurniture/><CityLife/></>}
  {!preview&&inside&&<group position={[x,5,z]}><Suspense fallback={<RoomLoading/>}>{space==='office'?<OfficeScene/>:space==='cafe'?<CafeScene/>:<RoomScene rotationMode={rotationMode}/>} </Suspense>{sculpture&&<Suspense fallback={null}><CarbonSculpture/></Suspense>}</group>}
  <AssetReady/><CaptureFrame/>{inside&&<SpatialAudio/>}
  {contextActive&&quality!=='static'&&quality!=='low'&&bloom>0&&<EffectComposer enableNormalPass={quality==='high'} multisampling={0}>
    <Bloom luminanceThreshold={.8} mipmapBlur intensity={bloom}/>
    {quality==='high'?<SSAO samples={8} rings={3} radius={.15} intensity={8} worldDistanceThreshold={20} worldDistanceFalloff={5} worldProximityThreshold={.3} worldProximityFalloff={.1}/>:<Vignette darkness={.18} offset={.25}/>}
    {quality==='high'?<DepthOfField target={inside?[x-1,6,z-1]:[0,6,0]} focalLength={.035} bokehScale={1.2} height={360}/>:<Noise opacity={.007}/>}
  </EffectComposer>}
 </>;
}
export default function TwinViewport({preview=false,rotationMode=false}:{preview?:boolean;rotationMode?:boolean}){
 const experience=useTwinStore(s=>s.experience),dispatch=useTwinStore(s=>s.dispatch),quality=useTwinStore(s=>s.quality),roomReady=useTwinStore(s=>s.roomReady),reduced=useUIStore(s=>s.reduced);
 const [debug,setDebug]=useState(false),[mounted,setMounted]=useState(false),[lost,setLost]=useState(false),[version,setVersion]=useState(0),[visible,setVisible]=useState(true);
 const root=useRef<HTMLDivElement>(null),reveal=useRef<HTMLDivElement>(null),listenerCleanup=useRef<()=>void>();
 const controls=useControls('RENDER / 画质',{Bloom:{value:.65,min:0,max:1.5,step:.05},Lighting:{value:1,min:.4,max:2,step:.1},Particles:{value:64,min:0,max:128,step:16}});
 useEffect(()=>{useTwinStore.setState({particles:controls.Particles});},[controls.Particles]);
 const fallback=useCallback(()=>{useTwinStore.setState({quality:'static'});dispatch({type:'FAIL'});notifyToast('已切换轻量视图；电器核算、滑块与 AI 继续可用。');},[dispatch]);
 useEffect(()=>{setMounted(true);if(!preview)useTwinStore.setState({experience:{state:'loading',building:0,selected:null,revision:0,view:'orbit'}});const low=window.matchMedia('(max-width: 640px)').matches||(navigator.hardwareConcurrency??8)<4;if(low)fallback();const ob=new IntersectionObserver(([e])=>setVisible(e.isIntersecting),{rootMargin:'150px'});if(root.current)ob.observe(root.current);return()=>{ob.disconnect();listenerCleanup.current?.();};},[fallback,preview]);
 useEffect(()=>{if(experience.state!=='reveal')return;const t=gsap.to(reveal.current,{opacity:0,duration:reduced?.01:1.1,onComplete:()=>dispatch({type:'REVEALED'})});return()=>{t.kill();};},[dispatch,experience.state,reduced]);
 const retry=()=>{setLost(false);setVersion(v=>v+1);useTwinStore.setState(s=>({quality:'balanced',roomReady:false,experience:{...s.experience,state:'loading',selected:null,view:'orbit',revision:s.experience.revision+1}}));};
 const poster=<div className="twin-poster"><div className="poster-skyline"/><span>CARBONTWIN / LOCAL FIRST</span><h3>同一座城市。<br/><i>更轻的呈现。</i></h3><p>当前使用静态空间视图。<br/>房间参数、图表和 AI 均可继续操作。</p><button className="primary-button" onClick={retry}>尝试恢复 3D ↗</button></div>;
 return <div className={`twin-canvas ${preview?'is-preview':''}`} ref={root} data-experience={experience.state} data-quality={quality} data-view={experience.view} data-space={spaceForBuilding(experience.building)} data-room-ready={roomReady} data-context={lost?'lost':'active'}>
  {mounted&&quality!=='static'?<TwinBoundary key={version} onFail={fallback} fallback={poster}>
   <Canvas shadows={quality==='low'?false:'percentage'} camera={{position:[52,42,65],fov:50,near:.1,far:340}} dpr={quality==='high'?[1,1.35]:1} frameloop={visible&&!lost?'always':'never'} gl={{antialias:false,powerPreference:'high-performance',alpha:false}} onPointerMissed={()=>{if(!preview)dispatch({type:'CLEAR'});}} onCreated={({gl})=>{
     gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.15;listenerCleanup.current?.();const canvas=gl.domElement;
     const lose=(e:Event)=>{e.preventDefault();setLost(true);notifyToast('显卡连接暂停，已保留全部本地数据，可继续使用下方核算。');};
     const restore=()=>{retry();};canvas.addEventListener('webglcontextlost',lose);canvas.addEventListener('webglcontextrestored',restore);listenerCleanup.current=()=>{canvas.removeEventListener('webglcontextlost',lose);canvas.removeEventListener('webglcontextrestored',restore);};
   }}><Suspense fallback={null}><World preview={preview} rotationMode={rotationMode} bloom={controls.Bloom} lighting={controls.Lighting} contextActive={!lost}/><TwinCamera/></Suspense><Runtime onSlow={fallback} visible={visible}/></Canvas>
   {lost&&poster}
  </TwinBoundary>:poster}
  {quality!=='static'&&['loading','reveal'].includes(experience.state)&&<div ref={reveal} className="twin-loading-cover"><Loading/></div>}
  <div className="twin-quality"><button onClick={()=>setDebug(v=>!v)} aria-expanded={debug}>◈ 画质</button>{!preview&&<><button aria-pressed={quality==='high'} onClick={()=>useTwinStore.setState({quality:quality==='high'?'balanced':'high'})}>{quality==='high'?'电影':'均衡'}</button><button onClick={fallback}>轻量</button></>}</div>
  {debug&&<div className="twin-leva"><Leva fill flat titleBar={{title:'场景调光'}} collapsed={false}/><small>粒子预算 {controls.Particles} · 当前空间优先使用真实模型</small></div>}
  {!debug&&<Leva hidden/>}
  <div className="twin-coordinate"><span>22°32′N / 114°03′E · DESIGN STUDY</span><span>外部授权模型 · 非深圳实测孪生</span></div>
 </div>;
}
