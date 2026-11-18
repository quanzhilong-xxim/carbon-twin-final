'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import Link from 'next/link';
import {Component,Suspense,useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Canvas,useFrame,useLoader,useThree} from '@react-three/fiber';

import * as THREE from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {createStableRenderer,needsStableDrawingBuffer} from '@/lib/citylight/stable-renderer';

const ROOT='/models/citylight/v14-lab/';
const TIMES={morning:{name:'晨光',sun:[-12,6,9],power:2.6,night:0,exposure:1.05,background:'#aebdc7'},day:{name:'白天',sun:[-5,16,10],power:3.4,night:0,exposure:1,background:'#b9cdd9'},sunset:{name:'夕阳',sun:[-12,3.7,10],power:3.0,night:.15,exposure:1,background:'#bfb3a0'},blue:{name:'蓝调',sun:[-12,-2,8],power:.08,night:.65,exposure:1.1,background:'#334859'},night:{name:'夜景',sun:[-12,-6,8],power:0,night:1,exposure:1.1,background:'#101d2d'}} as const;
type Time=keyof typeof TIMES;type Method='hdr'|'local'|'opaque';type View='front'|'rear'|'left'|'right'|'top'|'eye'|'detail';
const VIEWS:Record<View,{name:string;position:[number,number,number];target:[number,number,number]}>={front:{name:'正45°',position:[12,6.9,14.5],target:[0,3.5,0]},rear:{name:'背45°',position:[-12,7,-14],target:[0,3.5,0]},left:{name:'左侧',position:[-15,5.5,2],target:[0,3.5,0]},right:{name:'右侧',position:[15,5.5,2],target:[0,3.5,0]},top:{name:'顶视',position:[4,17,8],target:[0,2.8,0]},eye:{name:'人眼1.6m',position:[2,1.6,10.5],target:[0,1.9,0]},detail:{name:'透窗近景',position:[-.8,2.1,6.6],target:[-1.2,1.4,0]}};
class Boundary extends Component<{children:ReactNode;onError:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}componentDidCatch(){this.props.onError();}render(){return this.state.failed?null:this.props.children;}}
function Specimen({method,time,clear}:{method:Method;time:Time;clear:boolean}){
 const model=useGLTF(ROOT+'facade-specimen.glb');const {scene:world}=useThree();
 const owned=useMemo(()=>{const scene=model.scene.clone(true),materials:THREE.Material[]=[];scene.name='CL-G2-FACADE-14';scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const glass=m.name.endsWith('__glass');m.castShadow=!glass;m.receiveShadow=!glass;const clone=(s:THREE.Material)=>{const c=s.clone();materials.push(c);return c;};m.material=Array.isArray(m.material)?m.material.map(clone):clone(m.material);});return{scene,materials};},[model.scene]);
 useEffect(()=>{for(const material of owned.materials){const m=material as THREE.MeshPhysicalMaterial;
  m.envMapIntensity=.85;
  if(m.name==='glass'){
   m.transmission=method==='opaque'?0:clear?1:.82;m.roughness=clear?.02:.085;m.ior=1.5;m.thickness=.016;m.metalness=method==='opaque'?.28:0;m.color.set(clear?'#ffffff':'#eef5f2');m.side=THREE.FrontSide;
   m.envMapIntensity=.85*(method==='hdr'?1:time==='night'?.12:time==='blue'?.32:.8);
   m.envMap=method==='hdr'?null:(world.userData.localProbe as THREE.Texture)||null;m.needsUpdate=true;
  }
  if(m.name==='light'){m.emissive.set('#ffe1af');m.emissiveIntensity=.3+TIMES[time].night*2;}
 }},[method,time,clear,owned,world]);
 useEffect(()=>()=>{owned.materials.forEach(m=>m.dispose());},[owned]);
 return <primitive object={owned.scene} dispose={null}/>;
}
function Ground({pbr}:{pbr:boolean}){
 const maps=useLoader(THREE.TextureLoader,['diff','rough','nor_gl'].map(n=>ROOT+'resources/concrete_tiles_02_'+n+'_1k.jpg'));
 useMemo(()=>{maps.forEach((m,i)=>{m.wrapS=m.wrapT=THREE.RepeatWrapping;m.repeat.set(7,7);m.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;m.anisotropy=4;});},[maps]);
 return <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.12,0]} receiveShadow name="CC0-paving-4m-repeat"><planeGeometry args={[28,28]}/><meshStandardMaterial color={pbr?'#ffffff':'#8c8d86'} map={pbr?maps[0]:null} roughnessMap={pbr?maps[1]:null} normalMap={pbr?maps[2]:null} normalScale={new THREE.Vector2(.25,.25)} roughness={.88}/></mesh>;
}
function Neighbours({visible}:{visible:boolean}){return <group name="reflection-test-neighbours" visible={visible}>
 {[[-11,5,11,3,10,4],[12,4,-8,4,8,3]].map(([x,y,z,w,h,d],i)=><group key={i}><mesh position={[x,y,z]} castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={i?'#9c7852':'#6d7e82'} metalness={.3} roughness={.3}/></mesh>{Array.from({length:Math.floor(h/1.2)},(_,k)=><mesh key={k} position={[x,k*1.2+.6,z-d/2-.04]}><boxGeometry args={[w+.12,.12,.15]}/><meshStandardMaterial color="#d3c8b0" metalness={.5} roughness={.25}/></mesh>)}</group>)}
 </group>;}
function Rig({time,method,neighbours,shadows,probeRevision,onConfigured}:{time:Time;method:Method;neighbours:boolean;shadows:boolean;probeRevision:number;onConfigured:()=>void}){
 const hdr=useLoader(HDRLoader,ROOT+'resources/venice_sunset_1k.hdr');const{gl,scene}=useThree();const config=TIMES[time];
 useEffect(()=>{
  gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=config.exposure;gl.transmissionResolutionScale=1;gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;
  const pmrem=new THREE.PMREMGenerator(gl);const env=pmrem.fromEquirectangular(hdr);scene.environment=env.texture;scene.environmentIntensity=time==='night'?.12:time==='blue'?.32:.8;scene.background=new THREE.Color(config.background);scene.fog=new THREE.Fog(config.background,40,110);
  const sky=new Sky();sky.scale.setScalar(100);sky.material.uniforms.sunPosition.value.set(...config.sun);sky.material.uniforms.turbidity.value=3.5;sky.material.uniforms.rayleigh.value=1.5;
  // Sky is a real backdrop; the licensed HDRI is a fixed sunset environment, not
  // claimed to be a measured morning/night HDR. Capture switches its background
  // explicitly to the radiance map, then restores the visible analytic sky.
  if(time!=='night'&&time!=='blue')scene.add(sky);
  const cube=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType});const camera=new THREE.CubeCamera(.1,100,cube);camera.position.set(0,3.5,4.05);
  let filtered:THREE.WebGLRenderTarget|undefined;let raf=0;let stale=false;
  const begin=performance.now();
  raf=requestAnimationFrame(()=>{
   if(stale)return;const specimen=scene.getObjectByName('CL-G2-FACADE-14');if(specimen)specimen.visible=false;sky.visible=false;const background=scene.background;scene.background=hdr;hdr.mapping=THREE.EquirectangularReflectionMapping;
   try{scene.updateMatrixWorld(true);camera.update(gl,scene);filtered=pmrem.fromCubemap(cube.texture);scene.userData.localProbe=filtered.texture;
    // Explicitly refresh just the glass; other materials keep the static HDR.
    specimen?.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;for(const a of Array.isArray(m.material)?m.material:[m.material])if(a.name==='glass'){const g=a as THREE.MeshPhysicalMaterial;g.envMap=method==='hdr'?null:filtered!.texture;g.needsUpdate=true;}});
    Object.assign(gl.domElement.dataset,{configured:'true',method,time,neighbours:String(neighbours),shadow:String(shadows),captureCpuWallMs:(performance.now()-begin).toFixed(2),probe:'single-point-128-no-parallax',bloom:'none',hdri:'venice_sunset_1k_CC0',seed:'14',fov:'42',exposure:String(config.exposure)});onConfigured();
   }finally{if(specimen)specimen.visible=true;sky.visible=true;scene.background=background;gl.shadowMap.needsUpdate=true;}
  });
  return()=>{stale=true;cancelAnimationFrame(raf);scene.remove(sky);sky.geometry.dispose();sky.material.dispose();scene.environment=null;delete scene.userData.localProbe;env.dispose();filtered?.dispose();cube.dispose();pmrem.dispose();};
 },[gl,scene,hdr,time,method,neighbours,shadows,probeRevision,onConfigured,config]);
 return <><ambientLight intensity={.12+config.night*.06}/><hemisphereLight args={['#b5ccdd','#776552',.5-config.night*.35]}/><directionalLight position={[...config.sun]} intensity={config.power} color={time==='sunset'?'#ffd1a0':time==='morning'?'#ffe1bc':'#fff4df'} castShadow={shadows} shadow-mapSize={[1024,1024]} shadow-camera-left={-17} shadow-camera-right={17} shadow-camera-top={16} shadow-camera-bottom={-10} shadow-camera-near={.2} shadow-camera-far={60} shadow-bias={-.00025} shadow-normalBias={.035}/>
 {[0,3.6].map((z,f)=>[-3.2,0,3.2].map((x,i)=><pointLight key={f+':'+i} position={[x,z+2.85,.1]} color={f?'#ffe4bf':'#ffd5a1'} intensity={(4+config.night*(i===1?22:14))*(f?.8:1)} distance={5} decay={2}/>))}
 </>;
}
function Camera({view,onLost}:{view:View;onLost:()=>void}){
 const{camera,gl,scene}=useThree();const controls=useRef<OrbitControls>();const frames=useRef<number[]>([]);const last=useRef(0);
 useEffect(()=>{const c=new OrbitControls(camera,gl.domElement);c.enableDamping=true;c.minDistance=3;c.maxDistance=45;c.maxPolarAngle=Math.PI*.55;c.addEventListener('start',()=>{gl.domElement.dataset.stable='false';});controls.current=c;const lost=(e:Event)=>{e.preventDefault();onLost();};gl.domElement.addEventListener('webglcontextlost',lost);return()=>{c.dispose();gl.domElement.removeEventListener('webglcontextlost',lost);};},[camera,gl,onLost]);
 useEffect(()=>{const c=controls.current;if(!c)return;const damping=c.enableDamping;c.enableDamping=false;c.update();camera.position.set(...VIEWS[view].position);c.target.set(...VIEWS[view].target);c.update();c.enableDamping=damping;gl.domElement.dataset.stable='true';},[view,camera,gl]);
 useFrame(()=>{controls.current?.update();camera.position.y=Math.max(1.6,camera.position.y);const now=performance.now();if(last.current)frames.current.push(now-last.current);last.current=now;const el=gl.domElement;Object.assign(el.dataset,{camera:camera.position.toArray().join(','),target:controls.current?.target.toArray().join(','),entityId:'CL-G2-FACADE-14',drawCalls:String(gl.info.render.calls),triangles:String(gl.info.render.triangles),textures:String(gl.info.memory.textures),geometries:String(gl.info.memory.geometries),environment:String(Boolean(scene.environment))});if(frames.current.length>=120){const a=frames.current;el.dataset.fps=(1000*a.length/a.reduce((s,n)=>s+n,0)).toFixed(2);el.dataset.p95=[...a].sort((a,b)=>a-b)[Math.floor(a.length*.95)].toFixed(2);frames.current=[];}});return null;
}
export default function CitylightMaterialLab(){
 const[method,setMethod]=useState<Method>('hdr'),[time,setTime]=useState<Time>('sunset'),[view,setView]=useState<View>('front'),[clear,setClear]=useState(true),[neighbours,setNeighbours]=useState(true),[pbr,setPbr]=useState(true),[shadows,setShadows]=useState(true),[revision,setRevision]=useState(0),[ready,setReady]=useState(false),[lost,setLost]=useState(false),[paused,setPaused]=useState(false),[generation,setGeneration]=useState(0),[size,setSize]=useState(''),[metrics,setMetrics]=useState('');
 const host=useRef<HTMLDivElement>(null);const onConfigured=useCallback(()=>setReady(true),[]),onLost=useCallback(()=>{setLost(true);setReady(false);},[]);
 useEffect(()=>{const node=host.current;if(!node)return;const observer=new ResizeObserver(([e])=>{if(needsStableDrawingBuffer())setSize(`${Math.floor(e.contentRect.width)}:${Math.floor(e.contentRect.height)}`);else setSize('native');});observer.observe(node);return()=>observer.disconnect();},[]);
 useEffect(()=>{const id=setInterval(()=>{const c=host.current?.querySelector('canvas');if(c)setMetrics(`${c.dataset.fps||'采样中'} FPS / p95 ${c.dataset.p95||'—'} ms / ${c.dataset.drawCalls||'—'} draws`);},1000);const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setView('front');};window.addEventListener('keydown',esc);return()=>{clearInterval(id);window.removeEventListener('keydown',esc);};},[]);
 const change=(fn:()=>void)=>{setReady(false);fn();setRevision(n=>n+1);};
 return <><header className="citylight-heading"><div><span className="citylight-kicker">G2 / CL-G2-FACADE-14 / 独立研究试件 · 未通过</span><h1>先让一扇窗，变得可信。</h1><p>两层三跨实物：真实窗框、楼板、办公与会议空间。不是新塔，不是城市；旧塔保留。拖动可环绕，Esc 复位。</p></div><div><Link href="/citylight/review">中文证据中心 ↗</Link><br/><Link href="/citylight/studio">原塔基线 ↗</Link></div></header>
 <div className="citylight-workbench"><section className="citylight-viewport" data-ready={ready&&!lost&&!paused} data-method={method} data-time={time} data-view={view} data-glass={clear?'clear':'hazy-reference'} aria-label="幕墙材料真实三维试验台"><div ref={host} className="lab-canvas" style={{width:'100%',height:'100%'}}>
 {lost||paused?<div className="citylight-fallback" role="status"><h2>{paused?'试件已暂停':'WebGL 已中断，未继续显示旧画面'}</h2><p>可手动恢复；不自动重连任何服务。</p><button onClick={()=>{setLost(false);setPaused(false);setReady(false);setGeneration(n=>n+1);}}>恢复本地三维试件</button></div>:size&&<Boundary key={generation} onError={onLost}><Canvas key={size+':'+generation} camera={{position:VIEWS.front.position,fov:42,near:.1,far:180}} dpr={1} gl={canvas=>createStableRenderer(canvas,1)} shadows={shadows} onCreated={({gl})=>{const g=gl.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');gl.domElement.dataset.renderer=String(e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER));}}>
 <Suspense fallback={null}><Specimen method={method} time={time} clear={clear}/><Ground pbr={pbr}/><Neighbours visible={neighbours}/><Rig time={time} method={method} neighbours={neighbours} shadows={shadows} probeRevision={revision} onConfigured={onConfigured}/><Camera view={view} onLost={onLost}/></Suspense></Canvas></Boundary>}
 </div><div className="citylight-caption"><span><strong>实验版本 · 不计入原塔美术分</strong>{TIMES[time].name} / {method==='hdr'?'A 静态 HDR 透射':method==='local'?'B 邻楼局部捕获＋透射':'C 不透射负对照'}</span><small>{ready?'本地真实 GLB 已加载':'等待加载与捕获'}<br/>无 Bloom / DPR 1 / 固定 seed 14</small></div></section>
 <aside className="citylight-controls"><div><span className="citylight-kicker">MATERIAL / STRUCTURE / EVIDENCE</span><h2>只改变一个变量</h2><p className="lab-diagnostics" aria-live="polite">{metrics||'等待原始帧时间采样'}</p></div>
 <fieldset><legend>反射与透射路径</legend><div className="citylight-buttons">{([['hdr','A · 静态 HDR'],['local','B · 现场邻楼探针'],['opaque','C · 不透射负对照']]as const).map(([k,l])=><button key={k} aria-pressed={method===k} onClick={()=>change(()=>setMethod(k))}>{l}</button>)}<button aria-pressed={!clear} onClick={()=>change(()=>setClear(v=>!v))}>旧发雾参数／清透参数对照</button></div><p>A/B 仅改变环境来源；当前透射 {clear?'1.0':'0.82'} / 粗糙度 {clear?'0.02':'0.085'} / IOR 1.5 / 16mm。B 为单点128探针，无视差修正、无SSR。C 遮住室内，不能作为合格方案。</p></fieldset>
 <fieldset><legend>世界时间</legend><div className="citylight-buttons">{(Object.keys(TIMES)as Time[]).map(t=><button key={t} aria-pressed={time===t} onClick={()=>change(()=>setTime(t))}>{TIMES[t].name}</button>)}</div><p>阳光与室内灯随时刻变化；HDRI 是同一张夕阳环境的照明近似，尚非五套实测环境。</p></fieldset>
 <fieldset><legend>固定机位</legend><div className="citylight-buttons">{(Object.keys(VIEWS)as View[]).map(v=><button key={v} aria-pressed={view===v} onClick={()=>setView(v)}>{VIEWS[v].name}</button>)}</div></fieldset>
 <fieldset><legend>单因素开关</legend><div className="citylight-buttons"><button aria-pressed={neighbours} onClick={()=>change(()=>setNeighbours(v=>!v))}>邻楼开／关并重捕获</button><button aria-pressed={pbr} onClick={()=>change(()=>setPbr(v=>!v))}>CC0 地面 PBR 开／关</button><button aria-pressed={shadows} onClick={()=>change(()=>setShadows(v=>!v))}>阴影开／关</button><button onClick={()=>setPaused(true)}>暂停本地渲染</button></div></fieldset>
 </aside></div><p className="lab-status">G2 仍未通过。用户原塔视觉评价约 35/100 或更低，不随本试验自动提高。邻楼仅为反射测试体；家具尚未独立签收。所有交互在本地渲染，不调用 TTS、Decart 或生成 API。</p>
 <section className="citylight-notes"><article><span>01 / 真实几何</span><h3>窗后有不同用途。</h3><p>首层工位与休息区，上层会议区；椅背曲面、五爪脚轮、桌面厚度和灯具均为网格。并不意味着它们已达到A级母版标准。</p></article><article><span>02 / 许可</span><h3>只用具体授权资源。</h3><p>Poly Haven Venice Sunset 1k HDR 与 Concrete Tiles 02 1k PBR 为 CC0；源文件、许可入口与校验见资源清单。没有购买素材或调用图片生成。</p><a href={ROOT+'resources/sources.json'}>资源与 SHA256 ↗</a></article><article><span>03 / 可撤销</span><h3>原塔没有被替换。</h3><p>此试件独立导出，原 V12 GLB 与所有历史失败保留。接下来依据实拍决定取舍，不把一个试件推广成整栋楼。</p><a href={ROOT+'manifest.json'}>模型尺寸、源文件和版本 ↗</a></article></section></>;
}
