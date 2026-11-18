'use client';
import { useGLTF } from '@/lib/three/scene-assets';
import {useEffect,useMemo} from 'react';

import {useThree} from '@react-three/fiber';
import {makeWaterfrontLandscape} from '@/lib/visuals/waterfrontLandscape';
import {storyLighting} from '@/lib/visuals/storyLighting';
import {useStoryAtmosphere} from '@/lib/stores/StoryAtmosphere';

export default function WaterfrontLandscape(){
  const {scene}=useGLTF('/models/citylight/v12/light-court-lod.glb'),{gl}=useThree(),time=useStoryAtmosphere(s=>s.time);
  const landscape=useMemo(()=>makeWaterfrontLandscape(scene),[scene]);
  useEffect(()=>()=>landscape.dispose(),[landscape]);
  useEffect(()=>{landscape.light.emissiveIntensity=storyLighting(time).windows;},[landscape,time]);
  useEffect(()=>{gl.domElement.dataset.waterfrontLandscape='v124-light-court-surfaces';return()=>{delete gl.domElement.dataset.waterfrontLandscape;};},[gl]);
  return <primitive object={landscape.group} dispose={null}/>;
}
