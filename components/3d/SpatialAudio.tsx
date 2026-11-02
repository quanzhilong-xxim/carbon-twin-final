'use client';
import {useEffect,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import type {Howl,HowlerGlobal} from 'howler';
import * as THREE from 'three';
import {useTwinStore} from '@/lib/experience/store';
import {spaceForBuilding} from '@/lib/experience/spaces';
import {buildingPosition} from '@/lib/experience/CameraDirector';

/** Original synthesized hum. No autoplay: listener and sources exist only after opt-in. */
export default function SpatialAudio(){
 const audio=useTwinStore(s=>s.audio),energy=useTwinStore(s=>s.energy),devices=useTwinStore(s=>s.devices),building=useTwinStore(s=>s.experience.building),kind=spaceForBuilding(building),sound=useRef<Howl|null>(null),listener=useRef<HowlerGlobal|null>(null),direction=useRef(new THREE.Vector3()),up=useRef(new THREE.Vector3()),clock=useRef(0);
 const running=kind==='home'?energy.enabled&&energy.hours>0:kind==='cafe'?devices.fridge:devices.server;
 useEffect(()=>{if(!audio||!running)return;let cancelled=false;void import('howler').then(({Howl,Howler})=>{if(cancelled)return;const [x,,z]=buildingPosition(building),source=kind==='home'?[x+.65,7.8,z-3.1]:kind==='cafe'?[x+2.6,6,z-2.35]:[x+2.6,6.2,z-2.2];const hum=new Howl({src:['/audio/aircon-loop.wav'],loop:true,volume:.13,html5:false});hum.pos(source[0],source[1],source[2]);hum.pannerAttr({panningModel:'HRTF',distanceModel:'inverse',refDistance:.7,maxDistance:12,rolloffFactor:1.1});sound.current=hum;listener.current=Howler;hum.play();});return()=>{cancelled=true;sound.current?.unload();sound.current=null;listener.current=null;};},[audio,running,building,kind]);
 useFrame(({camera},dt)=>{clock.current+=dt;if(!listener.current||clock.current<.05)return;clock.current=0;camera.getWorldDirection(direction.current);up.current.set(0,1,0).applyQuaternion(camera.quaternion);const p=camera.position,f=direction.current,u=up.current;listener.current.pos(p.x,p.y,p.z);listener.current.orientation(f.x,f.y,f.z,u.x,u.y,u.z);});
 return null;
}
