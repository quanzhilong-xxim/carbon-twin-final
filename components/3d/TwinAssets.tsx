'use client';
import { useGLTF } from '@/lib/three/scene-assets';
import {useEffect,useMemo,useRef,useState,type MutableRefObject} from 'react';
import { Detailed, Edges, Html } from '@react-three/drei';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {buildingPosition} from '@/lib/experience/CameraDirector';
import {useTwinStore} from '@/lib/experience/store';
import {CAPABILITIES} from '@/lib/experience/ExperienceMachine';
import {LANDMARKS,SPACES,spaceForBuilding} from '@/lib/experience/spaces';
import {buildingSize} from './CityLife';
import {CITY_BUILDING_COUNT} from '@/lib/experience/cityDistrict';

export const MODEL_BASE='/models/twin/';
export function useAsset(name:string){return useGLTF(`${MODEL_BASE}${name}.glb`,'/draco/');}
/** Own mutable geometry/materials; loader cache retains immutable source textures. */
export function useOwnedObject(source:THREE.Object3D,city=false){
 const object=useMemo(()=>{const clone=source.clone(true);clone.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry=o.geometry.clone();o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;const convert=(material:THREE.Material)=>{const local=material.clone() as THREE.MeshStandardMaterial;if(city&&local.isMeshStandardMaterial){local.metalness=.12;local.roughness=.64;local.envMapIntensity=.75;}return local;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);}});return clone;},[source,city]);
 useEffect(()=>()=>{object.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});},[object]);
 return object;
}
export function ExternalModel({name,scale=1,objectRef,nameOverride,...props}:{name:string;scale?:number;objectRef?:MutableRefObject<THREE.Group|null>;nameOverride?:string;position?:[number,number,number];rotation?:[number,number,number];onClick?:(event:ThreeEvent<MouseEvent>)=>void;onPointerOver?:(event:ThreeEvent<PointerEvent>)=>void;onPointerOut?:(event:ThreeEvent<PointerEvent>)=>void}){
 const {scene}=useAsset(name),object=useOwnedObject(scene);
 return <group name={nameOverride} ref={objectRef} scale={scale} {...props}><primitive object={object} dispose={null}/></group>;
}
const names=['building-skyscraper-a','building-skyscraper-b','building-skyscraper-c','building-skyscraper-d','building-skyscraper-e',...Array.from({length:14},(_,i)=>`building-${String.fromCharCode(97+i)}`)];
function Building({id,source,low}:{id:number;source:THREE.Object3D;low:THREE.Object3D}){
 const full=useOwnedObject(source,true),lite=useOwnedObject(low,true),root=useRef<THREE.Group>(null);
 const pos=buildingPosition(id),experience=useTwinStore(s=>s.experience),dispatch=useTwinStore(s=>s.dispatch),quality=useTwinStore(s=>s.quality);
 const size=useMemo(()=>{const b=new THREE.Box3().setFromObject(full);return b.getSize(new THREE.Vector3());},[full]);
 const [width,height,depth]=buildingSize(id),[hover,setHover]=useState(false),interactive=LANDMARKS.some(v=>v===id),space=SPACES[spaceForBuilding(id)];
 const lowSize=useMemo(()=>new THREE.Box3().setFromObject(lite).getSize(new THREE.Vector3()),[lite]);
 const materials=useMemo(()=>{const result:THREE.Material[]=[];[full,lite].forEach(object=>object.traverse(o=>{if(o instanceof THREE.Mesh)result.push(...(Array.isArray(o.material)?o.material:[o.material]));}));return result;},[full,lite]);
 useFrame((_,dt)=>{const hiding=experience.building===id&&['entering','viewing','room','inspecting','layout','scrolling'].includes(experience.state);const target=hiding?.015:1;for(const m of materials){if(Math.abs(m.opacity-target)<.001){if(!hiding&&m.transparent){m.opacity=1;m.transparent=false;m.depthWrite=true;m.needsUpdate=true;}continue;}if(!m.transparent){m.transparent=true;m.needsUpdate=true;}m.opacity=THREE.MathUtils.damp(m.opacity,target,5,Math.min(dt,.1));m.depthWrite=!hiding;}});
  return <group ref={root} position={pos} onPointerOver={e=>{if(interactive&&CAPABILITIES[experience.state].pickBuilding){e.stopPropagation();setHover(true);document.body.style.cursor='pointer';}}} onPointerOut={()=>{setHover(false);document.body.style.cursor='';}} onClick={e=>{if(interactive&&CAPABILITIES[experience.state].pickBuilding){e.stopPropagation();dispatch({type:'FOCUS',building:id});}}}>
  <Detailed distances={[0,quality==='high'?180:quality==='low'?110:145]} hysteresis={.12}><group scale={[width/size.x,height/size.y,depth/size.z]}><primitive object={full} dispose={null}/></group><group scale={[width/lowSize.x,height/lowSize.y,depth/lowSize.z]}><primitive object={lite} dispose={null}/></group></Detailed>
  {interactive&&<><mesh position={[0,height/2,0]}><boxGeometry args={[width+.08,height+.08,depth+.08]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/><Edges visible={hover} color="#a6d4b3"/></mesh><Html position={[0,height+1.8,0]} center zIndexRange={[8,0]}><button className="landmark-label" disabled={!CAPABILITIES[experience.state].pickBuilding} onClick={()=>dispatch({type:'FOCUS',building:id})}><small>{space.english}</small>{space.name} ↗</button></Html></>}
 </group>;
}
export function CityBuildings({landmarksOnly=false}:{landmarksOnly?:boolean}){
 const {scene}=useAsset('city');
 const children=useMemo(()=>new Map(scene.children.map(o=>[o.name,o])),[scene]);
 return <>{Array.from({length:CITY_BUILDING_COUNT},(_,id)=>{if(landmarksOnly&&!LANDMARKS.some(value=>value===id))return null;const name=id===0?'building-skyscraper-e':names[id%names.length],source=children.get(name);const low=children.get(`low-detail-building-${String.fromCharCode(97+id%14)}`);return source&&low?<Building key={id} id={id} source={source} low={low}/>:null;})}</>;
}
export function StreetFurniture(){
 const lamps=useRef<THREE.InstancedMesh>(null),matrix=useMemo(()=>new THREE.Object3D(),[]);
 useEffect(()=>{if(!lamps.current)return;for(let i=0;i<48;i++){const row=Math.floor(i/16),col=i%16;matrix.position.set((col-7.5)*7,1.4,-10-row*13);matrix.scale.set(.07,2.8,.07);matrix.updateMatrix();lamps.current.setMatrixAt(i,matrix.matrix);}lamps.current.instanceMatrix.needsUpdate=true;},[matrix]);
 return <instancedMesh ref={lamps} args={[undefined,undefined,48]}><cylinderGeometry args={[1,1,1,5]}/><meshStandardMaterial color="#47616b" metalness={.8} roughness={.35}/></instancedMesh>;
}
export function PhotographicFacade(){
 const {scene}=useAsset('facade'),source=useMemo(()=>{const g=new THREE.Group();for(const n of scene.children){if(!n.name.startsWith('wall_window')&&!n.name.startsWith('window_centered'))continue;const copy=n.clone(true),box=new THREE.Box3().setFromObject(copy),center=box.getCenter(new THREE.Vector3());copy.position.sub(center);g.add(copy);}return g;},[scene]);
 const owned=useOwnedObject(source),refs=useRef<THREE.InstancedMesh[]>([]),experience=useTwinStore(s=>s.experience);
 const meshes=useMemo(()=>{const list:THREE.Mesh[]=[];owned.traverse(o=>{if(o instanceof THREE.Mesh)list.push(o);});return list;},[owned]);
 useEffect(()=>{const temp=new THREE.Object3D();refs.current.forEach(mesh=>{for(let i=0;i<15;i++){temp.position.set((i%3-1)*2.65,1.6+Math.floor(i/3)*3,3.96);temp.scale.set(.87,.92,1);temp.updateMatrix();mesh.setMatrixAt(i,temp.matrix);}mesh.instanceMatrix.needsUpdate=true;});},[meshes]);
 const show=experience.building===0&&!['entering','viewing','room','layout','inspecting','scrolling'].includes(experience.state);
 return <group visible={show}>{meshes.map((mesh,i)=><instancedMesh key={mesh.uuid} ref={r=>{if(r)refs.current[i]=r;}} args={[mesh.geometry,mesh.material,15]} dispose={null} castShadow receiveShadow/>)}</group>;
}
