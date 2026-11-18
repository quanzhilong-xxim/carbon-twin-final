'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import * as THREE from 'three';

import { installSurfaceReveal } from '@/lib/visuals/surfaceReveal';


const particleVertex = `
uniform float uProgress;
uniform float uOpacity;
uniform float uTime;
uniform float uTreeScale;
attribute vec3 aOrigin;
attribute float aSeed;
varying float vAlpha;
varying float vSeed;
void main() {
  float form = smoothstep(0.0, 1.0, uProgress);
  vec3 localPosition = mix(aOrigin, position, form) * uTreeScale;
  float drift = (1.0 - form) * 0.12;
  localPosition += vec3(sin(uTime * 0.7 + aSeed * 6.28), cos(uTime * 0.8 + aSeed * 5.1), sin(uTime * 0.5 + aSeed * 8.0)) * drift;
  vec4 viewPosition = modelViewMatrix * vec4(localPosition, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp((2.2 + mod(aSeed * 13.0, 2.8)) / max(0.8, -viewPosition.z), 1.0, 6.0);
  vAlpha = uOpacity * (0.5 + 0.5 * sin(uTime * 1.8 + aSeed * 9.0));
  vSeed = aSeed;
}`;

const particleFragment = `
varying float vAlpha;
varying float vSeed;
void main() {
  float radius = length(gl_PointCoord - vec2(0.5));
  float glow = 1.0 - smoothstep(0.08, 0.5, radius);
  vec3 green = vec3(0.62, 0.94, 0.56);
  vec3 warm = vec3(1.0, 0.78, 0.46);
  vec3 color = mix(green, warm, 0.5 + 0.5 * sin(vSeed * 41.0));
  gl_FragColor = vec4(color, glow * vAlpha);
}`;

function areaOf(mesh: THREE.Mesh) {
  const position = mesh.geometry.getAttribute('position');
  const index = mesh.geometry.index;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const world = mesh.matrixWorld;
  let area = 0;
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    const ia = index ? index.getX(i) : i, ib = index ? index.getX(i + 1) : i + 1, ic = index ? index.getX(i + 2) : i + 2;
    a.fromBufferAttribute(position, ia).applyMatrix4(world);
    b.fromBufferAttribute(position, ib).applyMatrix4(world);
    c.fromBufferAttribute(position, ic).applyMatrix4(world);
    area += b.sub(a).cross(c.sub(a)).length() * .5;
  }
  return area;
}

function surfaceSamples(model: THREE.Group, count: number) {
  model.updateMatrixWorld(true);
  const sources: { mesh: THREE.Mesh; sampler: MeshSurfaceSampler; area: number; cumulative: number }[] = [];
  let totalArea = 0;
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const area = areaOf(object);
    if (area <= 0) return;
    totalArea += area;
    sources.push({ mesh: object, sampler: new MeshSurfaceSampler(object).build(), area, cumulative: totalArea });
  });
  if (!sources.length) throw new Error('CT_ParkTree_Web_v3.glb has no sampleable surface.');
  const origin = model.getWorldPosition(new THREE.Vector3()), point = new THREE.Vector3(), normal = new THREE.Vector3();
  const targets = new Float32Array(count * 3), seeds = new Float32Array(count);
  let seed = 20261108;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < count; i++) {
    const pick = random() * totalArea;
    const source = sources.find(item => pick <= item.cumulative) ?? sources.at(-1)!;
    source.sampler.sample(point, normal);
    point.applyMatrix4(source.mesh.matrixWorld).sub(origin);
    targets.set(point.toArray(), i * 3);
    seeds[i] = random();
  }
  return { targets, seeds };
}

export function FormationTree({ progress, night }: { progress: MutableRefObject<number>; night: boolean }) {
  const { scene } = useGLTF('/models/urban-vegetation/CT_ParkTree_Hero_v4.glb');
  const root = useRef<THREE.Group>(null), bed = useRef<THREE.Group>(null), particles = useRef<THREE.Points>(null), particleMaterial = useRef<THREE.ShaderMaterial>(null);
  const reveal = useMemo(() => ({ value: 0 }), []);
  const bedGeometry = useMemo(() => [new THREE.CircleGeometry(9, 56), new THREE.RingGeometry(8.8, 10.3, 56)], []);
  const bedMaterials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: '#71674c', roughness: .98, transparent: true, opacity: 0, depthWrite: false }),
    new THREE.MeshStandardMaterial({ color: '#3a503b', roughness: .96, transparent: true, opacity: 0, depthWrite: false }),
  ], []);
  const { model, materials, foliage } = useMemo(() => {
    const model = scene.clone(true), materials: THREE.MeshStandardMaterial[] = [],foliage:{object:THREE.Mesh;x:number;y:number}[]=[];
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true; object.receiveShadow = true;
      object.renderOrder = 0;
      const source = Array.isArray(object.material) ? object.material : [object.material];
      const clones = source.map(original => {
        // Bark and foliage need mapped roughness/normal, not the GLTF
        // physical-material extensions used for architectural glass.
        const material = new THREE.MeshStandardMaterial().copy(original as THREE.MeshStandardMaterial);
        material.transparent = false; material.opacity = 1; material.depthWrite = true;
        if (material.name.includes('leaves')) {
          material.color.set('#ecf4cf');material.side=THREE.DoubleSide;material.alphaTest=.28;material.roughness=.74;
          material.emissive.set('#263717');material.emissiveIntensity=.025;
          foliage.push({object,x:object.rotation.x,y:object.rotation.y});
        } else {material.roughness=.94;}
        installSurfaceReveal(material, reveal);
        materials.push(material);
        return material;
      });
      object.material = Array.isArray(object.material) ? clones : clones[0];
    });
    return { model, materials, foliage };
  }, [scene, reveal]);
  useEffect(()=>{materials.forEach(material=>{if(material.name.includes('leaves')){material.emissive.set(night?'#344322':'#263717');material.emissiveIntensity=night?.12:.025;}});},[materials,night]);
  const data = useMemo(() => surfaceSamples(model, 6200), [model]);
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    const origins = new Float32Array(data.targets.length);
    for (let i = 0; i < origins.length / 3; i++) {
      const offset = i * 3;
      origins[offset] = data.targets[offset] + (Math.sin(i * 127.1) - .5) * 24;
      origins[offset + 1] = data.targets[offset + 1] + (Math.sin(i * 79.7) - .5) * 18;
      origins[offset + 2] = data.targets[offset + 2] + (Math.sin(i * 43.3) - .5) * 20;
    }
    result.setAttribute('position', new THREE.BufferAttribute(data.targets, 3));
    result.setAttribute('aOrigin', new THREE.BufferAttribute(origins, 3));
    result.setAttribute('aSeed', new THREE.BufferAttribute(data.seeds, 1));
    return result;
  }, [data]);
  const uniforms = useMemo(() => ({ uProgress: { value: 0 }, uOpacity: { value: 0 }, uTime: { value: 0 }, uTreeScale: { value: 0 } }), []);
  const contact = useMemo(() => ({ uCoverage: { value: 0 } }), []);
  useEffect(() => () => {
    geometry.dispose(); materials.forEach(material => material.dispose());
    bedGeometry.forEach(item => item.dispose()); bedMaterials.forEach(material => material.dispose());
  }, [bedGeometry, bedMaterials, geometry, materials]);
  useFrame(state => {
    const p = progress.current, grow = THREE.MathUtils.smoothstep(p, .10, .21);
    const bedGrow = THREE.MathUtils.smoothstep(p, .015, .13), bedFade = 1 - THREE.MathUtils.smoothstep(p, .34, .5);
    const treeScale = 1.65;
    if (root.current) { root.current.visible = grow > .001; root.current.scale.setScalar(treeScale); }
    if (bed.current) { bed.current.visible = bedGrow > .001 && bedFade > .001; bed.current.scale.set(bedGrow, 1, bedGrow); }
    bedMaterials[0].opacity = bedFade * .82; bedMaterials[1].opacity = bedFade * .34;
    reveal.value = grow;
    contact.uCoverage.value = grow * .32;
    if (particleMaterial.current) {
      particleMaterial.current.uniforms.uProgress.value = THREE.MathUtils.smoothstep(p, .03, .18);
      particleMaterial.current.uniforms.uOpacity.value = 1 - THREE.MathUtils.smoothstep(p, .16, .23);
      particleMaterial.current.uniforms.uTime.value = state.clock.elapsedTime;
      particleMaterial.current.uniforms.uTreeScale.value = treeScale;
    }
    if (particles.current) particles.current.visible = p < .36;
    foliage.forEach(({object,x,y},i)=>{
      object.rotation.x=x+Math.sin(state.clock.elapsedTime*.85+i)*.003;
      object.rotation.y=y+Math.cos(state.clock.elapsedTime*.65+i)*.004;
    });
  });
  return <group position={[28, 0, 8]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .015, 0]} renderOrder={2}>
      <planeGeometry args={[28, 23]} />
      <shaderMaterial transparent depthWrite={false} uniforms={contact} vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`varying vec2 vUv;uniform float uCoverage;void main(){float r=length((vUv-.5)*2.);gl_FragColor=vec4(.025,.055,.03,(1.-smoothstep(.05,1.,r))*uCoverage);}`} />
    </mesh>
    <group ref={bed} position={[0, -.075, 0]} visible={false}>
      <mesh geometry={bedGeometry[0]} material={bedMaterials[0]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -.025, 0]} receiveShadow />
      <mesh geometry={bedGeometry[1]} material={bedMaterials[1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />
    </group>
    <points ref={particles} geometry={geometry} frustumCulled={false} renderOrder={1}><shaderMaterial ref={particleMaterial} uniforms={uniforms} vertexShader={particleVertex} fragmentShader={particleFragment} transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
    <primitive ref={root} object={model} visible={false} dispose={null} />
  </group>;
}

/** The same botanical chapter remains readable in explicitly labelled 2D mode. */
export function FormationTreeDiagram({ progress }: { progress: number }) {
  const opacity = THREE.MathUtils.smoothstep(progress, .08, .23) * (1 - THREE.MathUtils.smoothstep(progress, .36, .54));
  return <svg className="formation-tree-diagram" viewBox="0 0 500 350" aria-hidden="true" style={{ opacity }}>
    <ellipse cx="250" cy="313" rx="96" ry="16" fill="#203d2a" stroke="#91ad79" strokeOpacity=".35" />
    <path d="M250 311Q254 247 250 180Q250 143 258 104M250 244Q217 204 197 167M252 212Q294 187 313 146M251 183Q222 161 213 120M253 162Q277 134 280 98" fill="none" stroke="#a18660" strokeWidth="6" strokeLinecap="round" />
    {Array.from({ length: 72 }, (_, i) => { const a = i * 2.39996, r = Math.sqrt((i + .5) / 72); return <ellipse key={i} cx={250 + Math.cos(a) * r * 102} cy={125 + Math.sin(a) * r * 69} rx={9} ry={4} transform={`rotate(${i * 17} ${250 + Math.cos(a) * r * 102} ${125 + Math.sin(a) * r * 69})`} fill={['#83aa6c', '#b6cc8d', '#557d4d'][i % 3]} />; })}
  </svg>;
}

