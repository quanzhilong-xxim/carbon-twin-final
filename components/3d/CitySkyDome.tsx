'use client';
import {useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useStoryAtmosphere} from '@/lib/stores/StoryAtmosphere';
import {storyLighting} from '@/lib/visuals/storyLighting';

/** A continuous atmospheric backdrop, also visible to the real reflection probe. */
export default function CitySkyDome({paused=false}:{paused?:boolean}) {
  const {time,weather}=useStoryAtmosphere();
  const uniforms=useMemo(()=>({zenith:{value:new THREE.Color('#456f91')},horizon:{value:new THREE.Color('#c4d3cf')},glow:{value:new THREE.Color('#f4d4ac')},sun:{value:new THREE.Vector3(-3,7,4).normalize()},sunStrength:{value:.35}}),[]);
  const target=useMemo(()=>{const light=storyLighting(time,weather);return {zenith:new THREE.Color(light.zenith),horizon:new THREE.Color(light.horizon),glow:new THREE.Color(light.glow),sun:new THREE.Vector3(...light.sun).normalize(),sunStrength:light.halo};},[time,weather]);
  useFrame((_,dt)=>{const blend=paused?1:1-Math.exp(-Math.min(dt,.1)*2.5);uniforms.zenith.value.lerp(target.zenith,blend);uniforms.horizon.value.lerp(target.horizon,blend);uniforms.glow.value.lerp(target.glow,blend);uniforms.sun.value.lerp(target.sun,blend);uniforms.sunStrength.value=THREE.MathUtils.lerp(uniforms.sunStrength.value,target.sunStrength,blend);});
  return <mesh name="Continuous-city-atmosphere" frustumCulled={false} renderOrder={-100}>
    <sphereGeometry args={[250,32,20]}/>
    <shaderMaterial uniforms={uniforms} side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false}
      vertexShader={'varying vec3 direction;void main(){direction=normalize(position);vec4 world=modelMatrix*vec4(position,1.0);world.xyz+=cameraPosition;gl_Position=projectionMatrix*viewMatrix*world;}'}
      fragmentShader={`varying vec3 direction;
        uniform vec3 zenith; uniform vec3 horizon; uniform vec3 glow;
        uniform vec3 sun; uniform float sunStrength;
        void main(){
          vec3 d=normalize(direction);
          float elevation=pow(clamp(d.y,0.0,1.0),0.55);
          vec3 c=mix(horizon,zenith,elevation);
          float halo=pow(max(dot(d,normalize(sun)),0.0),12.0)*sunStrength;
          c+=glow*halo; gl_FragColor=vec4(c,1.0);
          #include <colorspace_fragment>
        }`}/>
  </mesh>;
}
