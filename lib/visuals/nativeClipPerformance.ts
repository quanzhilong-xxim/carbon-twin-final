import * as THREE from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {AvatarAction} from '@/components/3d/IdentityAvatar';
import type {CharacterPose} from './characterPerformance';
import type {Identity} from '@/lib/store';

/** Fit the retained G cotton shells on this instance only. Their UV grid also
 * identifies the original two sides of the 1 mm turned edge, so the same
 * displacement preserves fabric thickness, topology and all skin bindings. */
function fitBusinessCollar(model:THREE.Group,id:Identity){
 const owned:THREE.BufferGeometry[]=[];
 if(id!=='business'||!model.getObjectByName('CT_Business_Explore_v123g'))return owned;
 const leafNames=['V122s turned spread collar leaf','V122s turned spread collar leaf.001'].map(THREE.PropertyBinding.sanitizeNodeName);
 const shirtName=THREE.PropertyBinding.sanitizeNodeName('V122x V opening shirt fitted to wool and lapels');
 model.traverse(object=>{
  if(!(object instanceof THREE.Mesh)||(!leafNames.includes(object.name)&&object.name!==shirtName))return;
  const geometry=object.geometry.clone(),position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  if(!uv){geometry.dispose();return;}
  const leaf=leafNames.includes(object.name),side=object.name===leafNames[1]?1:-1;
  let maxDisplacement=0;
  for(let i=0;i<position.count;i++){
   const before=new THREE.Vector3().fromBufferAttribute(position,i),after=before.clone();
   if(leaf){
    const u=uv.getX(i),t=1-uv.getY(i);
    // Original S/F shell centre in the GLB's Y-up coordinate system.
    const oldX=THREE.MathUtils.lerp(.008,.049,u)*(1-t)+THREE.MathUtils.lerp(.023,.064,u)*t;
    const oldY=THREE.MathUtils.lerp(1.074,1.065,u)*(1-t)+THREE.MathUtils.lerp(1.036,1.017,u)*t;
    const top=THREE.MathUtils.smoothstep(oldY,1.038,1.068);
    const tip=(1-THREE.MathUtils.smoothstep(oldY,1.018,1.049))*THREE.MathUtils.smoothstep(oldX,.030,.059);
    const oldZ=THREE.MathUtils.lerp(.102,.088,u)*(1-t)+THREE.MathUtils.lerp(.166,.153,u)*t+.007*Math.sin(u*Math.PI)*Math.sin(t*Math.PI)+.0025*top;
    // Seat the root on the existing elliptical neckband, then taper the same
    // leaf toward the tie instead of leaving a wide, floating rectangular tip.
    const neck=.90-.15*u,theta=.12+.80*u;
    const rootX=(.049-.007*neck)*Math.sin(theta),rootZ=.022+(.075-.010*neck)*Math.cos(theta);
    const rootY=1.045+.030*neck-.004*Math.cos(theta);
    const x=THREE.MathUtils.lerp(rootX,.022+.026*u,t),y=THREE.MathUtils.lerp(rootY,1.043-.012*u,t);
    const z=THREE.MathUtils.lerp(rootZ,.149-.012*u,t)+.003*Math.sin(u*Math.PI)*Math.sin(t*Math.PI);
    after.add(new THREE.Vector3(side*(x-oldX*(1-.075*tip)),y-(oldY+.007*tip),z-oldZ));
   }else{
    // The retained shirt's flat top extended beyond the two leaves. Blend
    // only its upper 30 mm into the same neck opening; keep the lower V intact.
    const blend=THREE.MathUtils.smoothstep(before.y,1.040,1.070),across=Math.min(1,Math.abs(before.x)/.0649);
    after.x=THREE.MathUtils.lerp(before.x,Math.sign(before.x)*.045*across,blend);
    after.y=THREE.MathUtils.lerp(before.y,1.068-.006*across*across,blend);
    after.z=THREE.MathUtils.lerp(before.z,.089-.018*across*across,blend);
   }
   maxDisplacement=Math.max(maxDisplacement,after.distanceTo(before));position.setXYZ(i,after.x,after.y,after.z);
  }
  position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  object.geometry=geometry;owned.push(geometry);
  object.userData.collarFit={revision:'v13-instance-fit-1',maxDisplacement};
 });
 return owned;
}

/** Native GLB bindings own every bone and expression; procedural IK must not
 * write to these same bones. Source buffers and materials remain immutable. */
export function nativeClipCharacter(source:THREE.Group,id:Identity){
 const model=clone(source) as THREE.Group,skeletons=new Set<THREE.Skeleton>();
 const fittedGeometry=fitBusinessCollar(model,id);
 model.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=!/hair|head|eye|groom/i.test(object.name);object.frustumCulled=false;}if(object instanceof THREE.SkinnedMesh)skeletons.add(object.skeleton);});
 return{model,elbows:{},elbow:undefined,dispose:()=>{skeletons.forEach(skeleton=>skeleton.dispose());fittedGeometry.forEach(geometry=>geometry.dispose());}};
}

export function nativeClipPerformance(model:THREE.Group,clips:THREE.AnimationClip[],retained?:CharacterPose){
 const mixer=new THREE.AnimationMixer(model),actions=new Map(clips.map(clip=>[clip.name,mixer.clipAction(clip)]));
 const morphs:THREE.Mesh[]=[];model.traverse(object=>{if(object instanceof THREE.Mesh&&object.morphTargetInfluences)morphs.push(object);});
 // V13.2: the native GLBs ship real facial morph targets (VRM eye-close / mouth-joy
 // or Blink/Smile pairs). Drive them so the delivered characters actually blink and
 // smile instead of staying frozen at the bind expression. Names are matched
 // generically because the three roles were exported from different rig versions.
 type MorphBinding={mesh:THREE.Mesh,index:number};
 const blinkBindings:MorphBinding[]=[],smileBindings:MorphBinding[]=[];
 for(const mesh of morphs){
  const dictionary=mesh.morphTargetDictionary;if(!dictionary)continue;
  for(const [name,index] of Object.entries(dictionary)){
   if(/blink|eye[_ ]?close|fcl_eye_close/i.test(name))blinkBindings.push({mesh,index});
   else if(/smile|mouth[_ ]?joy|mth_joy|fcl_e?ye_joy|eye_joy/i.test(name))smileBindings.push({mesh,index});
  }
 }
 const setBindings=(bindings:MorphBinding[],weight:number)=>{for(const {mesh,index} of bindings){if(mesh.morphTargetInfluences)mesh.morphTargetInfluences[index]=weight;}};
 const restoreFace=()=>{setBindings(blinkBindings,0);setBindings(smileBindings,0);};
 let current:THREE.AnimationAction|undefined,requested='',serial=-1,elapsed=retained?.elapsed??0;
 let blinkWeight=0,smileWeight=0;
 const face={BlinkLeft:0,BlinkRight:0,Smile:0,GazeLeft:0,GazeRight:0,GazeDown:0};
 const select=(action:AvatarAction,sequence:number,reduced:boolean)=>{
  if(requested===action&&serial===sequence)return;
  requested=action;serial=sequence;
  const name=action==='greeting'?'Wave'
   :action==='turning'?'Turn'
   :action==='thinking'&&actions.has('Look')?'Look'
   :action==='recording'&&actions.has('Smile')?'Smile'
   :'Idle',next=actions.get(name)??actions.get('Idle');
  if(!next)return;
  // Stop residual fades before replaying the same gesture, without resetting a
  // paused action on resume. Crossfades retain the current physical pose.
  const previous=current;
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).setLoop(name==='Idle'?THREE.LoopRepeat:THREE.LoopOnce,name==='Idle'?Infinity:1);
  next.clampWhenFinished=name!=='Idle';next.play();
  if(!previous&&retained?.previous===action&&retained.sequence===sequence)next.time=retained.actionTime;
  if(reduced){actions.forEach(value=>{if(value!==next)value.stop();});next.time=name==='Idle'?0:next.getClip().duration*.35;mixer.update(0);}
  else if(previous&&previous!==next){previous.fadeOut(.28);next.fadeIn(.28);}
  current=next;
 };
 return{
  snapshot():CharacterPose{return{face:{...face},elapsed,actionTime:current?.time??0,previous:requested,sequence:serial,nextBlink:0,blinkStart:0,rotations:{},breath:1};},
  update(dt:number,action:AvatarAction,sequence:number,reduced:boolean,paused:boolean){
   select(action,sequence,reduced);
   if(!paused&&!reduced){const delta=Math.min(dt,.05);elapsed+=delta;mixer.update(delta);}else mixer.update(0);
   model.updateMatrixWorld(true);
   model.userData.nativeClip={name:current?.getClip().name??'',time:current?.time??0,paused:paused||reduced};
   if(reduced||paused){blinkWeight=0;smileWeight=0;restoreFace();}
   else {
    // Blink: a short close every ~4.4 s, with an occasional double blink.
    const cycle=elapsed%4.4,doubleBlink=Math.floor(elapsed/4.4)%3===1;
    const closeWindow=.16,second=doubleBlink&&cycle>.30&&cycle<.30+closeWindow;
    const phase=cycle<closeWindow?cycle:(second?cycle-.30:-1);
    blinkWeight=phase>=0&&phase<closeWindow?Math.sin(phase/closeWindow*Math.PI):0;
    setBindings(blinkBindings,blinkWeight);
    // Expression weight (not a factual claim): greeting is the clearest smile.
    const target=action==='greeting'?.72:action==='recording'||action==='guide'?.38:action==='thinking'?.22:.12;
    smileWeight+=(target-smileWeight)*Math.min(1,dt*4);
    setBindings(smileBindings,smileWeight);
   }
   const completed=Boolean(current&&current.getClip().name!=='Idle'&&current.time>=current.getClip().duration-1e-5);
   return{elapsed,blink:blinkWeight,smile:smileWeight,morphMeshes:morphs.length,completed,motion:paused?'paused':reduced?'reduced':current?.getClip().name??'Idle'};
  },
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);},
 };
}
