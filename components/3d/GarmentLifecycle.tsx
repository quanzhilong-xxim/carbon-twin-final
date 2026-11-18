'use client';
import { useGLTF } from '@/lib/three/scene-assets';
import { Suspense,useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import SceneStage, { type SceneMode } from './SceneStage';
import { GARMENT_RESEARCH } from '@/lib/world/garment-research';
import { useUIStore } from '@/lib/stores/UIStore';
import FabricStructure, { fabricStudies, type FabricStudy } from './FabricStructure';
import TextileDiagram from './TextileDiagram';
const GARMENT_URL='/models/clothing/tshirt.glb';

/** A lit study table gives the object a spatial reference without adding a
 * downloaded environment or treating the illustrative fabric as measured data. */
function MaterialStudyRoom(){
 return <>
   <color attach="background" args={['#12251d']}/>
   <ambientLight intensity={1.15}/>
   <hemisphereLight args={['#f5efd9','#263b2e',1.25]}/>
   <directionalLight position={[3.5,6,5]} intensity={2.5} color="#fff1d7"/>
   <directionalLight position={[-3,3,-3]} intensity={1.4} color="#b9d8bd"/>
   <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.8,0]}><planeGeometry args={[24,24]}/><meshStandardMaterial color="#14271f" roughness={.94}/></mesh>
   <mesh position={[0,-.74,0]}><cylinderGeometry args={[2.15,2.25,.12,64]}/><meshStandardMaterial color="#324538" roughness={.76} metalness={.12}/></mesh>
   <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.672,0]}><ringGeometry args={[1.98,1.995,64]}/><meshBasicMaterial color="#b3b48a" transparent opacity={.65}/></mesh>
 </>;
}
function Garment({layers,angle,selected,fabric,spinning,onReady}:{layers:boolean;angle:number;selected:number;fabric:FabricStudy;spinning:boolean;onReady:()=>void}){
 const {scene}=useGLTF(GARMENT_URL,'/models/draco/'),reduced=useUIStore(s=>s.reduced),targetScale=useMemo(()=>new THREE.Vector3(),[]),root=useRef<THREE.Group>(null),rendered=useRef(false),{camera,invalidate,gl}=useThree();
 const model=useMemo(()=>{
   const copy=scene.clone(true);
   const cloneMaterial=(source:THREE.Material)=>{
     const material=source.clone();
     if(material instanceof THREE.MeshStandardMaterial){
       // These are material study colours. Retain the licensed source's weave
       // and normal detail without its pink dye tinting every chosen preset.
       material.onBeforeCompile=shader=>{
         const neutralMap=THREE.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;', 'sampledDiffuseColor.rgb = vec3(dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))); diffuseColor *= sampledDiffuseColor;');
         shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',neutralMap);
       };
       material.customProgramCacheKey=()=> 'ct-garment-neutral-study-v11';
     }
     return material;
   };
   copy.traverse(n=>{if(n instanceof THREE.Mesh){n.geometry=n.geometry.clone();n.material=Array.isArray(n.material)?n.material.map(cloneMaterial):cloneMaterial(n.material);}});
   copy.rotation.y=Math.PI/2;copy.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(copy),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),s=2.7/Math.max(size.x,size.y);
   copy.scale.setScalar(s);copy.position.set(-center.x*s,.8-center.y*s,-center.z*s);
   return copy;
 },[scene]);
 useEffect(()=>{rendered.current=false;gl.domElement.dataset.garmentReady='false';invalidate();},[model,gl,invalidate]);
 useEffect(()=>()=>{model.traverse(node=>{if(node instanceof THREE.Mesh){node.geometry.dispose();(Array.isArray(node.material)?node.material:[node.material]).forEach(material=>material.dispose());}});},[model]);
 useEffect(()=>{model.traverse(n=>{if(n instanceof THREE.Mesh)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{if(m instanceof THREE.MeshStandardMaterial){m.color.set(fabricStudies[fabric].color);m.roughness=fabricStudies[fabric].roughness;}});});invalidate();},[model,fabric,invalidate]);
 useEffect(()=>{
   // Change the camera only: rotating the garment by the same angle would
   // cancel the requested view in camera space.
   const distance=layers?8.2:6.5;
   const presets:[number,number,number][]= [[layers?.35:0,1.2,distance],[distance,1.2,0],[layers?.35:0,1.2,-distance],[1.35,1.1,3.6]];
   const [x,y,z]=presets[angle]??presets[0];
   // The fabric-only close view has no clipped garment at its edge.
   camera.position.set(x,y,z);camera.lookAt(angle===3?1.35:layers?.35:0,.65,0);
   if(root.current){root.current.rotation.y=0;root.current.visible=angle!==3;}
   invalidate();
 },[angle,layers,camera,invalidate]);
 useEffect(()=>invalidate(),[selected,spinning,invalidate]);
 useFrame((_,dt)=>{if(!rendered.current){if(gl.info.render.triangles>0){rendered.current=true;gl.domElement.dataset.garmentReady='true';onReady();}else invalidate();}const speed=reduced?1:1-Math.exp(-8*Math.min(dt,.1));if(root.current){const x=layers?-.9:0;const scale=layers?.72:1;root.current.position.x+=(x-root.current.position.x)*speed;root.current.scale.lerp(targetScale.setScalar(scale),speed);if(spinning&&!reduced)root.current.rotation.y+=Math.min(dt,.05)*.26;if(Math.abs(root.current.position.x-x)>.0005||Math.abs(root.current.scale.x-scale)>.0005||spinning&&!reduced)invalidate();}Object.assign(gl.domElement.dataset,{lifecycleStage:String(selected),materialLayers:String(layers),garmentAngle:String(angle),fabricStudy:fabric,garmentSpinning:String(spinning&&!reduced),garmentDrawCalls:String(gl.info.render.calls),garmentTriangles:String(gl.info.render.triangles)});});
 return <><MaterialStudyRoom/><group ref={root}><primitive object={model}/></group>{layers&&<FabricStructure kind={fabric}/>}<OrbitControls enablePan={false} minDistance={2.5} maxDistance={10} minPolarAngle={.3} maxPolarAngle={Math.PI/2+.12} target={[angle===3?1.35:layers?.35:0,.65,0]}/></>;
}
export default function GarmentLifecycle({onExplore}:{onExplore?:()=>void}){
 const [layers,setLayers]=useState(false),[selected,setSelected]=useState(0),[angle,setAngle]=useState(0),[details,setDetails]=useState(false),[fabric,setFabric]=useState<FabricStudy>('cotton'),[spinning,setSpinning]=useState(false);
 const [view,setView]=useState<'model'|'structure'>('model'),[mode,setMode]=useState<SceneMode>('offscreen'),[ready,setReady]=useState(false),[timedOut,setTimedOut]=useState(false),[attempt,setAttempt]=useState(0);
 const reduced=useUIStore(s=>s.reduced);
 const research=GARMENT_RESEARCH[fabric], stages=research.stages;
 const modelReady=useCallback(()=>setReady(true),[]);
 useEffect(()=>{
   if(view!=='model'||!['initializing','loading','rendering','recovering','3d'].includes(mode)||ready||timedOut)return;
   let elapsed=0,last=performance.now();
   const timer=window.setInterval(()=>{const now=performance.now();if(!document.hidden)elapsed+=now-last;last=now;if(elapsed>=15000)setTimedOut(true);},250);
   return()=>window.clearInterval(timer);
 },[view,mode,ready,timedOut,attempt]);
 const choose=(i:number)=>{setSelected(i);onExplore?.();};
 const retry=()=>{useGLTF.clear(GARMENT_URL);setReady(false);setTimedOut(false);setMode('offscreen');setView('model');setSpinning(false);setAttempt(v=>v+1);};
 const showingStructure=view==='structure'||timedOut;
 const status=timedOut?'三维载入超过 15 秒，已切换结构观察。':view==='structure'?'结构观察模式：无需下载三维模型。':mode==='3d'?(ready?'三维成衣已就绪 · 拖动旋转，滚轮缩放。':'正在载入三维成衣，也可以先切换结构观察。'):mode==='error-fallback'?'三维加载失败，结构观察与阶段追溯继续可用。':mode==='context-lost'?'三维连接暂停，结构观察继续可用。':mode==='offscreen'?'展区进入视野后载入三维；结构观察随时可用。':'正在加载三维模型与材质；也可先进入结构观察。';
 return <section id="garment-study" className="garment-lifecycle" aria-label="九阶段服装生命周期" data-research-material={fabric}>
   <header className="garment-study-heading"><div><span className="section-kicker">TRACE THE THREAD / MATERIAL TO MEMORY</span><h2>一件衣服。<br/><i>九段有据可循的旅程。</i></h2><p>从成衣到纤维，再到材料背后的能源与工艺。选择一种结构、一个阶段，留下值得继续追问的问题。</p></div><aside className="garment-study-question"><span className="section-kicker">THE LIFE WE GIVE AN OBJECT</span><p>一件衣服陪伴你的时间，<br/><i>也是它生命周期的一部分。</i></p><small>观察成衣 → 走近纤维 → 追溯每一步</small></aside></header>
   <div className="garment-research-grid">
     <div className="garment-exhibit">
       <div className="garment-view-tabs" role="group" aria-label="服装展区显示方式"><button aria-pressed={view==='model'&&!timedOut} onClick={()=>{setView('model');if(timedOut){setTimedOut(false);setReady(false);setAttempt(v=>v+1);}}}>三维成衣</button><button aria-pressed={showingStructure} onClick={()=>{setView('structure');onExplore?.();}}>结构观察</button></div>
       <div className="garment-view-status" role="status">{status}</div>
       {(timedOut||mode==='error-fallback'||mode==='context-lost')&&<div className="garment-load-recovery"><button onClick={retry}>重新载入三维成衣</button><span>重新请求模型，保留已选材料与生命周期阶段。</span></div>}
       {showingStructure?<div className="garment-structure-view"><TextileDiagram fabric={fabric}/></div>:<SceneStage key={attempt} paused={!spinning} pauseWhenHidden sceneLights={false} label="可旋转的真实 T 恤网格与材料分层示意" onModeChange={setMode} fallback={<TextileDiagram fabric={fabric}/>}><Suspense fallback={<Html center><p className="world-hotspot">载入服装网格…<br/>可先选择「结构观察」</p></Html>}><Garment layers={layers} angle={angle} selected={selected} fabric={fabric} spinning={spinning} onReady={modelReady}/></Suspense></SceneStage>}
       {!showingStructure&&<div className="lifecycle-tools garment-camera-tools"><button disabled={mode!=='3d'||!ready} onClick={()=>{setLayers(v=>!v);onExplore?.();}} aria-pressed={layers}>{layers?'合拢材料示意':'展开材料分层'}</button>{['正面','侧面','背面'].map((label,i)=><button disabled={mode!=='3d'||!ready} key={label} onClick={()=>setAngle(i)} aria-pressed={angle===i}>{label}</button>)}<button aria-pressed={spinning&&!reduced} disabled={reduced||mode!=='3d'||!ready} onClick={()=>setSpinning(v=>!v)}>{spinning?'暂停转动':'自动转动'}</button><button disabled={mode!=='3d'||!ready} onClick={()=>{setLayers(true);setAngle(3);onExplore?.();}}>放大织纹</button></div>}
       <p className="method-note">成衣网格与材料研究预设分别展示。织纹、纱线与纤维为本站原创放大示意，不代表该模型的实测成分、尺寸或排放。</p>
       <a href="https://sketchfab.com/3d-models/7018d8578d6b4ee7af010d26eda1ecc9" target="_blank" rel="noreferrer">模型：Nayeem / Sketchfab · CC BY 4.0 ↗</a>
     </div>
     <aside className="garment-research-notes" aria-label="材料与生命周期研究">
       <span className="section-kicker">MATERIAL FIELD NOTES</span><h3>从哪一种纤维开始？</h3>
       <div className="fabric-studies" role="group" aria-label="织物结构观察预设">{(Object.keys(fabricStudies) as FabricStudy[]).map(key=><button key={key} aria-pressed={fabric===key} onClick={()=>{setFabric(key);setLayers(true);onExplore?.();}}>{fabricStudies[key].name}</button>)}</div>
       <p className="fabric-study-note" aria-live="polite">{fabricStudies[fabric].note}</p><p className="fabric-research-assumption"><strong>{research.materialLabel}</strong><br/>{research.assumption}</p>
       <div className="lifecycle-path" role="group" aria-label="服装生命周期阶段">{stages.map((part,i)=><button key={part.name} aria-pressed={selected===i} onClick={()=>choose(i)}><small>{String(i+1).padStart(2,'0')}</small>{part.name}</button>)}</div>
       <article className="lifecycle-note" aria-live="polite"><span className="section-kicker">{selected+1} / 9 · EVIDENCE BEFORE NUMBERS</span><h3>{stages[selected].name}</h3><p>{stages[selected].note}</p><button aria-expanded={details} onClick={()=>setDetails(v=>!v)}>{details?'收起':'展开'}核算所需数据</button>{details&&<p className="lifecycle-data-needs">还需要：{stages[selected].need}。未提供这些数据，因此不给出该商品的真实排放值或阶段百分比。</p>}<a href={stages[selected].sourceUrl} target="_blank" rel="noreferrer">{stages[selected].sourceLabel} ↗</a><div className="lifecycle-tools"><button onClick={()=>choose(Math.max(0,selected-1))} disabled={selected===0}>上一阶段</button><button onClick={()=>choose(Math.min(8,selected+1))} disabled={selected===8}>下一阶段</button></div></article>
     </aside>
   </div>
 </section>;
}
