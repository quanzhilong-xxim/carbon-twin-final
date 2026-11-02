'use client';
import {useEffect,useRef} from 'react';
import {useThree,useFrame} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import gsap from 'gsap';
import {CatmullRomCurve3,PerspectiveCamera,Vector3} from 'three';
import FirstPersonController from './FirstPersonController';
import {cameraCue,scrollPose,ORBIT_POSE} from '@/lib/experience/CameraDirector';
import {CAPABILITIES} from '@/lib/experience/ExperienceMachine';
import {useTwinStore,twinClock} from '@/lib/experience/store';
import {useUIStore} from '@/lib/stores/UIStore';

export default function TwinCamera(){
 const {camera,invalidate}=useThree(),controls=useRef<OrbitControlsImpl>(null),experience=useTwinStore(s=>s.experience),dispatch=useTwinStore(s=>s.dispatch),reduced=useUIStore(s=>s.reduced),presenting=useUIStore(s=>s.presentation);
 useEffect(()=>{const orbit=controls.current;if(!orbit)return;const cue=cameraCue(experience);if(!cue)return;orbit.enabled=false;
  // Rebase every cue on the visible pose, including the user's last orbit/walk.
  const start=camera.position.clone(),end=new Vector3(...cue.position),mid=start.clone().lerp(end,.5);
  const changingView=experience.state==='viewing';
  if(!changingView){const distance=start.distanceTo(end);mid.y+=Math.min(2,distance*.07);mid.x+=Math.min(1.2,distance*.03);}
  const path=new CatmullRomCurve3([start,mid,end],false,'centripetal'),progress={t:0},targetStart=camera.getWorldDirection(new Vector3()).multiplyScalar(Math.max(1,start.distanceTo(orbit.target))).add(start),targetEnd=new Vector3(...cue.target);
  const lens=camera instanceof PerspectiveCamera?camera:null,startFov=lens?.fov??50,endFov=changingView&&experience.view==='walk'?45:50;
  const timeline=gsap.timeline({onUpdate:()=>{
   path.getPoint(progress.t,camera.position);orbit.target.lerpVectors(targetStart,targetEnd,progress.t);camera.lookAt(orbit.target);
   if(lens){lens.fov=startFov+(endFov-startFov)*progress.t;lens.updateProjectionMatrix();}invalidate();
  },onComplete:()=>{dispatch({type:'CAMERA_DONE'});}});
  timeline.to(progress,{t:1,duration:reduced?.01:experience.state==='entering'?2.1:experience.state==='focusing'?2:1.5,ease:changingView?'power3.inOut':'power4.inOut'});
  return()=>{timeline.kill();};
 },[camera,dispatch,experience,invalidate,reduced]);
 useFrame(()=>{if(experience.state!=='scrolling'||!controls.current)return;const cue=scrollPose(twinClock.scroll);camera.position.set(...cue.position);controls.current.target.set(...cue.target);camera.lookAt(controls.current.target);});
 const room=['room','inspecting','layout','viewing'].includes(experience.state),walk=room&&experience.view==='walk';
 return <><FirstPersonController/><OrbitControls ref={controls} makeDefault enabled={CAPABILITIES[experience.state].orbit&&!walk&&!presenting} enableDamping dampingFactor={.08} target={experience.state==='loading'?ORBIT_POSE.target:undefined} enablePan={false} enableZoom={!room} minDistance={room?1:8} maxDistance={160} minPolarAngle={.16} maxPolarAngle={room?Math.PI*.48:Math.PI*.46} onChange={()=>{if(room&&camera.position.y<5.5)camera.position.y=5.5;}}/></>;
}
