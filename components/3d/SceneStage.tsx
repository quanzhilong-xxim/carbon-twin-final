'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { useVisualQuality } from '@/lib/hooks/useVisualQuality';

class RenderBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}> {
  state={failed:false}; static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}
function Lifecycle({onSlow}:{onSlow:()=>void}) {
  const {scene,gl}=useThree(),sample=useRef({elapsed:0,frames:0,slow:0});
  useFrame((_,dt)=>{if(document.hidden)return;const s=sample.current;s.elapsed+=dt;s.frames++;if(s.elapsed>=3){const fps=s.frames/s.elapsed;gl.domElement.dataset.fps=fps.toFixed(1);s.slow=fps<24?s.slow+1:0;if(s.slow>=2)onSlow();s.elapsed=0;s.frames=0;}});
  useEffect(()=>()=>{scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line||object instanceof THREE.Points){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(m=>m.dispose());}});gl.renderLists.dispose();},[scene,gl]);
  return null;
}
export default function SceneStage({children,label,fallback}:{children:ReactNode;label:string;fallback:ReactNode}) {
  const {webgl,reduced}=useVisualQuality(),[lost,setLost]=useState(false),[slow,setSlow]=useState(false),[visible,setVisible]=useState(false),[revision,setRevision]=useState(0);
  const root=useRef<HTMLDivElement>(null),cleanup=useRef<()=>void>();
  useEffect(()=>{const observer=new IntersectionObserver(([e])=>setVisible(e.isIntersecting),{rootMargin:'150px'});if(root.current)observer.observe(root.current);return()=>{observer.disconnect();cleanup.current?.();};},[]);
  const backup=<div className="stage-fallback"><span>2D / INTERACTIVE FIELD NOTES</span>{fallback}</div>;
  return <div ref={root} className="scene-stage" role="region" aria-label={label} data-mode={lost?'context-lost':slow||!webgl?'lite':'3d'}>
    {webgl&&!slow&&visible?<RenderBoundary key={revision} fallback={backup}><Canvas camera={{position:[5,3,7],fov:42}} dpr={[1,1.25]} frameloop={reduced?'demand':'always'} gl={{antialias:true,powerPreference:'high-performance'}} onCreated={({gl})=>{
      cleanup.current?.();const canvas=gl.domElement;
      const lose=(event:Event)=>{event.preventDefault();setLost(true);window.dispatchEvent(new CustomEvent('carbon-toast',{detail:'3D 连接暂停，计算与文字操作继续可用。'}));};
      const restore=()=>{setLost(false);setRevision(v=>v+1);};canvas.addEventListener('webglcontextlost',lose);canvas.addEventListener('webglcontextrestored',restore);
      cleanup.current=()=>{canvas.removeEventListener('webglcontextlost',lose);canvas.removeEventListener('webglcontextrestored',restore);};
    }}><color attach="background" args={['#050B14']}/><ambientLight intensity={1.5}/><directionalLight position={[4,7,5]} intensity={3} color="#e0ffdc"/><pointLight position={[-4,3,-2]} intensity={35} color="#6B46C1"/>{children}<Lifecycle onSlow={()=>setSlow(true)}/></Canvas>{lost&&backup}</RenderBoundary>:backup}
  </div>;
}

