'use client';
import { SceneResources } from '@/lib/three/scene-assets';
import { SceneFrameReady, SceneLifecycle, useSceneRuntime } from '@/lib/three/scene-runtime';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { visualDynamics } from '@/lib/visualDynamics';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { useDataStore } from '@/lib/stores/DataStore';
import { useUIStore } from '@/lib/stores/UIStore';
import { ecologyState, ECOLOGY_BASELINE } from '@/lib/ecology';
import { useVisualQuality, lowerVisualQuality } from '@/lib/hooks/useVisualQuality';
import BotanicalCanvas from './BotanicalCanvas';
const hash=(n:number)=>{const a=Math.sin(n*127.1+48.7)*43758.54;return a-Math.floor(a);};
// Smooth lattice gradient noise; deterministic and evaluated entirely on the GPU.
const noise=`vec3 gradient(vec3 p){return normalize(fract(sin(vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))))*43758.5453)*2.-1.);}float noise(vec3 p){vec3 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(mix(dot(gradient(i),f),dot(gradient(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(gradient(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(gradient(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),mix(mix(dot(gradient(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(gradient(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(gradient(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(gradient(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z)*.5+.5;}`;
function targets(giant=false){
  const city:number[]=[],forest:number[]=[],branches:number[]=[];
  for(let x=0;x<16;x++)for(let z=0;z<16;z++){
    const h=Math.abs(Math.sin(x*127.1+z*311.7)*43758.5453)%1,c=Math.max(0,1-Math.hypot(x-8,z-8)/9),floors=3+Math.floor(h*h*20+c*c*22);
    for(let y=0;y<floors;y++)for(let a=0;a<3;a++)for(let b=0;b<3;b++)city.push((x-7.5)*1.25+(a-1)*.23,y*.24,(z-7.5)*1.25+(b-1)*.23);
  }
  for(let i=0;i<city.length/3;i++){
    const tree=giant?0:i%31,big=tree===0,angle=tree*2.39996,radius=big?0:3+Math.sqrt(tree/30)*7.6,tx=Math.cos(angle)*radius,tz=Math.sin(angle)*radius,h=big?10.5:3.2+hash(tree)*3.9;
    const a=hash(i+1)*Math.PI*2,p=Math.acos(2*hash(i+2)-1),r=Math.cbrt(hash(i+3));
    let x=tx+Math.sin(p)*Math.cos(a)*r*h*.36,y=h*.76+Math.cos(p)*r*h*.42,z=tz+Math.sin(p)*Math.sin(a)*r*h*.36;
    if(giant){
      const lobe=i%7,azimuth=(lobe-1)*Math.PI/3,reach=lobe===0?0:h*.235;
      const crownY=lobe===0?h*.94:h*(.64+hash(lobe+90)*.12),crownRadius=h*(lobe===0?.23:.25);
      x=Math.cos(azimuth)*reach+Math.sin(p)*Math.cos(a)*r*crownRadius;
      y=crownY+Math.cos(p)*r*crownRadius*(.78+hash(lobe+80)*.22);
      z=Math.sin(azimuth)*reach+Math.sin(p)*Math.sin(a)*r*crownRadius;
      const tissue=hash(i+5),t=hash(i+7);
      if(tissue<.12){const width=(.34-t*.2)*Math.sqrt(hash(i+9));x=Math.sin(t*3)*.16+Math.cos(a)*width;y=t*h*.74;z=Math.sin(a)*width;}
      else if(tissue<.23){const branch=i%6,angle=branch*Math.PI/3,start=h*(.25+branch*.025);x=Math.cos(angle)*h*.28*t+Math.cos(a)*.09;y=start+(h*.72-start)*t;z=Math.sin(angle)*h*.28*t+Math.sin(a)*.09;}
    }else if(hash(i+5)<.15){const t=hash(i+7);x=tx+Math.sin(t*8)*.13;y=t*h*.7;z=tz+Math.cos(t*8)*.13;}
    forest.push(x,y,z);
  }
  for(let t=0;t<(giant?1:31);t++){
    const a=t*2.39996,r=t===0?0:3+Math.sqrt(t/30)*7.6,x=Math.cos(a)*r,z=Math.sin(a)*r,h=t===0?10.5:3.2+hash(t)*3.9;
    branches.push(x,0,z,x,h*.9,z);for(let b=0;b<5;b++){const aa=b*2.4;branches.push(x,h*(.4+b*.09),z,x+Math.cos(aa)*h*.26,h*(.65+b*.055),z+Math.sin(aa)*h*.26);}
  }return{city,forest,branches};
}
function Field({city,onSlow}:{city:boolean;onSlow:()=>void}){
  const annual = useDataStore(s => s.emissions?.annual ?? ECOLOGY_BASELINE);
  const electricity = useDataStore(s => s.emissions?.sectors.find(v=>v.id==='energy')?.value ?? 1254.96);
  const {gl,camera}=useThree(),mesh=useRef<THREE.InstancedMesh>(null),pointer=useRef(new THREE.Vector2()),base=useRef(new THREE.Euler()),sample=useRef({seconds:0,frames:0,slow:0,elapsed:0});
  const resources=useMemo(()=>{
    const data=targets(true),count=data.city.length/3,offset=new Float32Array(data.city.length);for(let i=0;i<offset.length;i++)offset[i]=data.forest[i]-data.city[i];
    const box=new THREE.BoxGeometry(.095,.095,.095);box.setAttribute('aForest',new THREE.InstancedBufferAttribute(offset,3));
    const uniforms={uTime:{value:0},uMorph:{value:city?0:1},uStress:{value:0},uMouse:{value:new THREE.Vector2()},uVelocity:{value:0}};
    const material=new THREE.MeshStandardMaterial({color:'#77cfa0',emissive:'#39FF14',emissiveIntensity:.55,metalness:.8,roughness:.2});
    material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='attribute vec3 aForest;uniform float uTime,uMorph,uStress;uniform vec2 uMouse;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 anchor=instanceMatrix[3].xyz+aForest*uMorph;float tip=smoothstep(1.,6.,anchor.y)*uMorph;float nearMouse=exp(-length(anchor.xz-uMouse*10.)*.18);
      transformed+=aForest*uMorph;transformed.x+=sin(uTime*.7+anchor.y*.4+anchor.z)*(.08+nearMouse*.15)*tip;transformed.z+=cos(uTime*.5+anchor.x)*.06*tip;
      transformed.x+=sin(uTime*11.+anchor.z*8.)*uStress*.13*tip;transformed.y-=uStress*mod(uTime*.8+abs(anchor.x*7.+anchor.z*3.),9.)*.4*tip;`);};
    const rays=new THREE.BufferGeometry(),rp:number[]=[],ro:number[]=[];
    for(let i=0;i<count;i++){const p=data.city.slice(i*3,i*3+3),f=data.forest.slice(i*3,i*3+3);rp.push(...p,p[0],p[1]+.8+hash(i)*3,p[2]);ro.push(f[0]-p[0],f[1]-p[1],f[2]-p[2],f[0]-p[0],f[1]-p[1],f[2]-p[2]);}
    rays.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));rays.setAttribute('aOffset',new THREE.Float32BufferAttribute(ro,3));
    const rayMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'attribute vec3 aOffset;uniform float uMorph,uTime;varying float vAlpha;void main(){vec3 p=position+aOffset*uMorph;vAlpha=(.015+.045*pow(sin(position.y+uTime*.4)*.5+.5,4.))*(1.-uMorph*.8);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'varying float vAlpha;void main(){gl_FragColor=vec4(.52,1.,.72,vAlpha);}'});
    const dust=new THREE.BufferGeometry(),dp:number[]=[];for(let i=0;i<650;i++)dp.push((hash(i*3)-.5)*28,hash(i*3+1)*14,(hash(i*3+2)-.5)*25);dust.setAttribute('position',new THREE.Float32BufferAttribute(dp,3));
    const dustMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`uniform float uTime,uStress;uniform vec2 uMouse;varying float vLight;${noise} void main(){vec3 p=position;float flow=noise(p*.2+uTime*.07);p.x+=sin(uTime*.3+p.z)*1.2+uMouse.x*.3;p.y=mix(mod(p.y+uTime*.25,14.),14.-mod(position.y+uTime*8.,14.),uStress);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(2.+flow*3.)*min(2.,35./-mv.z);vLight=.2+.65*flow;}`,fragmentShader:'uniform float uStress;varying float vLight;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(mix(vec3(.65,1.,.65),vec3(.7,.15,.13),uStress),exp(-d*d*16.)*vLight);}'});
    const plane=new THREE.PlaneGeometry(2,2),skyMaterial=new THREE.ShaderMaterial({uniforms,depthWrite:false,depthTest:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.999,1.);}',fragmentShader:`uniform float uTime,uStress,uVelocity;uniform vec2 uMouse;varying vec2 vUv;${noise} void main(){vec2 uv=vUv+uMouse*.04;float t=uTime*.06;float w=noise(vec3(uv*3.+vec2(sin(t),cos(t))*(.3+uVelocity*2.),t));float ribbon=pow(1.-abs(sin((uv.y+w*.35+uMouse.y*uv.x*.12)*7.-t)),6.);float halo=exp(-length((uv-vec2(.62,.5))*vec2(1.,1.4))*3.);vec3 green=vec3(.2235,1.,.0784);vec3 purple=vec3(.4196,.2745,.7569);vec3 aurora=mix(green,purple,w)*ribbon*halo*.045;gl_FragColor=vec4(vec3(.0015,.0034,.007)+aurora*(1.+uVelocity),1.);}`});
    const ground=new THREE.PlaneGeometry(28,28,32,32);ground.rotateX(-Math.PI/2);const groundMaterial=new THREE.MeshStandardMaterial({color:'#307866',wireframe:true,transparent:true,opacity:.22});
    groundMaterial.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='uniform float uStress;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y-=uStress*(.5+sin(position.x*2.)*sin(position.z*2.))*1.2;');};
    const branches=new THREE.BufferGeometry();branches.setAttribute('position',new THREE.Float32BufferAttribute(data.branches,3));const branchMaterial=new THREE.LineBasicMaterial({color:'#739e82',transparent:true,opacity:city?0:.5});
    const path=new THREE.BufferGeometry(),pp:number[]=[];for(let i=0;i<100;i++){const t=i/99;pp.push(Math.sin(t*7)*3,.08,t*20-10);}path.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));const pathMaterial=new THREE.LineBasicMaterial({color:'#dcff95',transparent:true,opacity:0,blending:THREE.AdditiveBlending}),pathObject=new THREE.Line(path,pathMaterial);
    return{data,count,box,material,uniforms,rays,rayMaterial,dust,dustMaterial,plane,skyMaterial,ground,groundMaterial,branches,branchMaterial,path,pathMaterial,pathObject,colour:new THREE.Color()};
  },[city]);
  useLayoutEffect(()=>{const o=new THREE.Object3D();for(let i=0;i<resources.count;i++){o.position.fromArray(resources.data.city,i*3);o.updateMatrix();mesh.current?.setMatrixAt(i,o.matrix);}if(mesh.current)mesh.current.instanceMatrix.needsUpdate=true;camera.position.set(city?29:23,city?29:17,city?34:28);camera.lookAt(0,city?2:3.5,0);base.current.copy(camera.rotation);gl.domElement.dataset.instances=String(resources.count);},[resources,camera,gl,city]);
  useEffect(()=>{const instance=mesh.current;const move=(e:MouseEvent)=>{const r=gl.domElement.getBoundingClientRect();pointer.current.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));};window.addEventListener('mousemove',move,{passive:true});return()=>{window.removeEventListener('mousemove',move);[resources.box,resources.rays,resources.dust,resources.plane,resources.ground,resources.branches,resources.path].forEach(g=>g.dispose());[resources.material,resources.rayMaterial,resources.dustMaterial,resources.skyMaterial,resources.groundMaterial,resources.branchMaterial,resources.pathMaterial].forEach(m=>m.dispose());if(instance)THREE.InstancedMesh.prototype.dispose.call(instance);gl.renderLists.dispose();};},[resources,gl]);
  useFrame((_,delta)=>{if(document.hidden)return;const s=sample.current;s.elapsed+=delta;const e=ecologyState(annual),ui=useUIStore.getState(),u=resources.uniforms;
    const progress=city?visualDynamics.scroll:0;
    const morphTarget=city?Math.max(e.restoration,THREE.MathUtils.smoothstep(progress,.38,.86)):e.restoration;
    const step=Math.min(delta,.25)/1.5;
    u.uMorph.value+=THREE.MathUtils.clamp(morphTarget-u.uMorph.value,-step,step);
    u.uTime.value=s.elapsed;u.uMouse.value.lerp(pointer.current,.05);u.uVelocity.value=Math.max(visualDynamics.velocity,visualDynamics.impulse);
    u.uStress.value=THREE.MathUtils.damp(u.uStress.value,Math.max(e.stress,city?Math.sin(progress*Math.PI)*.55:0),3,delta);
    if(city){camera.position.set(29-progress*15,29-progress*15,34-progress*19);camera.lookAt(-3*(1-progress),2+progress*3,0);base.current.copy(camera.rotation);}
    gl.domElement.dataset.morph=u.uMorph.value.toFixed(3);
    gl.domElement.style.filter=`blur(${u.uVelocity.value*1.6}px)`;
    resources.colour.setHSL(.34*(1-e.stress),.65,.37-e.stress*.23);resources.material.color.lerp(resources.colour,.04);resources.material.emissive.copy(resources.colour);resources.material.emissiveIntensity=(.35+Math.min(.8,electricity/1254.96*.35))*(1+Math.sin(s.elapsed*.7)*.04);resources.branchMaterial.opacity=u.uMorph.value*.45;resources.pathMaterial.opacity=ui.ecoRevision>0?.65+Math.sin(s.elapsed*2)*.2:0;
    camera.rotation.x=THREE.MathUtils.lerp(camera.rotation.x,base.current.x+pointer.current.y*.015,.05);camera.rotation.y=THREE.MathUtils.lerp(camera.rotation.y,base.current.y+pointer.current.x*.025,.05);
    gl.domElement.dataset.rendered='true';gl.domElement.dataset.ecology=e.stress>.65?'stress':e.vitality>.7?'recovery':'transition';gl.domElement.dataset.drawCalls=String(gl.info.render.calls);
    if(s.elapsed>5){s.frames++;s.seconds+=delta;if(s.seconds>=2){const fps=s.frames/s.seconds;gl.domElement.dataset.fps=fps.toFixed(1);s.slow=fps<30?s.slow+1:0;s.frames=0;s.seconds=0;if(s.slow>=2)onSlow();}}
  });
  return <><mesh geometry={resources.plane} material={resources.skyMaterial} renderOrder={-10} frustumCulled={false} dispose={null}/><ambientLight intensity={1.2}/><directionalLight position={[4,12,6]} intensity={2} color="#dcffe5"/><pointLight position={[0,10,0]} intensity={45} color="#9aff9a"/><instancedMesh ref={mesh} args={[resources.box,resources.material,resources.count]} frustumCulled={false} dispose={null}/><lineSegments geometry={resources.rays} material={resources.rayMaterial} frustumCulled={false} dispose={null}/><points geometry={resources.dust} material={resources.dustMaterial} frustumCulled={false} dispose={null}/><mesh position={[0,-.25,0]} geometry={resources.ground} material={resources.groundMaterial} dispose={null}/><lineSegments geometry={resources.branches} material={resources.branchMaterial} dispose={null}/><primitive object={resources.pathObject} dispose={null}/></>;
}
class Boundary extends Component<{children:ReactNode;fallback:ReactNode;onError:(error:Error)=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}componentDidCatch(error:Error){this.props.onError(error);}render(){return this.state.failed?this.props.fallback:this.props.children;}}
export default function EcologicalScene({city=false}:{city?:boolean}) {
 const {webgl,reduced,quality}=useVisualQuality(),root=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(true),[pageVisible,setPageVisible]=useState(true),[bloom,setBloom]=useState(true);
 const runtime=useSceneRuntime(webgl&&visible&&pageVisible,city?'生态点阵城市':'生态森林');
 const annual=useDataStore(s=>s.emissions?.annual??ECOLOGY_BASELINE),e=ecologyState(annual),slow=useCallback(()=>{if(bloom)setBloom(false);else lowerVisualQuality('已降低三维分辨率与后处理');},[bloom]);
 useEffect(()=>{const o=new IntersectionObserver(([v])=>setVisible(v.isIntersecting));if(root.current)o.observe(root.current);const visibility=()=>setPageVisible(!document.hidden);visibility();document.addEventListener('visibilitychange',visibility);return()=>{o.disconnect();document.removeEventListener('visibilitychange',visibility);};},[]);
 const poster=city?<div className="city-poster" role="img" aria-label="绿色点阵城市静态后备海报"/>:<div className="forest-poster"><BotanicalCanvas vitality={e.vitality}/></div>;
 return <div ref={root} className={city?'city-scene':'ecosystem-scene'} data-mode={runtime.ready?'3d':runtime.phase} data-load-state={runtime.phase}>
 {!runtime.ready&&poster}{webgl&&!runtime.error&&<div className={city?'city-canvas':'ecosystem-canvas'} style={{opacity:runtime.lost?0:1}}><Boundary key={runtime.generation} fallback={poster} onError={runtime.fail}><SceneResources.Provider value={runtime.scope}><Canvas dpr={quality==='lite'?.8:[1,1.3]} frameloop={!visible||!pageVisible||runtime.lost?'never':reduced?'demand':'always'} camera={{fov:42,near:.1,far:150}} gl={{antialias:false,powerPreference:'high-performance',alpha:false}}>
 <SceneLifecycle runtime={runtime}/><fog attach="fog" args={['#050B14',35,95]}/><Field city={city} onSlow={slow}/>{bloom&&quality==='full'&&<EffectComposer multisampling={0} enableNormalPass={false}><Bloom intensity={.65} luminanceThreshold={.75} luminanceSmoothing={.3} mipmapBlur/></EffectComposer>}<SceneFrameReady scope={runtime.scope} onReady={runtime.onRendered}/>
 </Canvas></SceneResources.Provider></Boundary></div>}
 {runtime.error?<div className="eco-fallback-note" role="status">{runtime.error}<button type="button" onClick={runtime.retry}>重试三维场景</button></div>:runtime.lost?<span className="eco-fallback-note" role="status">图形连接暂停 · 正在等待恢复</span>:!runtime.ready&&<span className="eco-fallback-note" role="status">正在初始化三维生态场景</span>}
 </div>;
}
