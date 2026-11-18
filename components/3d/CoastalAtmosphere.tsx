'use client';

import { useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import * as THREE from 'three';

/** Reuse the approved court's CC0 pure sky, without its building or scene. */
export default function CoastalAtmosphere({ night, dusk = false }: { night: boolean; dusk?: boolean }) {
  // The visible sky occupies a small angular crop of an equirectangular map.
  // Use the retained 4K master on desktop to avoid enlarged cloud texels;
  // reflection lighting keeps its independent, small 1K map.
  const width = useThree(state => state.size.width);
  const sky = useLoader(HDRLoader, `/environments/citylight/kloppenheim_06_puresky_${width > 1000 ? '4k' : '1k'}.hdr`);
  const uniforms = useMemo(() => ({ uNight: { value: night ? 1 : 0 }, uDusk: { value: dusk ? 1 : 0 }, uSky: { value: sky } }), [night, dusk, sky]);
  return <>
    <mesh renderOrder={-100}>
      <sphereGeometry args={[450, 32, 16]} />
      <shaderMaterial side={THREE.BackSide} depthWrite={false} uniforms={uniforms} vertexShader={`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`
        varying vec3 vDirection; uniform float uNight; uniform float uDusk; uniform sampler2D uSky;
        void main(){vec3 d=normalize(vDirection);
         vec2 uv=vec2(fract(atan(d.z,d.x)/6.2831853+.945),asin(clamp(d.y,-1.,1.))/3.14159265+.5);
         vec3 c=texture2D(uSky,uv).rgb*.47;
         float sunset=pow(max(0.,dot(d,normalize(vec3(-.8,.18,.6)))),12.);
         c=mix(c,c*vec3(1.08,.92,.73)+vec3(.11,.028,.004)*sunset,.55);
         float horizon=pow(1.-clamp(abs(d.y)*1.8,0.,1.),3.);
         float solar=dot(d,normalize(vec3(.43,.44,-.78)));
         float eveningSun=pow(max(0.,solar),100.);
         // Retain the captured cloud luminance. Compressing it to c/(1+c)
         // removed cloud depth and made the previous sky look like a gradient.
         vec3 evening=c*mix(vec3(.50,.64,.88),vec3(1.28,.80,.43),horizon);
         evening+=vec3(.16,.052,.009)*horizon+vec3(1.8,.81,.19)*eveningSun;
         evening+=vec3(12.,7.,2.5)*smoothstep(.99988,.99998,solar);
         c=mix(c,evening,uDusk);
         c=mix(c,c*vec3(.06,.12,.23)+vec3(.002,.005,.013),uNight);
         gl_FragColor=vec4(c,1.);
         #include <tonemapping_fragment>
         #include <colorspace_fragment>
        }`} />
    </mesh>
  </>;
}
