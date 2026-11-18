'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { Sky as ThreeSky } from 'three/examples/jsm/objects/Sky.js';
import { useStoryAtmosphere } from '@/lib/stores/StoryAtmosphere';
import {storyLighting} from '@/lib/visuals/storyLighting';
export default function StorySky({ paused = false, scale = 1, shadows = true, fogRange, cachedShadows=false,skyVisible=true }: { paused?: boolean; scale?: number; shadows?: boolean; fogRange?: [number, number]; cachedShadows?:boolean;skyVisible?:boolean }) {
  const { time, weather } = useStoryAtmosphere(), { scene, gl, invalidate } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null), fill = useRef<THREE.HemisphereLight>(null), sky = useRef<ThreeSky>(null), rain = useRef<THREE.InstancedMesh>(null);
  const elapsed = useRef(0), sunPosition = useMemo(() => new THREE.Vector3(-3, 7, 4), []), color = useMemo(() => new THREE.Color(), []), o = useMemo(() => new THREE.Object3D(), []);
  const shadowRefresh=useRef({remaining:2,interval:0});
  useEffect(()=>{if(!cachedShadows)return;const previous=gl.shadowMap.autoUpdate;gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;return()=>{gl.shadowMap.autoUpdate=previous;gl.shadowMap.needsUpdate=true;};},[gl,cachedShadows]);
  useEffect(()=>{shadowRefresh.current={remaining:2,interval:0};},[time,weather]);
  useEffect(() => { gl.domElement.dataset.storyTime = time; gl.domElement.dataset.storyWeather = weather; invalidate(); }, [gl, time, weather, invalidate]);
  const target = useMemo(() => {const light=storyLighting(time,weather);return {...light,sun:new THREE.Vector3(...light.sun),color:new THREE.Color(light.fog)};}, [time, weather]);
  useFrame((_, dt) => {
    const d = paused ? 1 : 1 - Math.exp(-Math.min(dt, .08) * 2.5);
    sunPosition.lerp(target.sun, d); if (sky.current) sky.current.material.uniforms.sunPosition.value.copy(sunPosition);
    if (sun.current) { sun.current.position.copy(sunPosition).multiplyScalar(cachedShadows?scale:1); sun.current.intensity = THREE.MathUtils.lerp(sun.current.intensity, target.sunPower, d); sun.current.color.set(target.sunColor); }
    if(cachedShadows&&shadows){const refresh=shadowRefresh.current;if(refresh.remaining>=0){refresh.remaining-=Math.min(dt,.1);refresh.interval-=Math.min(dt,.1);if(refresh.interval<=0||refresh.remaining<0){gl.shadowMap.needsUpdate=true;refresh.interval=.25;}}}
    if (fill.current) fill.current.intensity = THREE.MathUtils.lerp(fill.current.intensity, target.fill, d);
    if (scene.fog instanceof THREE.Fog) { scene.fog.color.lerp(target.color, d); color.copy(scene.fog.color); }
    if (!paused) elapsed.current += Math.min(dt, .05);
    if (rain.current) { rain.current.visible = weather === 'rain'; if (weather === 'rain') { for (let i = 0; i < 190; i++) { o.position.set(Math.sin(i * 13.13) * 7, 7 - ((elapsed.current * 6 + i * .17) % 8), Math.cos(i * 7.7) * 5); o.rotation.set(0, 0, -.18); o.updateMatrix(); rain.current.setMatrixAt(i, o.matrix); } rain.current.instanceMatrix.needsUpdate = true; } }
  });
  return <><fog attach="fog" args={['#c8a992', fogRange?.[0] ?? 22*scale, fogRange?.[1] ?? 65*scale]} /><hemisphereLight ref={fill} args={['#d8e4df', '#384332', 1.1]} /><directionalLight ref={sun} position={[-3, 7, 4]} intensity={2.4} castShadow={shadows&&(time==='morning'||time==='evening')} shadow-mapSize={cachedShadows?[2048,2048]:[1024,1024]} shadow-camera-left={cachedShadows?-70:-8} shadow-camera-right={cachedShadows?70:8} shadow-camera-top={cachedShadows?80:7} shadow-camera-bottom={cachedShadows?-60:-4} shadow-camera-far={cachedShadows?300:500} shadow-normalBias={.045} shadow-bias={-.00015} />{skyVisible&&<Sky ref={sky} distance={450000} sunPosition={[-3, 7, 4]} turbidity={weather === 'rain' ? 18 : 4} rayleigh={1.3} />}{time === 'night' && <Stars radius={90*scale} depth={10} count={400} factor={2} fade speed={0} />}<instancedMesh ref={rain} args={[undefined, undefined, 190]} scale={scale} frustumCulled={false}><cylinderGeometry args={[.003, .003, .17, 3]} /><meshBasicMaterial color="#d0dfe6" transparent opacity={.38} depthWrite={false} /></instancedMesh></>;
}

/** Window light follows the same clock. Device power remains independent;
 * changing the sky never turns a fridge or an electrical load on or off. */
export function StoryInteriorAtmosphere() {
  const {time,weather}=useStoryAtmosphere(),{gl,invalidate}=useThree();
  useEffect(()=>{gl.domElement.dataset.storyTime=time;gl.domElement.dataset.storyWeather=weather;invalidate();},[gl,time,weather,invalidate]);
  return <rectAreaLight position={[-4.2,2.3,0]} rotation={[0,-Math.PI/2,0]} width={6} height={3} intensity={storyLighting(time,weather).interior} color={time==='evening'?'#f9d2a2':time==='night'||time==='bluehour'?'#8cabc8':'#d4e6ec'}/>;
}
