'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useStoryAtmosphere} from '@/lib/stores/StoryAtmosphere';
import {buildingPosition} from '@/lib/experience/CameraDirector';
import {buildingSize} from './CityLife';

/** Capture the authored district after each light change, never every frame.
 * Hide planar reflectors during capture to prevent recursive water renders. */
export function DistrictReflection(){
 const {gl,scene}=useThree(),time=useStoryAtmosphere(s=>s.time),weather=useStoryAtmosphere(s=>s.weather);
 const probe=useMemo(()=>{const target=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});const camera=new THREE.CubeCamera(.5,360,target);camera.position.set(0,12,-18);return{target,camera};},[]);
 const remaining=useRef(1.5),source=useRef<THREE.Texture|null>(null),captures=useRef(0);
 useEffect(()=>{remaining.current=1.5;},[time,weather]);
 useFrame((_,dt)=>{
  if(remaining.current<0||document.hidden)return;
  remaining.current-=Math.min(dt,.1);if(remaining.current>0)return;remaining.current=-1;
  if(scene.environment!==probe.target.texture)source.current=scene.environment;scene.environment=source.current;
  const hidden:THREE.Object3D[]=[];
  scene.traverse(object=>{if(object.visible&&(object as THREE.Object3D&{isReflector?:boolean}).isReflector){hidden.push(object);object.visible=false;}});
  const previousTarget=gl.getRenderTarget(),previousXr=gl.xr.enabled;
  try{gl.xr.enabled=false;probe.camera.update(gl,scene);scene.environment=probe.target.texture;gl.domElement.dataset.districtReflection='live-cube-128';gl.domElement.dataset.reflectionCaptures=String(++captures.current);}
  finally{hidden.forEach(object=>{object.visible=true;});gl.xr.enabled=previousXr;gl.setRenderTarget(previousTarget);}
 });
 useEffect(()=>()=>{if(scene.environment===probe.target.texture)scene.environment=source.current;probe.target.dispose();delete gl.domElement.dataset.districtReflection;delete gl.domElement.dataset.reflectionCaptures;},[gl,scene,probe]);
 return null;
}

/** One instanced draw grounds buildings in the balanced/mobile render path. */
export function DistrictContactShadows(){
 const mesh=useRef<THREE.InstancedMesh>(null);
 const texture=useMemo(()=>{const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const d=Math.max(Math.abs((x+.5)/size*2-1),Math.abs((y+.5)/size*2-1)),index=(y*size+x)*4;data[index]=12;data[index+1]=20;data[index+2]=22;data[index+3]=Math.round((1-THREE.MathUtils.smoothstep(d,.5,1))*100);}const map=new THREE.DataTexture(data,size,size);map.needsUpdate=true;return map;},[]);
 useEffect(()=>{const object=new THREE.Object3D();for(let id=0;id<25;id++){const[x,,z]=buildingPosition(id),[w,,d]=buildingSize(id);object.position.set(x,.015,z);object.rotation.x=-Math.PI/2;object.scale.set(w+5,d+5,1);object.updateMatrix();mesh.current?.setMatrixAt(id,object.matrix);}if(mesh.current){mesh.current.instanceMatrix.needsUpdate=true;mesh.current.computeBoundingSphere();}return()=>texture.dispose();},[texture]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,25]} renderOrder={1}><planeGeometry/><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false}/></instancedMesh>;
}
