'use client';
import { Environment, useGLTF } from '@/lib/three/scene-assets';
import Link from 'next/link';
import { Suspense, useEffect,useMemo,useRef,useState } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import SceneStage, { type SceneMode } from './SceneStage';
import CityDustFallback from './CityDustFallback';
import { storyTarget, dustVertex, dustFragment } from '@/lib/visuals/cityDust';
import { FormationTree, FormationTreeDiagram } from './FormationNature';
import { buildingPosition } from '@/lib/experience/CameraDirector';
import { buildingSize } from './CityLife';
import { visualDynamics } from '@/lib/visualDynamics';
import { useUIStore } from '@/lib/stores/UIStore';
import ExplorePlaces from './ExplorePlaces';
import ExploreStaticBatch from './ExploreStaticBatch';
import UrbanGroundcover from './UrbanGroundcover';
import CoastalArchitecture from './CoastalArchitecture';
import CoastalLandscape from './CoastalLandscape';
import CoastalAtmosphere from './CoastalAtmosphere';
import CoastalCitizens from './CoastalCitizens';
import { sampleActualSurfaces } from '@/lib/visuals/coastalGeometry';
import { installSurfaceReveal } from '@/lib/visuals/surfaceReveal';

type CityTime='morning'|'day'|'dusk'|'night';
const timeLabels:Record<CityTime,string>={morning:'晨光',day:'白天',dusk:'黄昏',night:'夜晚'};
const cityLight:Record<CityTime,{sky:string;ground:string;fill:number;sun:string;intensity:number;position:[number,number,number]}>={
 morning:{sky:'#e6efdb',ground:'#6d8770',fill:1.65,sun:'#f2d7a6',intensity:2.8,position:[16,9,-12]},
 day:{sky:'#e2f2ee',ground:'#7b9680',fill:1.9,sun:'#f2f6e9',intensity:3.2,position:[8,28,12]},
 dusk:{sky:'#b8c9cc',ground:'#867653',fill:1.7,sun:'#ffd19c',intensity:3.2,position:[14,8,-12]},
 night:{sky:'#688fa7',ground:'#304c42',fill:.85,sun:'#a4c7df',intensity:.6,position:[10,18,-8]},
};
const buildingTypes=['退台庭院','圆弧研究塔','错层住宅','公共大厅','分节办公','花园街坊','生态科研塔'] as const;
const retainedBuildings:Record<number,string>={0:'春笋 · 斜网格塔',6:'光之塔 · 光庭',9:'云旋 · 幕墙塔',18:'潮汐之门',21:'时序 · 退台塔'};
const buildingName=(id:number)=>retainedBuildings[id]??buildingTypes[id%buildingTypes.length];
function makeGroundTexture(){
 const size=128,data=new Uint8Array(size*size*4),randomValues=new Float32Array(64*64);let seed=0x51a7;
 for(let i=0;i<randomValues.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;randomValues[i]=seed/4294967296;}
 const noise=(u:number,v:number,cells:number)=>{
  const x=u*cells,y=v*cells,x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;
  const smooth=(value:number)=>value*value*(3-2*value),sx=smooth(tx),sy=smooth(ty);
  const at=(column:number,row:number)=>randomValues[((row%cells+cells)%cells)*64+(column%cells+cells)%cells];
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(x0,y0),at(x0+1,y0),sx),THREE.MathUtils.lerp(at(x0,y0+1),at(x0+1,y0+1),sx),sy);
 };
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,broad=noise(u,v,4)-.5,middle=noise(u,v,12)-.5,grain=noise(u,v,32)-.5;
  const value=Math.max(145,Math.min(244,200+broad*66+middle*35+grain*22)),index=(y*size+x)*4;
  data[index]=value+2;data[index+1]=value;data[index+2]=value-5;data[index+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(11,9);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 return texture;
}
const journey = [
 {key:'dust',number:'01',title:'微尘',progress:0,description:'从尚未相连的线索开始，观察选择如何汇聚。'},
 {key:'tree',number:'02',title:'树木',progress:.22,description:'先有一株树：枝干与叶片逐渐成形，让自然成为空间的起点。'},
 {key:'site',number:'03',title:'场地',progress:.42,description:'土壤、草地、花坛与公共铺装，逐渐连接成完整的城市地面。'},
 {key:'street',number:'04',title:'道路',progress:.58,description:'路面、人行道与标线出现，绿荫沿街延伸，交通开始有序。'},
 {key:'building',number:'05',title:'建筑',progress:.88,description:'粒子汇聚成保留地标，连接退台社区、玻璃研究塔与临街公共大厅。'},
 {key:'activate',number:'06',title:'城市生活',progress:1,description:'车辆行进、街灯亮起，公共空间开始被真实使用。'},
] as const;
const journeyIndex=(p:number)=>p<.1?0:p<.31?1:p<.49?2:p<.68?3:p<.95?4:5;

function FormationVehicle({file,offset,lane,road}:{file:'sedan'|'taxi'|'bus';offset:number;lane:number;road:number}){
 const {scene}=useGLTF(`/models/city-studies/vehicle-${file}.glb`);
 const model=useMemo(()=>scene.clone(true),[scene]),group=useRef<THREE.Group>(null);
 useEffect(()=>{model.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true;}});},[model]);
 useFrame(({clock})=>{if(!group.current)return;const distance=(clock.elapsedTime*1.6+offset)%48-24;group.current.position.set(lane>0?distance:-distance,.08,-11.5-road*13);group.current.rotation.y=lane>0?Math.PI/2:-Math.PI/2;});
 return <group ref={group} scale={1}><primitive object={model} dispose={null}/></group>;
}

function CityInfrastructure({time,compact=false}:{time:CityTime;compact?:boolean}){
 const poles=useRef<THREE.InstancedMesh>(null),heads=useRef<THREE.InstancedMesh>(null),lamps=useRef<THREE.InstancedMesh>(null),dummy=useMemo(()=>new THREE.Object3D(),[]);
 const lampCount=compact?10:12;
 useEffect(()=>{for(let i=0;i<lampCount;i++){const row=Math.floor(i/6),col=i%6,x=col*18-45,z=-11.5-row*26+3.35;dummy.position.set(x,1.45,z);dummy.scale.set(1,1,1);dummy.updateMatrix();poles.current?.setMatrixAt(i,dummy.matrix);dummy.position.set(x+.13,2.86,z);dummy.scale.set(1,1,1);dummy.updateMatrix();heads.current?.setMatrixAt(i,dummy.matrix);dummy.position.set(x+.13,2.76,z);dummy.scale.set(1,1,1);dummy.updateMatrix();lamps.current?.setMatrixAt(i,dummy.matrix);}for(const mesh of [poles.current,heads.current,lamps.current])if(mesh)mesh.instanceMatrix.needsUpdate=true;},[dummy,lampCount]);
 const lampColor=time==='night'?'#f8d18c':time==='dusk'?'#e8bd78':'#809a9c';
 return <group>
  <instancedMesh ref={poles} args={[undefined,undefined,lampCount]}><cylinderGeometry args={[.035,.055,2.9,8]}/><meshStandardMaterial color="#4e6563" metalness={.65} roughness={.38}/></instancedMesh><instancedMesh ref={heads} args={[undefined,undefined,lampCount]}><boxGeometry args={[.48,.1,.16]}/><meshStandardMaterial color="#71817b" metalness={.45} roughness={.42}/></instancedMesh><instancedMesh ref={lamps} args={[undefined,undefined,lampCount]}><boxGeometry args={[.25,.07,.12]}/><meshStandardMaterial color={lampColor} emissive={lampColor} emissiveIntensity={time==='night'?1.8:.12}/></instancedMesh>
  <mesh position={[30,.08,-41]}><boxGeometry args={[7,.18,2.8]}/><meshStandardMaterial color="#415c61" metalness={.25} roughness={.7}/></mesh><mesh position={[30,.38,-41]}><boxGeometry args={[6.1,.42,1.9]}/><meshStandardMaterial color="#8aa29a" roughness={.5}/></mesh><mesh position={[30,.61,-41]}><boxGeometry args={[5.5,.06,1.5]}/><meshStandardMaterial color="#d8c38d" emissive="#d8c38d" emissiveIntensity={time==='night'?1.2:.1}/></mesh>
 </group>;
}

export function InstancedUrbanTrees({compact,park=false}:{compact:boolean;park?:boolean}){
 const {scene}=useGLTF('/models/urban-vegetation/CT_ParkTree_StreetLite_v3.glb');
 const instances=useRef<(THREE.InstancedMesh|null)[]>([]),windTransform=useMemo(()=>new THREE.Object3D(),[]);
 const placements=useMemo(()=>park?Array.from({length:5},(_,index)=>({x:-53+index*11,z:1+Math.sin(index*2)*1.4,scale:.53+(index%3)*.04,rotation:index*2.39996})):Array.from({length:(compact?2:7)*4},(_,index)=>{
  const row=Math.floor(index/4),column=index%4,z=-11.5-row*13;
  return {x:-45+column*30,z:z+3.75,scale:.60+(index%4)*.035,rotation:index*2.39996};
 }),[compact,park]);
 const parts=useMemo(()=>{
  scene.updateMatrixWorld(true);
  const output:{geometry:THREE.BufferGeometry;material:THREE.Material|THREE.Material[]}[]=[];
  scene.traverse(object=>{
   if(!(object instanceof THREE.Mesh))return;
   const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld),sources=Array.isArray(object.material)?object.material:[object.material];
   const materials=sources.map(source=>{
    const material=new THREE.MeshStandardMaterial().copy(source as THREE.MeshStandardMaterial);
    if(material.name.includes('leaves')){
     material.alphaTest=.25;material.transparent=false;material.color.set('#c4d6a8');material.roughness=.79;material.metalness=0;material.envMapIntensity=.4;material.side=THREE.DoubleSide;
    }
    if(!material.name.includes('leaves'))material.roughness=.95;
    return material;
   });
   output.push({geometry,material:Array.isArray(object.material)?materials:materials[0]});
  });
  return output;
 },[scene]);
 useEffect(()=>()=>parts.forEach(({geometry,material})=>{
  geometry.dispose();
  for(const item of Array.isArray(material)?material:[material])item.dispose();
 }),[parts]);
 useEffect(()=>{
  const object=new THREE.Object3D();
  placements.forEach((tree,index)=>{
   object.position.set(tree.x,.03,tree.z);object.rotation.set(0,tree.rotation,0);object.scale.setScalar(tree.scale);object.updateMatrix();
   instances.current.forEach(mesh=>mesh?.setMatrixAt(index,object.matrix));
  });
  instances.current.forEach(mesh=>{if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}});
 },[parts,placements]);
 useFrame(({clock})=>{
  placements.forEach((tree,index)=>{
   const phase=clock.elapsedTime*.8+tree.x*.08+tree.z*.07;
   windTransform.position.set(tree.x,.03,tree.z);windTransform.scale.setScalar(tree.scale);
   windTransform.rotation.set(Math.sin(phase)*.004,tree.rotation,Math.cos(phase*.8)*.005);
   windTransform.updateMatrix();instances.current.forEach(mesh=>mesh?.setMatrixAt(index,windTransform.matrix));
  });
  instances.current.forEach(mesh=>{if(mesh)mesh.instanceMatrix.needsUpdate=true;});
 });
 return <group>{parts.map((part,index)=><instancedMesh key={index} ref={mesh=>{instances.current[index]=mesh;}} args={[part.geometry,part.material,placements.length]} receiveShadow />)}</group>;
}

function ExploreStreetDetails({compact=false,groundColor='#142b2e',roadColor='#263638',progress}:{compact?:boolean;groundColor?:string;roadColor?:string;progress:React.MutableRefObject<number>}){
 const roadLayer=useRef<THREE.Group>(null),treeLayer=useRef<THREE.Group>(null);
 const [roadData,setRoadData]=useState<THREE.BufferGeometry|null>(null);
 const roadUniforms=useMemo(()=>({uProgress:{value:0},uTime:{value:0},uDpr:{value:1},uOpacity:{value:1}}),[]);
 const roadReveal=useMemo(()=>({value:0}),[]);
 useEffect(()=>{
  const materials=new Set<THREE.Material>();roadLayer.current?.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
  const restore=[...materials].map(m=>installSurfaceReveal(m,roadReveal));return()=>restore.forEach(fn=>fn());
 },[roadReveal]);
 useFrame(({clock,gl})=>{
  const p=progress.current,opacity=THREE.MathUtils.smoothstep(p,.50,.66);
  roadUniforms.uProgress.value=THREE.MathUtils.clamp((p-.31)/.36,0,1);roadUniforms.uTime.value=clock.elapsedTime;roadUniforms.uDpr.value=gl.getPixelRatio();roadUniforms.uOpacity.value=THREE.MathUtils.smoothstep(p,.34,.43);gl.domElement.dataset.roadSurfaceSamples=roadData?'3000':'0';
  roadReveal.value=opacity;if(roadLayer.current)roadLayer.current.visible=opacity>.001;
  if(treeLayer.current)treeLayer.current.visible=p>.57;
 });
 const roads=useRef<THREE.InstancedMesh>(null),sidewalks=useRef<THREE.InstancedMesh>(null),curbs=useRef<THREE.InstancedMesh>(null),markings=useRef<THREE.InstancedMesh>(null),crossings=useRef<THREE.InstancedMesh>(null),planters=useRef<THREE.InstancedMesh>(null),dummy=useMemo(()=>new THREE.Object3D(),[]);
 const groundMaterial=useMemo(()=>{const texture=makeGroundTexture();return new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.12,roughness:.96});},[]);
 useEffect(()=>{groundMaterial.color.set(groundColor);},[groundColor,groundMaterial]);
 const rowCount=compact?4:7,roadCount=rowCount+1,sidewalkCount=rowCount*2+2,curbCount=sidewalkCount,markCount=rowCount*16+8,crossingCount=rowCount*7,treeRows=rowCount,treeCount=treeRows*4;
 useEffect(()=>()=>{groundMaterial.map?.dispose();groundMaterial.dispose();},[groundMaterial]);
 useEffect(()=>{
  const set=(mesh:THREE.InstancedMesh|null,index:number,position:[number,number,number],scale:[number,number,number],rotation:[number,number,number]=[0,0,0])=>{if(!mesh)return;dummy.position.set(...position);dummy.scale.set(...scale);dummy.rotation.set(...rotation);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);};
  for(let row=0;row<rowCount;row++){
   const z=-11.5-row*13;set(roads.current,row,[0,0,z],[110,5.2,1],[-Math.PI/2,0,0]);
   for(const side of [-1,1]){const n=row*2+(side>0?1:0);set(sidewalks.current,n,[0,.012,z+side*3.15],[110,1.25,1],[-Math.PI/2,0,0]);set(curbs.current,n,[0,.08,z+side*2.72],[110,.16,.24]);}
   for(let col=0;col<8;col++)for(const lane of [-1,1])set(markings.current,row*16+col*2+(lane>0?1:0),[-49+col*14,.035,z+lane*.9],[2.1,.025,.09]);
   for(let bar=0;bar<7;bar++)set(crossings.current,row*7+bar,[-2.15+bar*.72,.04,z],[.38,.026,4.25]);
   if(row<treeRows)for(let col=0;col<4;col++){const index=row*4+col,x=-45+col*30;set(planters.current,index,[x,.045,z+3.75],[2.4,1.7,.08],[-Math.PI/2,0,0]);}
  }
  set(roads.current,rowCount,[0,0,-28],[5.2,58,1],[-Math.PI/2,0,0]);
  for(const side of [-1,1]){const n=rowCount*2+(side>0?1:0);set(sidewalks.current,n,[side*3.15,.012,-28],[1.25,58,1],[-Math.PI/2,0,0]);set(curbs.current,n,[side*2.72,.08,-28],[.24,.16,58]);}
  for(let row=0;row<8;row++)set(markings.current,rowCount*16+row,[0,.035,-4-row*7],[.09,.025,2.1]);
  for(const mesh of [roads.current,sidewalks.current,curbs.current,markings.current,crossings.current,planters.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  // Copy the actual instance transforms after filling them. Their buffers are
  // sampled here, so changing road placement also changes the particle targets.
  const sampleGroup=new THREE.Group(),matrix=new THREE.Matrix4();
  for(const source of [roads.current,sidewalks.current])if(source)for(let i=0;i<source.count;i++){source.getMatrixAt(i,matrix);sampleGroup.add(new THREE.Mesh(source.geometry.clone().applyMatrix4(matrix)));}
  const data=sampleActualSurfaces(sampleGroup,3000,52),g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(data.targets,3));g.setAttribute('aDust',new THREE.BufferAttribute(data.origins,3));g.setAttribute('aFlow',new THREE.BufferAttribute(data.origins.map((v,i)=>i%3===1?v*.12+3:v),3));g.setAttribute('aSeed',new THREE.BufferAttribute(data.seeds,1));
  sampleGroup.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});
  setRoadData(g);return()=>g.dispose();
 },[dummy,treeRows,rowCount]);
 return <group>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.05,-24]} receiveShadow><planeGeometry args={[132,60]}/><primitive object={groundMaterial} attach="material"/></mesh>
  <group ref={roadLayer}><instancedMesh ref={roads} args={[undefined,undefined,roadCount]}><planeGeometry args={[1,1]}/><meshStandardMaterial color={roadColor} roughness={.92}/></instancedMesh>
  <instancedMesh ref={sidewalks} args={[undefined,undefined,sidewalkCount]}><planeGeometry args={[1,1]}/><meshStandardMaterial color="#7a8070" roughness={.88}/></instancedMesh><instancedMesh ref={curbs} args={[undefined,undefined,curbCount]}><boxGeometry/><meshStandardMaterial color="#bec0ae" roughness={.82}/></instancedMesh>
  <instancedMesh ref={markings} args={[undefined,undefined,markCount]}><boxGeometry/><meshStandardMaterial color="#ddcf9e" roughness={.84}/></instancedMesh><instancedMesh ref={crossings} args={[undefined,undefined,crossingCount]}><boxGeometry/><meshStandardMaterial color="#dfd9c4" roughness={.82}/></instancedMesh>
  <instancedMesh ref={planters} args={[undefined,undefined,treeCount]}><planeGeometry args={[1,1]}/><meshStandardMaterial color="#405f42" roughness={.95}/></instancedMesh></group><group ref={treeLayer}><InstancedUrbanTrees compact={compact}/></group>
  {roadData&&<points geometry={roadData} frustumCulled={false} dispose={null}><shaderMaterial uniforms={roadUniforms} vertexShader={dustVertex} fragmentShader={dustFragment} transparent depthWrite={false}/></points>}
  <BasketballCourt/><CommunityField/><ConstructionSite/>
 </group>;
}

function BasketballCourt(){return <group position={[-43,.018,1]}><mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[17,10]}/><meshStandardMaterial color="#526f61" roughness={.82}/></mesh>{[[0,0,17,.11],[0,-4.9,17,.11],[0,4.9,17,.11],[-8.4,0,.11,10],[8.4,0,.11,10],[0,0,.1,9],[-5.1,0,.1,3.2],[5.1,0,.1,3.2]].map(([x,z,w,d],i)=><mesh key={i} position={[x,.03,z]}><boxGeometry args={[w,.018,d]}/><meshStandardMaterial color="#d8cfac" roughness={.7}/></mesh>)}{[-7.6,7.6].map(x=><group key={x} position={[x,.1,0]}><mesh><cylinderGeometry args={[.07,.09,2.1,8]}/><meshStandardMaterial color="#d3d1c4" metalness={.45} roughness={.45}/></mesh><mesh position={[x>0?-1.05:1.05,1.1,0]}><boxGeometry args={[1.8,.08,.08]}/><meshStandardMaterial color="#d3d1c4"/></mesh><mesh position={[x>0?-1.8:1.8,1.1,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.28,.035,6,16]}/><meshStandardMaterial color="#d3d1c4"/></mesh></group>)}</group>}

function CommunityField(){return <group position={[-1,.012,-78]}><mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[24,14]}/><meshStandardMaterial color="#41634b" roughness={.96}/></mesh>{[[0,0,24,.09],[0,-6.8,24,.09],[0,6.8,24,.09],[-11.95,0,.09,13.6],[11.95,0,.09,13.6],[0,0,.08,13.6],[-11.95,0,.08,2.7],[11.95,0,.08,2.7]].map(([x,z,w,d],i)=><mesh key={i} position={[x,.02,z]}><boxGeometry args={[w,.012,d]}/><meshStandardMaterial color="#c4d0ad" roughness={.75}/></mesh>)}</group>}

function ConstructionSite(){return <group position={[42,.025,1]}><mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[15,12]}/><meshStandardMaterial color="#836847" roughness={1}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[-2,.035,1]}><planeGeometry args={[8,6]}/><meshStandardMaterial color="#9b7947" roughness={1}/></mesh>{Array.from({length:6},(_,i)=><mesh key={i} position={[-7.2+i*2.85,.45,-5.65]}><boxGeometry args={[2.55,.76,.12]}/><meshStandardMaterial color={i%2?'#d5ad61':'#343b35'} roughness={.8}/></mesh>)}<group position={[0,.05,0]}><mesh position={[0,.48,0]}><boxGeometry args={[2.8,.72,1.15]}/><meshStandardMaterial color="#d2a443" metalness={.18} roughness={.68}/></mesh><mesh position={[.25,1.02,0]}><boxGeometry args={[1.15,.85,1.03]}/><meshStandardMaterial color="#607a70" metalness={.15} roughness={.4}/></mesh><mesh position={[-1.48,.17,0]}><boxGeometry args={[.28,.36,1.4]}/><meshStandardMaterial color="#414642" roughness={.94}/></mesh><mesh position={[1.48,.17,0]}><boxGeometry args={[.28,.36,1.4]}/><meshStandardMaterial color="#414642" roughness={.94}/></mesh><mesh position={[-1.5,1.05,0]} rotation={[0,0,-.78]}><boxGeometry args={[.24,2.2,.28]}/><meshStandardMaterial color="#c3933c" metalness={.15} roughness={.7}/></mesh><mesh position={[-2.3,1.72,0]} rotation={[0,0,.55]}><boxGeometry args={[.2,1.65,.24]}/><meshStandardMaterial color="#c3933c" metalness={.15} roughness={.7}/></mesh><mesh position={[-2.95,1.95,0]}><boxGeometry args={[.45,.24,.55]}/><meshStandardMaterial color="#47463d" roughness={.9}/></mesh></group></group>}

export function StreetDetails({compact=false,groundColor='#142b2e',roadColor='#263638'}:{compact?:boolean;groundColor?:string;roadColor?:string}){
 const stripes=useRef<THREE.InstancedMesh>(null),trees=useRef<THREE.InstancedMesh>(null),trunks=useRef<THREE.InstancedMesh>(null),roads=useRef<THREE.InstancedMesh>(null);
 const count=compact?28:60;
 useEffect(()=>{const o=new THREE.Object3D();for(let i=0;i<count;i++){const row=Math.floor(i/14),col=i%14;o.position.set(col*7-46,.035,-11.5-row*13);o.scale.set(2.2,.02,.12);o.rotation.set(0,0,0);o.updateMatrix();stripes.current?.setMatrixAt(i,o.matrix);o.position.set(col*7-46,2.7,-8-row*13);o.scale.set(1.7,2.2,1.7);o.updateMatrix();trees.current?.setMatrixAt(i,o.matrix);o.position.y=1.15;o.scale.set(.18,2.4,.18);o.updateMatrix();trunks.current?.setMatrixAt(i,o.matrix);}for(let row=0;row<(compact?3:7);row++){o.position.set(0,0,-11.5-row*13);o.rotation.set(-Math.PI/2,0,0);o.scale.set(110,4.1,1);o.updateMatrix();roads.current?.setMatrixAt(row,o.matrix);}for(const m of [stripes.current,trees.current,trunks.current,roads.current])if(m)m.instanceMatrix.needsUpdate=true;},[count,compact]);
 return <group><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.05,-30]} receiveShadow><planeGeometry args={[115,110]}/><meshStandardMaterial color={groundColor} roughness={.94}/></mesh><instancedMesh ref={roads} args={[undefined,undefined,compact?3:7]}><planeGeometry args={[1,1]}/><meshStandardMaterial color={roadColor} roughness={.96}/></instancedMesh><instancedMesh ref={stripes} args={[undefined,undefined,count]}><boxGeometry/><meshStandardMaterial color="#c3bda0" roughness={.9}/></instancedMesh><instancedMesh ref={trees} args={[undefined,undefined,count]}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color="#3b745b" roughness={.92}/></instancedMesh><instancedMesh ref={trunks} args={[undefined,undefined,count]}><cylinderGeometry args={[1,1,1,5]}/><meshStandardMaterial color="#726555" roughness={1}/></instancedMesh></group>;
}
const cityBlocks = Array.from({length:25},(_,id)=>({id,p:buildingPosition(id),s:buildingSize(id),type:id%buildingTypes.length}));
function FormationCamera({progress,manual,enabled}:{progress:React.MutableRefObject<number>;manual:boolean;enabled:boolean}){
 const {camera,controls,size}=useThree();
 useEffect(()=>{if(camera instanceof THREE.PerspectiveCamera&&size.width>1000){camera.setViewOffset(size.width,size.height,-size.width*.19,0,size.width,size.height);return()=>{camera.clearViewOffset();};}},[camera,size.width,size.height]);
 const initialized=useRef(false);
 const far=useMemo(()=>new THREE.Vector3(12.1,1.2,13.4),[]),near=useMemo(()=>new THREE.Vector3(10.5,1.3,10.4),[]),target=useMemo(()=>new THREE.Vector3(),[]);
 useFrame((_,dt)=>{
  if(enabled&&initialized.current)return;
  const city=THREE.MathUtils.smoothstep(progress.current,.28,.56),desired=near.clone().lerp(far,city);
  target.set(8.72,-.05,6.12).lerp(new THREE.Vector3(4.8,-.05,.7),city);
  camera.position.lerp(desired,1-Math.exp(-Math.min(dt,.1)*4));
  const orbit=controls as unknown as {target:THREE.Vector3;update:()=>void}|undefined;
  if(orbit){orbit.target.lerp(target,.15);orbit.update();}else camera.lookAt(target);
  // Finish the camera's easing before handing control to the visitor. Previously
  // a seek to the last chapter froze it halfway between the tree and city views.
  if(manual&&progress.current>.996&&camera.position.distanceTo(desired)<.025&&(!orbit||orbit.target.distanceTo(target)<.025))initialized.current=true;
  else initialized.current=false;
 });return null;
}
function District({progress,manual,onProgress,time,theme,selected,onSelect,onReady}:{progress:React.MutableRefObject<number>;manual:boolean;onProgress:(value:number)=>void;time:CityTime;theme:number;selected:number|null;onSelect:(id:number)=>void;onReady:(ready:boolean)=>void}) {
 // Resolve the existing assets at one boundary. Otherwise the preparation
 // effect can finish while a nested Suspense still has no model to compile.
 useGLTF(['/models/urban-vegetation/CT_ParkTree_Hero_v4.glb','/models/urban-vegetation/CT_ParkTree_StreetLite_v3.glb','/models/characters-v10/CT_Citizen_Rain_LOD_v1.glb','/models/city-studies/vehicle-sedan.glb','/models/city-studies/vehicle-taxi.glb','/models/city-studies/vehicle-bus.glb','/models/city-studies/b01-diagrid-lod.glb','/models/city-studies/b02-spiral-lod.glb','/models/city-studies/b03-deco-lod.glb','/models/citylight/v12/light-court-lod.glb','/models/citylight/v11/tide-gate-a-lod.glb']);
 const reduced=useUIStore(s=>s.reduced),{gl,scene,camera}=useThree();
 const current=useRef(0),reported=useRef(-1),street=useRef<THREE.Group>(null),traffic=useRef<THREE.Group>(null),selectionRing=useRef<THREE.Mesh>(null);
 const streetReveal=useMemo(()=>({value:0}),[]);
 const streetPrepared=useRef(false);
 useEffect(()=>{const materials=new Set<THREE.Material>();street.current?.traverse(o=>{if(o instanceof THREE.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material])materials.add(material);});const restore=[...materials].map(m=>installSurfaceReveal(m,streetReveal));return()=>restore.forEach(fn=>fn());},[theme,streetReveal]);
 useEffect(()=>{
  let active=true;streetPrepared.current=false;onReady(false);gl.domElement.dataset.cityPrepared='compiling';
  // Let the real renderer choose variants with the current environment and
  // instance attributes. Precompiling every hidden stage here produced invalid
  // D3D11 programs on this browser/driver combination.
  const prepare=async()=>{
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   if(!active||!street.current)return;
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   if(active){streetPrepared.current=true;gl.domElement.dataset.cityPrepared='true';onReady(true);}
  };
  void prepare().catch(()=>{if(active){streetPrepared.current=true;gl.domElement.dataset.cityPrepared='failed';}});
  return()=>{active=false;};
 },[gl,scene,camera,theme,time,onReady]);
 useFrame((_,dt)=>{
  const target=storyTarget(manual,progress.current,reduced,visualDynamics.scroll);
  const readyTarget=streetPrepared.current?target:Math.min(target,.08);
  current.current=reduced?readyTarget:THREE.MathUtils.damp(current.current,readyTarget,7,Math.min(dt,.1));const p=current.current;
  const opacity=THREE.MathUtils.smoothstep(p,.30,.52);
  if(traffic.current)traffic.current.visible=p>.92;
  streetReveal.value=opacity;if(street.current)street.current.visible=opacity>.001;
  if(selectionRing.current){selectionRing.current.visible=selected!==null&&p>.9;if(selected!==null){const b=cityBlocks[selected];selectionRing.current.position.set(b.p[0],.2,b.p[2]);}}
  const el=gl.domElement;el.dataset.cityProgress=p.toFixed(3);el.dataset.cityTarget=target.toFixed(3);el.dataset.cityManual=String(manual);el.dataset.cityScroll=visualDynamics.scroll.toFixed(3);el.dataset.cityBuildings='25';el.dataset.cityTypes='7';el.dataset.rendered='true';el.dataset.drawCalls=String(gl.info.render.calls);el.dataset.triangles=String(gl.info.render.triangles);el.dataset.cityFrame=String(gl.info.render.frame);el.dataset.cityStage=journey[journeyIndex(p)].key;el.dataset.cityTreeVisible=String(p>.1);
  const rounded=Math.round(p*100)/100;if(rounded!==reported.current){reported.current=rounded;onProgress(rounded);}
 });
 return <>
  <Suspense fallback={null}><Environment files="/environments/citylight/kloppenheim_06_puresky_1k.hdr" environmentIntensity={time==='dusk'?.5:time==='night'?.18:.7}/><CoastalAtmosphere night={time==='night'} dusk={time==='dusk'}/></Suspense>
  <hemisphereLight color={cityLight[time].sky} groundColor={cityLight[time].ground} intensity={time==='night'?.22:.35}/>
  <ambientLight intensity={time==='night'?.07:.08} color="#d9e7d2"/>
  <directionalLight castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-normalBias={.012} shadow-bias={-.00015} position={cityLight[time].position} intensity={cityLight[time].intensity} color={cityLight[time].sun}/>
  <group position={[4.8,-1.5,5]} scale={.14}>
   <Suspense fallback={null}><FormationTree progress={current} night={time==='night'}/><CoastalArchitecture progress={current} onSelect={onSelect}/><CoastalCitizens progress={current}/></Suspense>
   <group ref={street} visible={false}><ExploreStaticBatch key={theme} revision={time}><CoastalLandscape/><CityInfrastructure time={time}/><ExploreStreetDetails progress={current} compact groundColor={time==='night'?'#28382b':'#747b58'} roadColor="#343e3b"/><UrbanGroundcover/><ExplorePlaces theme={theme}/></ExploreStaticBatch><Suspense fallback={null}><InstancedUrbanTrees compact park/><group ref={traffic} visible={false}><FormationVehicle file="sedan" offset={6} lane={1} road={0}/><FormationVehicle file="taxi" offset={30} lane={-1} road={1}/><FormationVehicle file="bus" offset={17} lane={1} road={2}/></group></Suspense></group>
   <mesh ref={selectionRing} visible={false} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[5.8,6.1,48]}/><meshBasicMaterial color="#d4e8a1" transparent opacity={.8}/></mesh>
  </group>
  <FormationCamera progress={current} manual={manual} enabled={current.current>.96&&manual}/>
  <OrbitControls makeDefault enabled={current.current>.96&&manual} enableZoom={current.current>.96&&manual} enablePan={false} minDistance={4} maxDistance={32} minPolarAngle={.4} maxPolarAngle={1.56} target={[0,0,1]}/>
 </>;
}
export default function CityFormation({onStatusChange}:{onStatusChange?:(status:'loading'|'ready'|'fallback')=>void}) {
 const reduced=useUIStore(s=>s.reduced);
 const [progress,setProgress]=useState(1),[manual,setManual]=useState(false),[shown,setShown]=useState(0),[time,setTime]=useState<CityTime>('dusk'),[playing,setPlaying]=useState(false),[selected,setSelected]=useState<number|null>(null);
 const [theme,setTheme]=useState(0);
 const [sceneMode,setSceneMode]=useState<SceneMode>('offscreen');
 const [prepared,setPrepared]=useState(false);
 const status=['error-fallback','context-lost','lite'].includes(sceneMode)?'fallback':sceneMode==='3d'&&prepared?'ready':'loading';
 useEffect(()=>{onStatusChange?.(status);},[onStatusChange,status]);
 const root=useRef<HTMLDivElement>(null),progressRef=useRef(1);
 useEffect(()=>{if(reduced)setPlaying(false);},[reduced]);
 useEffect(()=>{
  if(!playing||reduced)return;let frame=0,last=0,inView=true,elapsed=0;const start=progressRef.current;
  // Keep the timeline local to this playback. A delayed React effect must not
  // overwrite the next animation frame with an older committed progress value.
  const tick=(now:number)=>{frame=0;if(document.hidden||!inView){last=0;return;}const dt=last?Math.max(0,(now-last)/1000):0;last=now;elapsed+=dt;const next=Math.min(1,start+elapsed/18);progressRef.current=next;if(root.current)root.current.dataset.playbackElapsed=elapsed.toFixed(3);if(next<1)frame=requestAnimationFrame(tick);else{setProgress(1);setPlaying(false);}};
  const wake=()=>{cancelAnimationFrame(frame);last=0;if(!document.hidden&&inView)frame=requestAnimationFrame(tick);};
  const observer=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;wake();});if(root.current)observer.observe(root.current);document.addEventListener('visibilitychange',wake);wake();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',wake);};
 },[playing,reduced]);
 const seek=(p:number)=>{setManual(true);setPlaying(false);setProgress(p);progressRef.current=p;};
 useEffect(()=>{
  const onJourney=(event:Event)=>{const index=Number((event as CustomEvent<{index?:number}>).detail?.index);if(!Number.isFinite(index))return;const target=journey[Math.max(0,Math.min(journey.length-1,index))];setManual(true);setPlaying(false);setProgress(target.progress);progressRef.current=target.progress;};
  const playStory=()=>{setManual(true);progressRef.current=0;setProgress(0);if(reduced){setPlaying(false);return;}setPlaying(true);};
  const onTheme=(event:Event)=>{const index=Number((event as CustomEvent<{index?:number}>).detail?.index);if(!Number.isInteger(index)||index<0||index>5)return;setTheme(index);setTime((['morning','day','dusk','morning','night','day'] as CityTime[])[index]);setManual(true);setPlaying(false);setProgress(1);progressRef.current=1;};
  window.addEventListener('carbontwin:journey-stage',onJourney);window.addEventListener('carbontwin:city-story-play',playStory);
  window.addEventListener('carbontwin:city-theme',onTheme);
  return()=>{window.removeEventListener('carbontwin:journey-stage',onJourney);window.removeEventListener('carbontwin:city-story-play',playStory);window.removeEventListener('carbontwin:city-theme',onTheme);};
 },[reduced]);
 const selectedProfile=selected===null?null:{id:selected,name:buildingName(selected),height:selected%7===3?Math.min(8,buildingSize(selected)[1]):buildingSize(selected)[1],role:retainedBuildings[selected]?'保留建筑研究母版': ['共享庭院','科研与交流','居住与服务','公共文化','办公与协作','社区花园','科研与生态'][selected%7]};
 const index=journeyIndex(shown),stage=journey[index];
 return <div ref={root} className="city-formation formation-v7" data-playing={playing} data-stage={shown<.34?'dust':shown<.8?'volume':'district'} data-theme={theme} data-journey-stage={stage.key} data-time={time} data-building-count="25" data-building-types={String(buildingTypes.length)}>
  <div className="dust-story-heading"><span>FROM A SEED TO A SHARED CITY</span><b>{stage.number} / {stage.title}</b><p aria-live="polite">{stage.description}</p></div>
  <SceneStage label="粒子、树木、场地、建筑、激活与自由探索的六阶段交互场景" sceneLights={false} pauseWhenHidden transparent onModeChange={setSceneMode} fallback={<div className="formation-nature-fallback"><CityDustFallback blocks={cityBlocks} manual={manual} progress={progress} onProgress={setShown} time={time}/><FormationTreeDiagram progress={shown}/></div>}>
   <District progress={progressRef} manual={manual} onProgress={setShown} time={time} theme={theme} selected={selected} onSelect={setSelected} onReady={setPrepared}/>
  </SceneStage>
  <div className="formation-controls">
   <ol className="dust-story-steps" aria-label="城市生长阶段">{journey.map((step,i)=><li key={step.key}><button aria-current={i===index?'step':undefined} aria-label={`${step.number} ${step.title}`} onClick={()=>seek(step.progress)}><small>{step.number}</small>{step.title}</button></li>)}</ol>
   <label htmlFor="city-formation">{reduced?'手动选择阶段 · 动效已减少':sceneMode==='3d'?'滚动汇聚 · 拖动画面环绕':'滚动汇聚 · 二维轻量示意'}<output>{Math.round(shown*100)}%</output></label>
   <input id="city-formation" aria-label="城市实体化进度" type="range" min="0" max="1" step=".01" value={manual&&!playing?progress:shown} onChange={e=>seek(Number(e.target.value))}/>
   <div className="dust-playback"><button disabled={reduced} onClick={()=>{if(playing){setPlaying(false);return;}const start=shown>.98?0:shown;progressRef.current=start;setProgress(start);setManual(true);setPlaying(true);}} aria-pressed={playing}>{playing?'暂停生长':shown>.98?'重播城市生长':'播放城市生长'}</button><button onClick={()=>seek(1)}>跳过到街区</button><button onClick={()=>{setPlaying(false);setManual(false);}} aria-pressed={!manual}>随首页滚动</button></div>
   <details className="formation-options"><summary>光照与建筑索引 <span>展开设置 ＋</span></summary><div className="city-time-controls" role="group" aria-label="城市昼夜"><span>光照 / {timeLabels[time]}</span>{(Object.keys(timeLabels) as CityTime[]).map(key=><button key={key} onClick={()=>setTime(key)} aria-pressed={time===key}>{timeLabels[key]}</button>)}</div>
   <label className="formation-building-select">建筑索引<select aria-label="浏览街区建筑" value={selected??''} disabled={shown<.86} onChange={e=>setSelected(e.target.value===''?null:Number(e.target.value))}><option value="">{shown<.86?'进入激活阶段后浏览建筑':'选择一栋建筑'}</option>{cityBlocks.map(b=><option key={b.id} value={b.id}>{String(b.id+1).padStart(2,'0')} · {buildingName(b.id)}</option>)}</select></label>
   {selectedProfile&&<div className="city-building-card" role="status"><b>{selectedProfile.name} · {selectedProfile.id+1}号楼</b><span>{selectedProfile.role}{!retainedBuildings[selectedProfile.id]&&` · 示意高度 ${selectedProfile.height.toFixed(1)} m`}</span>{selectedProfile.id===6&&<Link href="/citylight/studio">打开光庭工作台 ↗</Link>}<button onClick={()=>setSelected(null)}>关闭建筑信息</button></div>}
   {shown>.95&&<div className="formation-explore-links"><Link href="/simulator#digital-room">进入街区与咖啡厅 ↗</Link><Link href="/city-studies">探索建筑研究 ↗</Link></div>}
   <p className="dust-method-note">人物改编自 <a href="https://studio.blender.org/characters/rain/v2/" target="_blank" rel="noreferrer">Rain Rig © Blender Foundation | cloud.blender.org</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>。植被与天空：Poly Haven · CC0。</p></details>
   <p className="dust-method-note">原创滨水街区与保留地标的空间示意，非真实排放监测。<Link href="/simulator#digital-room">探索建筑与咖啡厅 ↗</Link></p>
  </div>
 </div>;
}
