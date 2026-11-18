'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { SceneResources } from '@/lib/three/scene-assets';
import { SceneFrameReady, useSceneRuntime } from '@/lib/three/scene-runtime';
import { useVisualQuality } from '@/lib/hooks/useVisualQuality';
import { PCFShadowMap } from 'three';
import { createStableRenderer, needsStableDrawingBuffer } from '@/lib/citylight/stable-renderer';
import './scene-performance.css';

export type SceneMode = '3d' | 'initializing' | 'loading' | 'rendering' | 'recovering' | 'lite' | 'offscreen' | 'context-lost' | 'error-fallback';
class RenderBoundary extends Component<{children:ReactNode;fallback:ReactNode;onError:(error:Error)=>void},{failed:boolean}> {
  state={failed:false}; static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error){this.props.onError(error);}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}
function Lifecycle({continuous,resolutionReduced,onLowerResolution,onSlow,onSoftware,onLost,onRestored}:{continuous:boolean;resolutionReduced:boolean;onLowerResolution:(dpr:number)=>void;onSlow:()=>void;onSoftware:()=>void;onLost:()=>void;onRestored:()=>void}) {
  const {gl}=useThree(),frameCount=useRef(0),sample=useRef({elapsed:0,frames:0,slow:0,warmup:0,lowered:resolutionReduced,rendererChecked:false});
  // Bind to this Canvas lifetime. R3F releases the old context after unmount;
  // those delayed events must never pause a newly mounted canvas.
  useEffect(()=>{
    const canvas=gl.domElement;
    const lose=(event:Event)=>{event.preventDefault();onLost();};
    canvas.addEventListener('webglcontextlost',lose);canvas.addEventListener('webglcontextrestored',onRestored);
    return()=>{canvas.removeEventListener('webglcontextlost',lose);canvas.removeEventListener('webglcontextrestored',onRestored);};
  },[gl,onLost,onRestored]);
  useFrame((_,dt)=>{
    gl.domElement.dataset.renderFrame=String(gl.info.render.frame);
    gl.domElement.dataset.sceneFrames=String(++frameCount.current);
    gl.domElement.dataset.sceneTriangles=String(gl.info.render.triangles);
    gl.domElement.dataset.drawCalls=String(gl.info.render.calls);
    // A foreground frame slower than 500 ms is still performance evidence.
    // Dropping it would prevent the slowest devices from ever reaching fallback.
    if(document.hidden||!Number.isFinite(dt)||dt<=0)return;
    const s=sample.current;
    if(!s.rendererChecked){
      s.rendererChecked=true;
      const context=gl.getContext(),debug=context.getExtension('WEBGL_debug_renderer_info'),renderer=debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):context.getParameter(context.RENDERER);
      if(/swiftshader|llvmpipe|software/i.test(String(renderer))){
        s.lowered=true;onSoftware();
        gl.domElement.dataset.quality='software-renderer-adaptive';
      }
      gl.domElement.dataset.renderer=String(renderer).slice(0,160);
    }
    // A demand-rendered exhibit intentionally has long idle intervals. Those
    // intervals measure user inactivity, not GPU frame throughput.
    if(!continuous){s.elapsed=0;s.frames=0;s.slow=0;s.warmup=0;return;}
    s.warmup+=dt;if(s.warmup<8)return;
    s.elapsed+=dt;s.frames++;
    if(s.elapsed>=3){
      const fps=s.frames/s.elapsed;gl.domElement.dataset.fps=fps.toFixed(1);
      s.slow=fps<18?s.slow+1:0;
      if(s.slow>=2&&!s.lowered){
        // DPR 1 was already the initial resolution on standard displays.
        // Reduce the actual pixel count before deciding the GPU needs fallback.
        // The owner must remount immutable WebKit buffers when DPR changes.
        // Direct setDpr would change the viewport while leaving that buffer full size.
        s.lowered=true;onLowerResolution(Math.max(.5,gl.getPixelRatio()*.7));s.slow=0;
        gl.domElement.dataset.quality='lower-resolution';
      }else if(s.slow>=3&&s.lowered)onSlow();
      s.elapsed=0;s.frames=0;
    }
  });
  // Fiber owns declarative resources. Cached GLTF primitives opt out with
  // dispose={null}; traversing the entire scene here invalidates those assets
  // when an offscreen canvas remounts. Primitive owners release their own clones.
  useEffect(()=>()=>{gl.renderLists.dispose();},[gl]);
  return null;
}
export default function SceneStage({children,label,fallback,sceneLights=true,pauseWhenHidden=false,paused=false,transparent=false,shadows=false,onModeChange}:{children:ReactNode;label:string;fallback:ReactNode;sceneLights?:boolean;pauseWhenHidden?:boolean;paused?:boolean;transparent?:boolean;shadows?:boolean;onModeChange?:(mode:SceneMode)=>void}) {
  const {webgl,reduced,quality}=useVisualQuality(),[lost,setLost]=useState(false),[slow,setSlow]=useState(false),[visible,setVisible]=useState(false),[revision,setRevision]=useState(0),[softwareRenderer,setSoftwareRenderer]=useState(false),[failed,setFailed]=useState(false);
  const root=useRef<HTMLDivElement>(null),[requested3d,setRequested3d]=useState(false),[resident,setResident]=useState(false);
  const [surface,setSurface]=useState(''),[adaptiveDpr,setAdaptiveDpr]=useState<number|null>(null);
  useEffect(()=>{
    const node=root.current;if(!node)return;
    const stableBuffer=needsStableDrawingBuffer();let timer:ReturnType<typeof setTimeout>|undefined;
    const observer=new ResizeObserver(([e])=>{
      if(!stableBuffer){setSurface('native');return;}
      const next=`${Math.floor(e.contentRect.width)}:${Math.floor(e.contentRect.height)}`;
      // A live resize can otherwise allocate contexts faster than Fiber's delayed
      // teardown releases them. Stretch the current buffer, then replace it once.
      clearTimeout(timer);timer=setTimeout(()=>setSurface(next),120);
    });
    observer.observe(node);return()=>{clearTimeout(timer);observer.disconnect();};
  },[]);
  const stable=needsStableDrawingBuffer(),stableDpr=slow?.5:Math.min(quality==='lite'?.8:1,softwareRenderer?.7:1,adaptiveDpr??1);
  const nativeDpr=slow?.5:adaptiveDpr??(softwareRenderer?.7:quality==='lite'?[.7,.95] as [number,number]:[1,1.25] as [number,number]);
  // Reduced motion changes the render loop and animation amplitude; it must
  // never silently replace a real WebGL exhibit with a 2D poster. Users who
  // request reduced motion still deserve the same spatial model and controls.
  const enabled=webgl||requested3d;
  const [pageVisible,setPageVisible]=useState(true);
  useEffect(()=>{if(!pauseWhenHidden)return;const update=()=>setPageVisible(!document.hidden);update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[pauseWhenHidden]);
  useEffect(()=>{
    let release:ReturnType<typeof setTimeout>|undefined;
    const observer=new IntersectionObserver(([e])=>{
      setVisible(e.isIntersecting);clearTimeout(release);
      if(e.isIntersecting)setResident(true);
      // Stop frames immediately, retain the context briefly across scroll
      // boundaries, then release it so the ten chapters do not all stay live.
      else release=setTimeout(()=>setResident(false),800);
    },{rootMargin:'150px'});
    if(root.current)observer.observe(root.current);
    return()=>{clearTimeout(release);observer.disconnect();};
  },[]);
  const handleLost=useCallback(()=>{setLost(true);window.dispatchEvent(new CustomEvent('carbon-toast',{detail:'3D 连接暂停，计算与文字操作继续可用。'}));},[]);
  // Three restores its own GPU resources. Replacing a restored Canvas here
  // creates another context and can trigger a repeated loss/remount cycle.
  const handleRestored=useCallback(()=>setLost(false),[]);
  const handleSlow=useCallback(()=>setSlow(true),[]),handleSoftware=useCallback(()=>setSoftwareRenderer(true),[]),handleError=useCallback(()=>setFailed(true),[]);
  const handleLowerResolution=useCallback((dpr:number)=>setAdaptiveDpr(current=>Math.min(current??1.25,dpr)),[]);
  const runtime=useSceneRuntime(enabled&&visible&&pageVisible,label);
  useEffect(()=>{if(runtime.generation>0)setFailed(false);},[runtime.generation]);
  const mode:SceneMode=failed||runtime.error?'error-fallback':!enabled?'initializing':!visible?'offscreen':lost||runtime.lost?'context-lost':runtime.ready?'3d':runtime.phase==='error'?'error-fallback':runtime.phase==='rendered'?'rendering':runtime.phase;
  useEffect(()=>onModeChange?.(mode),[mode,onModeChange]);
  const retry=()=>{runtime.retry();setRequested3d(true);setSlow(false);setFailed(false);setLost(false);setRevision(v=>v+1);};
  const backup=<div className="stage-fallback"><span>2D / INTERACTIVE FIELD NOTES</span>{fallback}{runtime.error&&<p className="stage-error-reason">{runtime.error}</p>}{(!enabled||failed||lost||runtime.error)&&<button className="world-hotspot" onClick={retry}>重试三维视图</button>}</div>;
  return (
    <div ref={root} className="scene-stage" role="region" aria-label={label} data-mode={mode} data-load-state={runtime.phase} aria-busy={visible&&!runtime.ready&&!runtime.error} data-transparent={transparent || undefined}>
      {enabled && !failed && !runtime.error && resident && surface ? (
        <RenderBoundary key={`${revision}:${runtime.generation}`} fallback={backup} onError={error=>{runtime.fail(error);handleError();}}>
          <SceneResources.Provider value={runtime.scope}>
          <Canvas key={stable?`${surface}:${stableDpr}`:'native'} shadows={shadows && quality === 'full' && !softwareRenderer && !slow ? { type: PCFShadowMap } : false} camera={{ position: [5, 3, 7], fov: 42 }} dpr={stable?stableDpr:nativeDpr} frameloop={!visible || lost || pauseWhenHidden && !pageVisible ? 'never' : reduced || paused || slow ? 'demand' : 'always'} gl={stable?canvas=>createStableRenderer(canvas,stableDpr):{ antialias: quality === 'full', alpha: transparent, powerPreference: 'high-performance' }} onCreated={() => {setLost(false);runtime.onCreated();}}>
            {!transparent && <color attach="background" args={[sceneLights ? '#050B14' : '#081611']} />}
            {sceneLights && <><ambientLight intensity={1.5} /><directionalLight position={[4, 7, 5]} intensity={3} color="#e0ffdc" /><pointLight position={[-4, 3, -2]} intensity={35} color="#6B46C1" /></>}
            <Suspense fallback={null}>{children}<SceneFrameReady scope={runtime.scope} onReady={runtime.onRendered}/></Suspense>
            <Lifecycle continuous={!paused && !slow && !reduced} resolutionReduced={adaptiveDpr!==null||softwareRenderer} onLowerResolution={handleLowerResolution} onSlow={handleSlow} onSoftware={handleSoftware} onLost={()=>{runtime.onLost();handleLost();}} onRestored={()=>{runtime.onRestored();handleRestored();}} />
          </Canvas>
          </SceneResources.Provider>
          {!runtime.ready&&!lost&&<div className="stage-loading" role="status"><span aria-hidden="true">◌</span><b>{runtime.phase==='recovering'?'正在恢复三维场景':runtime.phase==='rendering'?'资源就绪，正在渲染':'正在加载三维模型与材质'}</b><small>完成实际渲染后即可操作</small></div>}
          {lost && backup}
          {slow && !lost && <div className="stage-performance-note"><span>已暂停环境动态，保留三维与操作。</span><button onClick={()=>setSlow(false)}>继续动态</button></div>}
        </RenderBoundary>
      ) : backup}
    </div>
  );
}

