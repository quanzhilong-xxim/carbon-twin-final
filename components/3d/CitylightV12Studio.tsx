'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import Link from 'next/link';
import {Component,Suspense,useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';

import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStableRenderer,needsStableDrawingBuffer} from '@/lib/citylight/stable-renderer';
import {type HeroView,type Pose} from '@/lib/citylight/hero';
import {V12_TIME_PRESETS,v12WorldTime} from '@/lib/citylight/v12-world-time';
const HERO_VIEWS:Record<HeroView,{label:string;pose:Pose}>={front:{label:'正面 45°',pose:{position:[92,66,145],target:[0,55,0]}},rear:{label:'背面 45°',pose:{position:[-92,66,-145],target:[0,55,0]}},left:{label:'左侧',pose:{position:[-150,62,6],target:[0,55,0]}},right:{label:'右侧',pose:{position:[150,62,6],target:[0,55,0]}},roof:{label:'屋顶斜俯视',pose:{position:[30,133,42],target:[0,108,0]}},entry:{label:'人眼入口',pose:{position:[6,1.7,29],target:[0,3,10]}},night:{label:'夜景中距离',pose:{position:[82,60,125],target:[0,55,0]}},window:{label:'窗内空间',pose:{position:[-8,18,25],target:[-7,18,9]}}};

const CANDIDATES={a:{id:'CL-T01-V12',name:'光之塔 · 光庭',file:'light-court',description:'单栋整改：圆角幕墙、真实周边房间、接待大堂与办公廊层。完整城市尚未开始。'}};
type Candidate=keyof typeof CANDIDATES;
type Stage='empty'|'geometry'|'transparency'|'shadows'|'reflections';
type SkyAssetStatus='loading'|'ready'|'fallback';
type RoomLightStatus=SkyAssetStatus|'disabled';
const ROOM_LIGHT_MATERIALS=new Set(['v12-spandrel','v12-frame','v12-wood','v12-black','v12-cloth','v12-room-1','v12-room-0','v12-gasket','v12-spacer','v12-study-keys','v12-study-ivory','v12-study-graphite','v12-study-paper','v12-study-oak','v12-study-fabric','v12-study-clay','v12-study-leaf','v12-study-floor-ao']);
const STAGES:Stage[]=['empty','geometry','transparency','shadows','reflections'];
class Boundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return{failed:true};}render(){return this.state.failed?this.props.fallback:this.props.children;}
}
function Asset({candidate,time,glass,wire,stage,lod,onRoomStatus}:{candidate:Candidate;time:number;glass:number;wire:boolean;stage:Stage;lod:boolean;onRoomStatus:(status:RoomLightStatus)=>void}){
 const {gl}=useThree();
 const [roomMap,setRoomMap]=useState<THREE.Texture|null>(null);
 useEffect(()=>{
  let active=true,settled=false;setRoomMap(null);
  const status=(s:RoomLightStatus)=>{gl.domElement.dataset.roomLightmap=s;onRoomStatus(s);};
  if(lod){status('disabled');return;}
  status('loading');
  const fail=()=>{if(active&&!settled){settled=true;window.clearTimeout(timer);status('fallback');}};
  const timer=window.setTimeout(fail,15000);
  const texture=new THREE.TextureLoader().load('/models/citylight/v12/sample-room-night-irradiance-r32.png',loaded=>{
   if(!active||settled){loaded.dispose();return;}
   settled=true;window.clearTimeout(timer);
   loaded.colorSpace=THREE.SRGBColorSpace;loaded.flipY=false;loaded.channel=2;
   loaded.generateMipmaps=true;loaded.minFilter=THREE.LinearMipmapLinearFilter;loaded.magFilter=THREE.LinearFilter;
   loaded.needsUpdate=true;setRoomMap(loaded);status('ready');
  },undefined,fail);
  return()=>{active=false;window.clearTimeout(timer);texture.dispose();};
 },[gl,lod,onRoomStatus]);
 const item=CANDIDATES[candidate],uri=`/models/citylight/v12/${item.file}${lod?'-lod':''}.glb`,asset=useGLTF(uri);
 const owned=useMemo(()=>{const scene=asset.scene.clone(true),materials:THREE.MeshStandardMaterial[]=[],baseline=new Map<THREE.MeshStandardMaterial,{metalness:number;roughness:number}>();
  const data=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,n=((x*73856093)^(y*19349663))>>>0,v=220+n%35;data.set([v,v,v,255],i);}
  const grain=new THREE.DataTexture(data,128,128);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.generateMipmaps=true;grain.minFilter=THREE.LinearMipmapLinearFilter;grain.magFilter=THREE.LinearFilter;grain.needsUpdate=true;
  scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const source=Array.isArray(m.material)?m.material:[m.material];m.castShadow=!source.some(s=>(s as THREE.MeshPhysicalMaterial).transmission>0);m.receiveShadow=true;const clone=(s:THREE.Material)=>{const a=s.clone() as THREE.MeshStandardMaterial;baseline.set(a,{metalness:a.metalness,roughness:a.roughness});if(['v12-stone','v12-paving','v12-wood'].includes(a.name)){a.roughnessMap=grain;a.bumpMap=grain;a.bumpScale=a.name==='v12-wood'?.0008:.003;}materials.push(a);return a;};m.material=Array.isArray(m.material)?m.material.map(clone):clone(m.material);});return{scene,materials,grain,baseline};},[asset.scene]);
 useEffect(()=>{for(const m of owned.materials){
  m.wireframe=wire;
  // Restore source PBR values before each diagnostic mode; geometry mode must
  // not permanently flatten the metal/stone after returning to reflections.
  const base=owned.baseline.get(m)!;m.metalness=base.metalness;m.roughness=base.roughness;
  const physical=m as THREE.MeshPhysicalMaterial;
  if(physical.isMeshPhysicalMaterial){
   const lobby=['v12-lobby-glass','v12-lobby-rail-glass','v12-canopy-glass'].includes(m.name);
   const thickness=m.name==='v12-lobby-rail-glass'?.015:m.name==='v12-canopy-glass'?.016:lobby?.012:.024;
   physical.transmission=stage==='geometry'?0:glass===2?.96:glass===1?.58:0;
   physical.roughness=lobby?.025:.035;physical.thickness=thickness;physical.ior=1.52;
   // A separate dielectric clear coat approximates a facade coating; it is not a second pane.
   // The lobby remains low-iron and uncoated so the reception retains its depth.
   physical.clearcoat=lobby?0:.65;physical.clearcoatRoughness=.065;
   physical.attenuationColor.set(lobby?'#f3f8f5':'#dbeae5');physical.attenuationDistance=12;
   physical.needsUpdate=true;
  }
  if(process.env.NODE_ENV!=='production'&&physical.isMeshPhysicalMaterial&&new URLSearchParams(location.search).get('sided')==='front')physical.side=THREE.FrontSide;
  // In Three r187 diffuseColor also multiplies volume transmission. A blue
  // base tint darkened every face independently of its physical thickness.
  // Keep absorption in the volume; the clear facade's base is neutral.
  if(m.name==='v12-glass')m.color.set(glass===0?'#334d5a':'#ffffff');
  if(['v12-lobby-glass','v12-lobby-rail-glass','v12-canopy-glass'].includes(m.name))m.color.set('#f3f5f1');
  const {night}=v12WorldTime(time);
  if(m.name.startsWith('v12-room-')){const i=Number(m.name.split('-').at(-1));const on=[.68,.025,.92,.38,.01,.81,.5,.06][i];m.color.set(['#9c9d91','#6b7b78','#c3b69d','#939e9a','#526a71','#b5aa8b','#b5a99e','#718080'][i]);m.emissive.set('#ffd3a0');m.emissiveIntensity=night*on*.4;}
  if(m.name.startsWith('v12-light-')){const i=Number(m.name.split('-').at(-1));m.emissiveIntensity=.12+night*[1.5,.2,2,.7,.04,1.6,1,.4][i];}
  if(m.name==='v12-lamp')m.emissiveIntensity=.2+night*2.1;
  if(m.name==='copper'){m.roughness=.65;m.metalness=.55;}
  if(m.name==='curtain-warm'){m.emissive.set('#e8b777');m.emissiveIntensity=stage==='geometry'?0:time*.48;}
  if(m.name==='light-strip'){m.emissive.set('#ffd6a0');m.emissiveIntensity=stage==='geometry'?0:.14+time*.65;}
  m.envMapIntensity=stage==='reflections'?1:0;
  if(stage==='geometry'){m.metalness=0;m.roughness=.85;}
 }gl.domElement.dataset.glassMaterials=JSON.stringify(owned.materials.filter(m=>(m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial).map(m=>({name:m.name,thickness:(m as THREE.MeshPhysicalMaterial).thickness})));gl.domElement.dataset.transmissions=JSON.stringify(owned.materials.filter(m=>(m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial).map(m=>(m as THREE.MeshPhysicalMaterial).transmission));gl.domElement.dataset.roomLights=JSON.stringify(owned.materials.filter(m=>m.name.startsWith('v12-room-')).map(m=>({name:m.name,emissive:m.emissive.getHexString(),intensity:m.emissiveIntensity})));},[owned,time,glass,wire,stage,gl]);
 // Baked lamp diffuse is accumulated after the existing AO, so already
 // occluded lamp transport is not multiplied by contact AO a second time.
 // Unchanged daylight/IBL/specular still use the original AO/roughness maps.
 useEffect(()=>{
  const enabled=roomMap&&!lod?roomMap:null;
  for(const m of owned.materials){
   if(!ROOM_LIGHT_MATERIALS.has(m.name))continue;
   const changed=m.lightMap!==enabled;m.lightMap=enabled;
   m.lightMapIntensity=stage==='geometry'?0:v12WorldTime(time).night*4*Math.PI;
   if(changed){
    m.onBeforeCompile=shader=>{
     if(!m.lightMap)return;
     // Replace only the named lamp's diffuse on mapped faces. The previous
     // version multiplied IncidentLight.color by zero and lost its specular too.
     // Evaluate into a local accumulator so other lights are never subtracted.
     const directCall='RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
     shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace(
      directCall,
      `#ifdef USE_LIGHTMAP
      {
       vec3 replacedLampPosition=(viewMatrix*vec4(-8.0,19.9,11.4,1.0)).xyz;
       if(distance(pointLight.position,replacedLampPosition)<0.01 && vLightMapUv.x<0.99){
        ReflectedLight roomSpecular=ReflectedLight(vec3(0.0),vec3(0.0),vec3(0.0),vec3(0.0));
        RE_Direct(directLight,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,roomSpecular);
        reflectedLight.directSpecular+=roomSpecular.directSpecular;
       }else{
        ${directCall}
       }
      }
      #else
       ${directCall}
      #endif`));
     shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>',THREE.ShaderChunk.lights_fragment_maps.replace('irradiance += lightMapIrradiance;','// Local lamp diffuse is evaluated after AO below.'));
     shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
#ifdef USE_LIGHTMAP
     // Only mapped sample-room faces lose the former uniform wall emission.
     totalEmissiveRadiance *= step(0.99,vLightMapUv.x);
#endif`);
     shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
#if defined(USE_LIGHTMAP) && defined(RE_IndirectDiffuse)
     ReflectedLight roomLamp=ReflectedLight(vec3(0.0),vec3(0.0),vec3(0.0),vec3(0.0));
     RE_IndirectDiffuse(lightMapIrradiance,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,roomLamp);
     reflectedLight.indirectDiffuse += roomLamp.indirectDiffuse;
#endif`);
    };
    m.customProgramCacheKey=()=>enabled?'v12-sample-lamp-preserve-specular-r30':'v12-original';m.needsUpdate=true;
   }
  }
  gl.domElement.dataset.roomLightmapIntensity=String(stage==='geometry'?0:v12WorldTime(time).night*4*Math.PI);
 },[owned,roomMap,lod,time,stage,gl]);
 useEffect(()=>()=>{owned.materials.forEach(m=>m.dispose());owned.grain.dispose();},[owned]);
 return <group name={item.id} userData={{entityId:item.id}}><primitive object={owned.scene} dispose={null}/></group>;
}

function LightRig({time,stage,local,candidate,low,onSkyStatus}:{time:number;stage:Stage;local:boolean;candidate:Candidate;low:boolean;onSkyStatus:(status:SkyAssetStatus)=>void}){
 const {gl,scene}=useThree();const index=STAGES.indexOf(stage);
 const resources=useRef<{sky:Sky;pmrem:THREE.PMREMGenerator;groundGeometry:THREE.PlaneGeometry;groundMaterial:THREE.MeshBasicMaterial}>();
 const [sunset,setSunset]=useState<THREE.DataTexture|null>(null);
 // The photographic sky is optional. A failed request must not reject the shared
 // Suspense boundary and remove the building. No retry or external fallback.
 useEffect(()=>{
  let active=true,settled=false;
  const status=(value:SkyAssetStatus)=>{gl.domElement.dataset.skyAsset=value;onSkyStatus(value);};
  status('loading');
  const fail=()=>{if(active&&!settled){settled=true;window.clearTimeout(timer);status('fallback');}};
  const timer=window.setTimeout(fail,15000);
  const texture=new HDRLoader().load('/environments/citylight/kloppenheim_06_puresky_1k.hdr',loaded=>{
   if(active&&!settled){settled=true;window.clearTimeout(timer);setSunset(loaded);status('ready');}else loaded.dispose();
  },undefined,fail);
  return()=>{active=false;window.clearTimeout(timer);texture.dispose();};
 },[gl,onSkyStatus]);
 useEffect(()=>{const fallback=low?.5:1;const value=process.env.NODE_ENV!=='production'?Number(new URLSearchParams(location.search).get('transmissionScale')||fallback):fallback;gl.transmissionResolutionScale=[.5,.75,1].includes(value)?value:fallback;gl.domElement.dataset.transmissionScale=String(gl.transmissionResolutionScale);},[gl,low]);
 const {night,elevation,azimuth,sun:sunIntensity,exposure,kelvin,skyEnergy}=v12WorldTime(time);
 const sunColor=useMemo(()=>new THREE.Color().setRGB(1,THREE.MathUtils.lerp(.56,.96,(kelvin-3100)/2700),THREE.MathUtils.lerp(.28,.9,(kelvin-3100)/2700)),[kelvin]);
 const sun=useMemo(()=>new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(90-elevation),THREE.MathUtils.degToRad(azimuth)),[elevation,azimuth]);
 useEffect(()=>{gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;},[gl,time,stage,candidate]);
 // Keep one shader/material and PMREM generator for this WebGL context. Time
 // changes update uniforms; embedding each time value in GLSL compiled a new
 // sky program and regenerated its resources on every slider input.
 useEffect(()=>{
  const sky=new Sky();sky.scale.setScalar(1800);const u=sky.material.uniforms;
  u.horizonHaze={value:new THREE.Color()};u.sunsetRadiance={value:null};
  u.skyEnergy={value:1};u.twilightEnergy={value:0};u.nightEnergy={value:0};
  u.sunsetMix={value:0};u.skyRotation={value:0};
  sky.material.fragmentShader='uniform vec3 horizonHaze; uniform sampler2D sunsetRadiance; uniform float skyEnergy, twilightEnergy, nightEnergy, sunsetMix, skyRotation;\n'+sky.material.fragmentShader;
  sky.material.fragmentShader=sky.material.fragmentShader.replace('gl_FragColor = vec4( texColor, 1.0 );',`
    texColor *= skyEnergy;
    texColor += mix(vec3(0.075,0.12,0.21),vec3(0.018,0.042,0.11),clamp(direction.y,0.0,1.0))*twilightEnergy;
    texColor += vec3(0.002,0.004,0.012)*nightEnergy;
    vec2 hdriUV=vec2(fract((atan(direction.z,direction.x)+skyRotation)/6.2831853+0.5),asin(clamp(direction.y,-1.0,1.0))/3.14159265+0.5);
    texColor=mix(texColor,texture2D(sunsetRadiance,hdriUV).rgb*0.5,sunsetMix);
    gl_FragColor = vec4(texColor,1.0);`);
  sky.material.fragmentShader=sky.material.fragmentShader.replace('#include <colorspace_fragment>',`#include <colorspace_fragment>
    gl_FragColor.rgb=mix(linearToOutputTexel(vec4(horizonHaze,1.0)).rgb,gl_FragColor.rgb,smoothstep(-0.015,0.09,direction.y));`);
  const owned={sky,pmrem:new THREE.PMREMGenerator(gl),groundGeometry:new THREE.PlaneGeometry(4000,4000),groundMaterial:new THREE.MeshBasicMaterial()};
  resources.current=owned;scene.add(sky);scene.background=null;
  return()=>{resources.current=undefined;scene.remove(sky);sky.geometry.dispose();sky.material.dispose();owned.groundGeometry.dispose();owned.groundMaterial.dispose();owned.pmrem.dispose();};
 },[gl,scene]);
 useEffect(()=>{
  const owned=resources.current;if(!owned)return;
  const {sky,pmrem,groundGeometry,groundMaterial}=owned,u=sky.material.uniforms;
  u.turbidity.value=4.2;u.rayleigh.value=2.2;u.mieCoefficient.value=.004;u.mieDirectionalG.value=.76;u.sunPosition.value.copy(sun);
  // Sky r187 projects direction onto a plane before multiplying by 1000.
  // Its default .0002 left this scene with an almost uniform cloud field.
  u.cloudScale.value=.0008;u.cloudCoverage.value=.46;u.cloudDensity.value=.56;
  if(process.env.NODE_ENV!=='production'&&new URLSearchParams(location.search).get('clouds')==='0')u.cloudCoverage.value=0;
  gl.domElement.dataset.cloudCoverage=String(u.cloudCoverage.value);
  // The daylight Sky shader contains no moon/starlight. An explicit low-energy
  // night hemisphere supplies a readable night environment, not a postprocess tint.
  // Normalize the analytical sky's daylight energy before PMREM as well as display.
  // Twilight is a declared artistic approximation: Preetham has no night model.
  const twilight=elevation<0?Math.sin(Math.PI*THREE.MathUtils.clamp((-elevation-1)/11,0,1)):0;
  const haze=new THREE.Color('#a69d98').lerp(new THREE.Color('#b8c9d0'),THREE.MathUtils.smoothstep(elevation,8,45)).lerp(new THREE.Color('#101a2b'),night);
  if(twilight>0)haze.lerp(new THREE.Color('#52677d'),twilight);
  const sunsetBlend=sunset?THREE.MathUtils.smoothstep(time,.25,.35)*(1-THREE.MathUtils.smoothstep(time,.35,.6)):0;
  u.horizonHaze.value.copy(haze);u.sunsetRadiance.value=sunset;
  u.skyEnergy.value=skyEnergy;u.twilightEnergy.value=twilight;u.nightEnergy.value=night;u.sunsetMix.value=sunsetBlend;
  u.skyRotation.value=(627/1024-.5)*Math.PI*2-Math.atan2(sun.z,sun.x);
  // Three's material fog is applied AFTER tone mapping. Match that output here;
  // applying haze before ACES produced an artificial ground/sky seam.
  scene.fog=new THREE.FogExp2(haze,.0015);
  gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=exposure;
  let target:THREE.WebGLRenderTarget|undefined,cube:THREE.WebGLCubeRenderTarget|undefined,filtered:THREE.WebGLRenderTarget|undefined;
  // Reflection-only ground proxy: the previous sky-only capture incorrectly put
  // bright atmosphere into the lower hemisphere. No extra building is introduced.
  groundMaterial.color.set('#696e69').multiplyScalar(1-night*.92);
  if(index>=4){
   if(u.showSunDisc)u.showSunDisc.value=false;
   const environmentScene=new THREE.Scene();environmentScene.add(sky.clone());
   const ground=new THREE.Mesh(groundGeometry,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.31;environmentScene.add(ground);
   // Preserve the sky's radiance detail. PMREM already convolves each mip for
   // material roughness; an extra 0.025rad pre-blur softened even clear glass.
   target=pmrem.fromScene(environmentScene,0,.1,2000);scene.environment=target.texture;
   if(u.showSunDisc)u.showSunDisc.value=true;
   if(local){const hero=scene.getObjectByName(CANDIDATES[candidate].id),hidden:THREE.Object3D[]=[];hero?.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh||!m.visible)return;const materials=Array.isArray(m.material)?m.material:[m.material];if(!materials.every(s=>['v12-leaf-a','v12-leaf-b','bark','v12-soil','v12-paving','v12-joint'].includes(s.name))){hidden.push(m);m.visible=false;}});cube=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType});const camera=new THREE.CubeCamera(.2,500,cube);camera.position.set(0,18,0);scene.updateMatrixWorld(true);try{camera.update(gl,scene);filtered=pmrem.fromCubemap(cube.texture);scene.environment=filtered.texture;}finally{hidden.forEach(o=>{o.visible=true;});}}
  }else scene.environment=null;
  gl.domElement.dataset.skySource=sunsetBlend>.99?'cc0-kloppenheim-sunset':'analytical-sky';gl.domElement.dataset.reflection=local?'local-courtyard-probe':'physical-atmosphere-pmrem';gl.domElement.dataset.cloudScale=String(u.cloudScale.value);gl.domElement.dataset.worldTime=String(time);gl.domElement.dataset.sunElevation=String(elevation);gl.domElement.dataset.sunAzimuth=String(azimuth);gl.domElement.dataset.sunIntensity=String(sunIntensity);gl.domElement.dataset.night=String(night);gl.domElement.dataset.exposure=String(gl.toneMappingExposure);gl.domElement.dataset.shaderPrograms=String(gl.info.programs?.length??0);
  return()=>{scene.environment=null;scene.fog=null;target?.dispose();cube?.dispose();filtered?.dispose();};
 },[gl,scene,time,index,local,candidate,sun,elevation,azimuth,night,exposure,sunIntensity,skyEnergy,sunset]);
 return <><ambientLight intensity={.025+night*.025}/><hemisphereLight args={['#b6ccdd','#645c4d',.22-night*.12]}/><directionalLight position={sun.clone().multiplyScalar(170)} color={sunColor} intensity={sunIntensity} castShadow={index>=3} shadow-mapSize={[2048,2048]} shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={140} shadow-camera-bottom={-35} shadow-camera-far={350} shadow-normalBias={.08}/><pointLight position={[0,3.5,7]} color="#ffe3b5" intensity={60+night*180} distance={30} decay={2}/><pointLight position={[-14,3.4,4]} color="#ffe1b2" intensity={45+night*100} distance={19} decay={2}/><pointLight position={[14,3.4,4]} color="#ffe1b2" intensity={45+night*100} distance={19} decay={2}/>{[-8,5].map(x=><pointLight key={x} position={[x,19.9,11.4]} color="#ffdfa9" intensity={night*38} distance={7} decay={2}/>)}</>;
}
function Director({view,revision,candidate,onReady,onLost}:{view:HeroView;revision:number;candidate:Candidate;onReady:()=>void;onLost:()=>void}){
 const {camera,gl}=useThree();const controls=useRef<OrbitControls>(),travel=useRef(true),stable=useRef(false),elapsed=useRef(0),frames=useRef<number[]>([]);
 const reduced=useRef(false);
 const pose=useMemo(()=>{const p=HERO_VIEWS[view].pose;return{position:new THREE.Vector3(...p.position),target:new THREE.Vector3(...p.target)};},[view]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>{reduced.current=media.matches;};change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{const orbit=new OrbitControls(camera,gl.domElement);orbit.enableDamping=true;orbit.minDistance=8;orbit.maxDistance=300;orbit.maxPolarAngle=Math.PI*.53;controls.current=orbit;const stop=()=>{travel.current=false;};orbit.addEventListener('start',stop);const fail=(e:Event)=>{e.preventDefault();if(gl.domElement.isConnected)onLost();};gl.domElement.addEventListener('webglcontextlost',fail);return()=>{orbit.removeEventListener('start',stop);orbit.dispose();gl.domElement.removeEventListener('webglcontextlost',fail);};},[camera,gl,onLost]);
 useEffect(()=>{const orbit=controls.current;if(orbit){const damping=orbit.enableDamping;orbit.enableDamping=false;orbit.update();orbit.enableDamping=damping;}travel.current=true;stable.current=false;gl.domElement.dataset.stable='false';},[view,revision,candidate,gl]);
 useFrame((_,dt)=>{const orbit=controls.current;if(!orbit)return;
  const {position,target}=pose;
  // Entrance is outside the new 24m canopy, at the same 1.7m eye height.
  if(view==='entry'){position.set(6,1.7,29);target.set(0,3,10);}
  if(view==='window'){position.set(-8,18,25);target.set(-7,18,9);}
  if(travel.current){const a=reduced.current?1:1-Math.exp(-dt*4);const r=Math.hypot(camera.position.x,camera.position.z),r1=Math.hypot(position.x,position.z),angle=Math.atan2(camera.position.x,camera.position.z),dest=Math.atan2(position.x,position.z);const delta=Math.atan2(Math.sin(dest-angle),Math.cos(dest-angle));camera.position.setFromCylindricalCoords(THREE.MathUtils.lerp(r,r1,a),angle+delta*a,THREE.MathUtils.lerp(camera.position.y,position.y,a));orbit.target.lerp(target,a);if(camera.position.distanceTo(position)<.05){camera.position.copy(position);orbit.target.copy(target);travel.current=false;}}
  orbit.update();camera.position.y=Math.max(1.65,camera.position.y);
  // The original tower's furthest front detail above 12m is Z=13.87m.
  // Keep window inspection in a continuous exterior half-space. Switching
  // back to the radial guard at its boundary produced a 7m camera jump.
  // Other presets retain their existing exterior guard. This front-only
  // inspection corridor is not a full per-component collision system.
  if(view==='window'){
   camera.position.y=Math.max(12,camera.position.y);
   camera.position.z=Math.max(14.5,camera.position.z);
  }else{
   const r=Math.hypot(camera.position.x,camera.position.z),safe=camera.position.y<12?26:23;
   if(r<safe){camera.position.x*=safe/Math.max(.001,r);camera.position.z*=safe/Math.max(.001,r);}
  }
  camera.lookAt(orbit.target);
  const data=gl.domElement.dataset;data.camera=camera.position.toArray().join(',');data.target=orbit.target.toArray().join(',');data.entityId=CANDIDATES[candidate].id;
  data.cameraFov=String((camera as THREE.PerspectiveCamera).fov);data.pixelRatio=String(gl.getPixelRatio());data.drawingBuffer=gl.getDrawingBufferSize(new THREE.Vector2()).toArray().join(',');data.canvasSize=[gl.domElement.clientWidth,gl.domElement.clientHeight].join(',');
  if(!travel.current&&!stable.current){stable.current=true;data.stable='true';onReady();}
  if(!document.hidden){frames.current.push(dt*1000);elapsed.current+=dt;}else{elapsed.current=0;frames.current=[];}
  if(elapsed.current>2){const a=frames.current.sort((a,b)=>a-b);data.fps=(a.length/elapsed.current).toFixed(2);data.p95=a[Math.floor(a.length*.95)].toFixed(2);data.maxFrameMs=a[a.length-1].toFixed(2);data.framesOver500ms=String(a.filter(ms=>ms>=500).length);data.drawCalls=String(gl.info.render.calls);data.triangles=String(gl.info.render.triangles);data.geometries=String(gl.info.memory.geometries);data.textures=String(gl.info.memory.textures);elapsed.current=0;frames.current=[];}
 });return null;
}

export default function CitylightV12Studio(){
 const candidate:Candidate='a';const[view,setView]=useState<HeroView>('front'),[time,setTime]=useState(.35),[local,setLocal]=useState(false),[glass,setGlass]=useState(2),[wire,setWire]=useState(false),[low,setLow]=useState(false),[stage,setStage]=useState<Stage>('reflections'),[revision,setRevision]=useState(0),[ready,setReady]=useState(false),[lost,setLost]=useState(false),[paused,setPaused]=useState(false),[generation,setGeneration]=useState(0);
 const host=useRef<HTMLElement>(null),[surface,setSurface]=useState({w:0,h:0,stable:false}),[skyStatus,setSkyStatus]=useState<SkyAssetStatus>('loading'),[roomLightStatus,setRoomLightStatus]=useState<RoomLightStatus>('loading');
 const ratio=low?.7:1,item=CANDIDATES[candidate];
 useEffect(()=>{const el=host.current;if(!el)return;const observer=new ResizeObserver(([e])=>{const {width:w,height:h}=e.contentRect;setSurface(s=>s.w===w&&s.h===h?s:{w,h,stable:needsStableDrawingBuffer()});});observer.observe(el);const p=new URLSearchParams(location.search),s=p.get('probe');if(process.env.NODE_ENV!=='production'&&STAGES.includes(s as Stage)){setStage(s as Stage);setGlass(2);}return()=>observer.disconnect();},[]);
 const select=useCallback((v:HeroView)=>{setView(v);setReady(false);setRevision(r=>r+1);if(v==='night')setTime(1);},[]);
 useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')select('front');};window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc);},[select]);
 const onReady=useCallback(()=>setReady(true),[]),onLost=useCallback(()=>{setLost(true);setReady(false);},[]);
 const renderer=useCallback((canvas:HTMLCanvasElement|OffscreenCanvas)=>createStableRenderer(canvas,ratio),[ratio]);
 const fallback=<div className="citylight-fallback" role="status"><h2>{paused?'三维视图已暂停':'三维视图暂不可用'}</h2><p>未使用静态图冒充三维。可手动恢复，或返回保留的原版。</p><button onClick={()=>{if(!paused)useGLTF.clear(`/models/citylight/v12/${item.file}${low?'-lod':''}.glb`);setLost(false);setPaused(false);setReady(false);setGeneration(n=>n+1);}}>重新加载三维</button><Link href="/citylight/lab">返回原版</Link></div>;
 return <><header className="citylight-heading"><div><span className="citylight-kicker">CARBONTWIN / ARCHITECTURE ATELIER / LIGHT COURT</span><h1>让光，进入真实的房间。</h1><p>从幕墙走进房间，从清晨看到深夜。在真实三维里，探索天光、玻璃与日常空间的关系。</p></div><div><Link href="/citylight/review">中文可视化验收中心 ↗</Link><br/><Link href="/citylight/lab">保留的 V11 工作台 ↗</Link></div></header>
 <div className="citylight-workbench"><section ref={host} className="citylight-viewport" aria-label="V12 光之塔真实三维整改" data-ready={ready&&!lost&&!paused} data-candidate={candidate} data-view={view} data-stage={stage} data-world-time={time} data-reflection={local?'local':'sky'}>
 {lost||paused?fallback:surface.w>0&&<Boundary key={generation} fallback={fallback}><Canvas key={surface.stable?`${surface.w}:${surface.h}:${ratio}`:'native'} camera={{position:[108,82,174],fov:45,near:.12,far:5000}} dpr={ratio} gl={renderer} shadows={STAGES.indexOf(stage)>=3&&!low} onCreated={({gl})=>{const g=gl.getContext(),ext=g.getExtension('WEBGL_debug_renderer_info');gl.domElement.dataset.renderer=String(ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER));}}>
 <Suspense fallback={null}>{stage!=='empty'&&<><Asset candidate={candidate} time={time} glass={glass} wire={wire} stage={stage} lod={low} onRoomStatus={setRoomLightStatus}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.31,0]} receiveShadow><planeGeometry args={[8000,8000]}/><meshStandardMaterial color="#696e69" roughness={.96}/></mesh></>}<LightRig time={time} stage={stage} local={local} candidate={candidate} low={low} onSkyStatus={setSkyStatus}/><Director view={view} revision={revision} candidate={candidate} onReady={onReady} onLost={onLost}/></Suspense>
 </Canvas></Boundary>}
 <div className="citylight-caption"><span><strong>{item.id} / {item.name}</strong>{HERO_VIEWS[view].label} · 拖动环绕 / Esc 复位</span><small>{roomLightStatus==='fallback'&&<>样板房灯光贴图不可用，已保留原照明<br/></>}{skyStatus==='fallback'&&<>天空素材不可用，已使用解析天空<br/></>}{paused?'三维视图已暂停':lost?'三维视图暂不可用':ready?'真实三维 / 固定机位已稳定':'正在加载 / 调整镜头'}<br/>CL-T01-V12 / 原建筑与室内保留</small></div></section>
 <aside className="citylight-controls"><div><span className="citylight-kicker">LIGHT / MATERIAL / LIVED SPACE</span><h2>{item.name}</h2><p>{item.description}</p></div>
 <fieldset><legend>固定七视角与室内</legend><div className="citylight-buttons">{(Object.keys(HERO_VIEWS)as HeroView[]).map(v=><button key={v} aria-pressed={view===v} onClick={()=>select(v)}>{HERO_VIEWS[v].label}</button>)}</div></fieldset>
 <fieldset><legend>世界时间</legend><label className="citylight-time">清晨 → 正午 → 下午 → 夕阳 → 蓝调 → 深夜<input aria-label="世界时间" type="range" min="0" max="1" step=".01" value={time} onChange={e=>setTime(Number(e.target.value))}/></label><div className="citylight-buttons">{V12_TIME_PRESETS.map(p=><button key={p.label} aria-pressed={time===p.time} onClick={()=>setTime(p.time)}>{p.label}</button>)}</div></fieldset>
 <fieldset><legend>材质实测</legend><div className="citylight-buttons"><button aria-pressed={local} onClick={()=>setLocal(v=>!v)}>{local?'B · 庭院局部探针':'A · 物理天光环境'}</button>{['不透射','柔化玻璃','清透玻璃'].map((s,i)=><button key={s} aria-pressed={glass===i} onClick={()=>setGlass(i)}>{s}</button>)}<button aria-pressed={wire} onClick={()=>setWire(v=>!v)}>实体线框</button><button aria-pressed={low} onClick={()=>setLow(v=>!v)}>{low?'恢复标准画质':'LOD / 低分辨率'}</button><button onClick={()=>setPaused(true)}>暂停三维渲染</button></div><details className="architecture-technical"><summary>玻璃、天光与室内光的实现边界</summary><p>默认清透玻璃，真实房间位于玻璃后方；幕墙为向内封闭的24mm等效单层玻璃，大堂面板为12mm、原栏板15mm、原雨棚16mm，不代表双层中空玻璃或实测商品参数；物理透射开销较高。不透射为明确对照档，不能代替室内验收。天光使用 Three.js 大气散射、艺术化蓝调与夜空；夕阳混合本地 CC0 Poly Haven 纯天空 HDRI（静态捕获，非体积云），同一辐亮度用于环境反射；庭院探针捕获实际地面，没有城市摄影贴图、SSR或视差校正。六间样板房采用本地 Cycles 烘焙的灯具漫反射光照，含静态遮挡与反弹；网页按夜间系数连续混合，不是实时光线追踪。原灯具底面的位置和尺寸用作面光源，功率为参考值，未做照度标定；金属与玻璃反射仍依赖实时环境。其余房间保留原发光近似；低画质或贴图失败时退回原照明。</p></details></fieldset>
 <details className="architecture-technical"><summary>画质设置与历史验收记录</summary><p className="citylight-disclosure">{low?'低画质已启用：简化室内细节、降低绘制分辨率和玻璃透射缓冲分辨率，并关闭阴影。此档不能替代标准画质验收。':'标准画质：完整室内几何、全分辨率透射与阴影。'} G2 未通过 · H98/C98/X98/E98/A98：NOT_READY。V14 用户最新视觉评价为约35分或更低；V13及更早评分保留为历史记录，不自动上调。原塔模型尚未替换，独立幕墙研究位于 /citylight/material-lab。最终美术验收由用户确认。</p></details></aside></div></>;
}
