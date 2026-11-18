'use client';
import {useEffect,useRef,type MutableRefObject} from 'react';
import {useThree,useFrame} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import {CatmullRomCurve3,PerspectiveCamera,Vector3} from 'three';
import FirstPersonController from './FirstPersonController';
import {cameraCue,scrollPose,ORBIT_POSE,cityShotPose,type CameraSnapshot} from '@/lib/experience/CameraDirector';
import {CAPABILITIES,type ExperienceState} from '@/lib/experience/ExperienceMachine';
import {useTwinStore,twinClock} from '@/lib/experience/store';
import {useUIStore} from '@/lib/stores/UIStore';
import {recordTwinDiagnostic} from '@/lib/experience/diagnostics';

export default function TwinCamera({sessionId,savedPose}:{sessionId:string;savedPose:MutableRefObject<CameraSnapshot|null>}){
 const {camera,invalidate,gl}=useThree(),controls=useRef<OrbitControlsImpl>(null),experience=useTwinStore(s=>s.experience),shot=useTwinStore(s=>s.cityShot??'overview'),dispatch=useTwinStore(s=>s.dispatch),reduced=useUIStore(s=>s.reduced),presenting=useUIStore(s=>s.presentation);
 const previousShot=useRef(shot);
 const initialTarget=useRef(savedPose.current?.target),direction=useRef(new Vector3());
  const transition=useRef<{started:number;duration:number;apply:(progress:number)=>void;id:number;state:ExperienceState;revision:number}|null>(null);
  const transitionId=useRef(0);
 useEffect(()=>{const orbit=controls.current;if(!orbit)return;const changed=previousShot.current!==shot;previousShot.current=shot;const cue=experience.state==='orbit'&&changed?cityShotPose(shot):cameraCue(experience);if(!cue)return;orbit.enabled=false;
  // Rebase every cue on the visible pose, including the user's last orbit/walk.
  const start=camera.position.clone(),end=new Vector3(...cue.position),mid=start.clone().lerp(end,.5);
  // Disabled controls retain the previous drag's damping delta. Drain that
  // delta without moving the visible pose, or it resumes after the new cue.
  const facing=camera.quaternion.clone(),target=orbit.target.clone(),damping=orbit.enableDamping;
  orbit.enableDamping=false;orbit.update();orbit.enableDamping=damping;
  camera.position.copy(start);camera.quaternion.copy(facing);orbit.target.copy(target);
  const changingView=experience.state==='viewing';
  if(!changingView){const distance=start.distanceTo(end);mid.y+=Math.min(2,distance*.07);mid.x+=Math.min(1.2,distance*.03);}
  const path=new CatmullRomCurve3([start,mid,end],false,'centripetal'),targetStart=camera.getWorldDirection(new Vector3()).multiplyScalar(Math.max(1,start.distanceTo(orbit.target))).add(start),targetEnd=new Vector3(...cue.target);
  const lens=camera instanceof PerspectiveCamera?camera:null,startFov=lens?.fov??50,endFov=changingView&&experience.view==='walk'?45:50;
  // Shader compilation can stall GSAP's smoothed clock. Advance on the render
  // frame using monotonic time; unlock only after applying the final camera pose.
   const id=++transitionId.current,startState=experience.state,startRevision=experience.revision;
   transition.current={started:performance.now(),duration:(reduced?.01:experience.state==='entering'?2.1:experience.state==='focusing'?2:1.5)*1000,id,state:startState,revision:startRevision,apply:(progress)=>{
   const power=changingView?4:5,t=progress<.5?Math.pow(progress*2,power)/2:1-Math.pow((1-progress)*2,power)/2;
   path.getPoint(t,camera.position);orbit.target.lerpVectors(targetStart,targetEnd,t);camera.lookAt(orbit.target);
   if(lens){lens.fov=startFov+(endFov-startFov)*t;lens.updateProjectionMatrix();}gl.domElement.dataset.cityCameraPose=JSON.stringify(camera.position.toArray());gl.domElement.dataset.cityCameraShot=experience.state==='orbit'?shot:'overview';invalidate();
   }};
   recordTwinDiagnostic({kind:'camera-transition-start',sessionId,businessState:startState,renderState:useTwinStore.getState().quality,detail:`revision=${startRevision}`});
  invalidate();
  return()=>{if(transition.current?.id===id){transition.current=null;recordTwinDiagnostic({kind:'camera-transition-cancel',sessionId,businessState:startState,renderState:useTwinStore.getState().quality,detail:'effect-cleanup'});}};
  },[camera,dispatch,experience,invalidate,reduced,sessionId,shot,gl]);
  useFrame(()=>{const move=transition.current;if(move){const current=useTwinStore.getState().experience;if(current.revision!==move.revision||current.state!==move.state){transition.current=null;recordTwinDiagnostic({kind:'camera-transition-cancel',sessionId,businessState:current.state,renderState:useTwinStore.getState().quality,detail:`stale revision=${move.revision}`});return;}const progress=Math.min(1,Math.max(0,(performance.now()-move.started)/move.duration));move.apply(progress);if(progress===1){transition.current=null;recordTwinDiagnostic({kind:'camera-transition-end',sessionId,businessState:move.state,renderState:useTwinStore.getState().quality,detail:`revision=${move.revision}`});if(move.state==='orbit'&&controls.current)controls.current.enabled=!presenting;dispatch({type:'CAMERA_DONE'});}return;}if(experience.state!=='scrolling'||!controls.current)return;const cue=scrollPose(twinClock.scroll);camera.position.set(...cue.position);controls.current.target.set(...cue.target);camera.lookAt(controls.current.target);});
 const room=['room','inspecting','layout','viewing'].includes(experience.state),walk=room&&experience.view==='walk';
 // A Windows WebKit backing-store resize needs a new Canvas. Keep the user's
 // actual pose and room state across that renderer replacement.
 useFrame(()=>{if(!controls.current)return;const target=walk?camera.getWorldDirection(direction.current).multiplyScalar(3).add(camera.position):controls.current.target;savedPose.current={position:camera.position.toArray(),target:target.toArray(),fov:camera instanceof PerspectiveCamera?camera.fov:50};gl.domElement.dataset.cityCameraPose=JSON.stringify(savedPose.current.position);gl.domElement.dataset.cityCameraShot=experience.state==='orbit'?shot:'overview';});
 return <><FirstPersonController/><OrbitControls ref={controls} makeDefault enabled={CAPABILITIES[experience.state].orbit&&!walk&&!presenting} enableDamping dampingFactor={.08} target={initialTarget.current??(experience.state==='loading'?ORBIT_POSE.target:undefined)} enablePan={false} enableZoom={!room} minDistance={room?1:8} maxDistance={160} minPolarAngle={.16} maxPolarAngle={room?Math.PI*.48:shot==='waterfront'?Math.PI*.495:Math.PI*.46} onChange={()=>{if(room&&camera.position.y<5.5)camera.position.y=5.5;gl.domElement.dataset.cityCameraPose=JSON.stringify(camera.position.toArray());}}/></>;
}
