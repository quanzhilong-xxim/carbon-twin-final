'use client';
import {useEffect,useMemo,useRef,useCallback} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useTwinStore} from '@/lib/experience/store';
import {useUIStore} from '@/lib/stores/UIStore';
import {buildingPosition} from '@/lib/experience/CameraDirector';
import {spaceForBuilding,type SpaceObject} from '@/lib/experience/spaces';
import {walkStep} from '@/lib/experience/navigation';

export default function FirstPersonController(){
 const {camera,gl,scene}=useThree(),experience=useTwinStore(s=>s.experience),active=experience.view==='walk'&&['room','inspecting'].includes(experience.state);
 const keys=useRef(new Set<string>()),angles=useRef(new THREE.Euler(0,0,0,'YXZ')),hit=useRef<SpaceObject|null>(null),elapsed=useRef(0),gait=useRef(0),bob=useRef(0);
 const ray=useMemo(()=>new THREE.Raycaster(),[]),center=useMemo(()=>new THREE.Vector2(),[]),outline=useMemo(()=>{const h=new THREE.BoxHelper(new THREE.Object3D(),0xc5ead3);h.name='navigation-outline';h.raycast=()=>{};h.visible=false;h.material.depthTest=false;h.material.transparent=true;h.material.opacity=.55;return h;},[]);
 const pick=useCallback(()=>{
  ray.setFromCamera(center,camera);
  let target:THREE.Object3D|null=null,id:SpaceObject|null=null;
  for(const intersection of ray.intersectObjects(scene.children,true)){
   const mesh=intersection.object;if(!(mesh instanceof THREE.Mesh)||!mesh.visible)continue;
   let visible=true;for(let o:THREE.Object3D|null=mesh;o;o=o.parent)if(!o.visible)visible=false;if(!visible)continue;
   const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   if(mats.every(m=>m.transparent&&m.opacity<.35))continue;
   for(let o:THREE.Object3D|null=mesh;o;o=o.parent)if(o.name.startsWith('inspect-')){target=o;id=o.name.slice(8) as SpaceObject;break;}
   // The nearest opaque surface occludes items behind it, including walls.
   break;
  }
  outline.visible=!!target;if(target)outline.setFromObject(target);
  if(hit.current!==id){hit.current=id;useTwinStore.setState({hovered:id});if(id)window.dispatchEvent(new Event('twin-foley'));}
  gl.domElement.dataset.target=id??'';
 },[ray,center,camera,scene,outline,gl]);
 useEffect(()=>{scene.add(outline);return()=>{scene.remove(outline);outline.geometry.dispose();outline.material.dispose();};},[scene,outline]);
 useEffect(()=>{
  if(!active){outline.visible=false;return;}
  const pressed=keys.current,canvas=gl.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','第一人称房间漫游：拖拽环视，WASD 移动，点击准星物品，Escape 返回');
  canvas.focus({preventScroll:true});angles.current.setFromQuaternion(camera.quaternion,'YXZ');pressed.clear();let drag:{id:number;x:number;y:number;travel:number}|null=null;
  const down=(e:PointerEvent)=>{if(e.button!==0)return;e.stopImmediatePropagation();canvas.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY,travel:0};canvas.setPointerCapture(e.pointerId);};
  const move=(e:PointerEvent)=>{e.stopImmediatePropagation();if(!drag||(useUIStore.getState().networkBusy||useUIStore.getState().presentation))return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.travel+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;angles.current.y-=dx*.003;angles.current.x=THREE.MathUtils.clamp(angles.current.x-dy*.003,-1.15,1.15);camera.quaternion.setFromEuler(angles.current);};
  const up=(e:PointerEvent)=>{e.stopImmediatePropagation();if(drag&&drag.travel<6&&!(useUIStore.getState().networkBusy||useUIStore.getState().presentation)){pick();if(hit.current)useTwinStore.getState().dispatch({type:'SELECT',object:hit.current});else useTwinStore.getState().dispatch({type:'CLEAR'});}drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
  const click=(e:MouseEvent)=>e.stopImmediatePropagation(),cancel=()=>{drag=null;pressed.clear();};
  const keydown=(e:KeyboardEvent)=>{if(document.activeElement!==canvas)return;if(e.code==='Escape'){useTwinStore.getState().dispatch({type:'VIEW',view:'orbit'});return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(e.code)){e.preventDefault();pressed.add(e.code);}};
  const keyup=(e:KeyboardEvent)=>pressed.delete(e.code);
  canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move,true);canvas.addEventListener('pointerup',up,true);canvas.addEventListener('click',click,true);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('blur',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);
  return()=>{canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',up,true);canvas.removeEventListener('click',click,true);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('blur',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);pressed.clear();hit.current=null;useTwinStore.setState({hovered:null});delete canvas.dataset.target;canvas.removeAttribute('aria-label');};
 },[active,camera,gl,outline,pick]);
 useFrame((_,delta)=>{
  if(!active)return;
  let traveled=0;const s=useTwinStore.getState(),[ox,,oz]=buildingPosition(s.experience.building),dt=Math.min(delta,.04),k=keys.current;
  const forward=Number(k.has('KeyW')||k.has('ArrowUp'))-Number(k.has('KeyS')||k.has('ArrowDown')),side=Number(k.has('KeyD')||k.has('ArrowRight'))-Number(k.has('KeyA')||k.has('ArrowLeft'));
  if(!(useUIStore.getState().networkBusy||useUIStore.getState().presentation)&&(forward||side)){const a=angles.current.y,speed=1.55*dt/Math.hypot(forward,side),dx=(side*Math.cos(a)-forward*Math.sin(a))*speed,dz=(-forward*Math.cos(a)-side*Math.sin(a))*speed;const [x,z]=walkStep(spaceForBuilding(s.experience.building),s.layout,camera.position.x-ox,camera.position.z-oz,dx,dz);traveled=Math.hypot(ox+x-camera.position.x,oz+z-camera.position.z);camera.position.x=ox+x;camera.position.z=oz+z;}
  const reduced=useUIStore.getState().reduced;gait.current+=traveled*6.5;bob.current=THREE.MathUtils.damp(bob.current,!reduced&&traveled>.0001?Math.sin(gait.current)*.012:0,12,dt);camera.position.y=6.6+bob.current;angles.current.z=THREE.MathUtils.damp(angles.current.z,!reduced&&traveled>.0001?Math.sin(gait.current*.5)*.002:0,12,dt);camera.quaternion.setFromEuler(angles.current);
  gl.domElement.dataset.eyeHeight=(camera.position.y-5).toFixed(2);gl.domElement.dataset.walkPosition=`${(camera.position.x-ox).toFixed(2)},${(camera.position.z-oz).toFixed(2)}`;
  elapsed.current+=dt;if(elapsed.current>.1){elapsed.current=0;pick();}
 });
 return null;
}

