'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import {useEffect,useMemo} from 'react';

import {useThree} from '@react-three/fiber';
import {makeCoastalDistrict,disposeCoastalDistrict} from '@/lib/visuals/coastalGeometry';
import {LANDMARKS} from '@/lib/experience/spaces';
import {CITY_BUILDING_COUNT} from '@/lib/experience/cityDistrict';
import {useStoryAtmosphere} from '@/lib/stores/StoryAtmosphere';
import {storyLighting} from '@/lib/visuals/storyLighting';
import * as THREE from 'three';

/** The retained authored coastal buildings surround the three original room entrances. */
export default function CityArchitecture(){
 const [a,b,c,d,e]=useGLTF(['/models/city-studies/b01-diagrid-lod.glb','/models/city-studies/b02-spiral-lod.glb','/models/city-studies/b03-deco-lod.glb','/models/citylight/v12/light-court-lod.glb','/models/citylight/v11/tide-gate-a-lod.glb']);
 const {gl}=useThree(),time=useStoryAtmosphere(s=>s.time);
 const model=useMemo(()=>makeCoastalDistrict([a.scene,b.scene,c.scene,d.scene,e.scene],new Set(Array.from({length:CITY_BUILDING_COUNT},(_,id)=>id).filter(id=>!LANDMARKS.some(value=>value===id))),true),[a.scene,b.scene,c.scene,d.scene,e.scene]);
 useEffect(()=>()=>disposeCoastalDistrict(model),[model]);
 useEffect(()=>{model.traverse(object=>{if(object instanceof THREE.Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material]){if(material instanceof THREE.MeshStandardMaterial&&material.emissive.getHex()!==0)material.emissiveIntensity=storyLighting(time).windows;}});},[model,time]);
 useEffect(()=>{gl.domElement.dataset.districtArchitecture='retained-coastal';return()=>{delete gl.domElement.dataset.districtArchitecture;};},[gl]);
 return <primitive object={model} dispose={null}/>;
}
