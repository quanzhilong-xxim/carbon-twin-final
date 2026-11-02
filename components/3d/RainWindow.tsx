'use client';
import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
export default function RainWindow(){
 const material=useMemo(()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform float uTime;varying vec2 vUv;float hash(float n){return fract(sin(n*91.7)*43758.5);}void main(){vec2 uv=vUv*vec2(28.,10.);float col=floor(uv.x),seed=hash(col);float y=fract(uv.y*.25+uTime*(.045+seed*.06)+seed);float dx=fract(uv.x)-.5-sin(y*8.+seed*6.)*.12;float bead=exp(-pow(dx*12.,2.)-pow((y-.45)*38.,2.));float trail=exp(-pow(dx*24.,2.))*smoothstep(.1,.45,y)*(1.-smoothstep(.45,.52,y))*.22;float a=bead*.33+trail;gl_FragColor=vec4(vec3(.67,.82,.91),a);}`}),[]);
 useFrame(({clock})=>{material.uniforms.uTime.value=clock.elapsedTime;});useEffect(()=>()=>material.dispose(),[material]);
 // Primitive resources are owned by this component. A dispose prop on the
 // material itself would overwrite its dispose method before our cleanup.
 return <mesh position={[-3.88,2.05,-.2]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[6.5,2.2]}/><primitive object={material} attach="material"/></mesh>;
}
