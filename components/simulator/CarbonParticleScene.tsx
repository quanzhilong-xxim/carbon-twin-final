'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import SceneStage from '../3d/SceneStage';
import { useVisualQuality } from '@/lib/hooks/useVisualQuality';
import { carbonParticleDensity, carbonParticleSamples } from '@/lib/visuals/carbonParticles';
import type { EmissionResult, Sector } from '@/lib/emissions';

const palette = ['#80dfad', '#7cbee6', '#efc486'].map(c => new THREE.Color(c));
const sectors: Sector[] = ['energy', 'transport', 'food'];
const vertex = `attribute vec3 treePosition; attribute vec3 cityPosition; attribute float sparkle;
varying vec3 vColor; varying float vSparkle;
uniform float uPixelRatio; uniform float uShape; uniform float uDisperse; uniform float uTime;
uniform vec2 uShares; uniform vec3 uEnergy; uniform vec3 uTransport; uniform vec3 uFood; uniform float uFocus;
void main(){
float phi=sparkle*6.28318530718; float swirl=phi+uDisperse*2.3+uTime*.12;
float drift=.009*sin(uTime*1.2+phi*3.);
vec3 p=mix(treePosition,cityPosition,uShape)+vec3(cos(swirl)*uDisperse*(1.1+sparkle)+drift,sin(phi*3.+uTime)*uDisperse*.65+drift,sin(swirl)*uDisperse*(1.+sparkle)+drift);
float sector=sparkle<uShares.x?0.:sparkle<uShares.x+uShares.y?1.:2.;
vColor=sector<.5?uEnergy:sector<1.5?uTransport:uFood;
vColor*=uFocus<0.||abs(uFocus-sector)<.1?1.:.18;
vSparkle=sparkle; vec4 mv=modelViewMatrix*vec4(p,1.);
gl_Position=projectionMatrix*mv; gl_PointSize=clamp((9.+sparkle*6.)*uPixelRatio/-mv.z,1.,7.); }`;
const fragment = `varying vec3 vColor; varying float vSparkle;
void main(){ float r=length(gl_PointCoord-vec2(.5))*2.; if(r>1.)discard;
float a=(1.-smoothstep(.2,1.,r))*.9; gl_FragColor=vec4(vColor*(1.+.38*(1.-r)),a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

type Props = { result: EmissionResult; shape: 'tree' | 'city'; paused: boolean; reduced: boolean; focus: Sector | null; onChoose: (sector: Sector) => void };
function Particles({ result, shape, paused, reduced, focus, onChoose }: Props) {
  const { quality } = useVisualQuality(), { camera, gl, invalidate, pointer, frameloop, raycaster } = useThree();
  const count = quality === 'lite' ? 2000 : 4400;
  const samples = useMemo(() => carbonParticleSamples(count), [count]);
  const positions = useMemo(() => samples.tree.slice(), [samples]);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // Immutable shape samples stay on the GPU. The position buffer is updated
    // only for a pointer raycast, rather than uploading both buffers every frame.
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('treePosition', new THREE.BufferAttribute(samples.tree, 3));
    g.setAttribute('cityPosition', new THREE.BufferAttribute(samples.city, 3));
    g.setAttribute('sparkle', new THREE.BufferAttribute(samples.seeds, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 4);
    return g;
  }, [positions, samples]);
  const material = useMemo(() => new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment,
    transparent: true, depthWrite: false, uniforms: { uPixelRatio: { value: 1 }, uShape: { value: 0 }, uDisperse: { value: 0 }, uTime: { value: 0 }, uShares: { value: new THREE.Vector2() }, uEnergy: { value: palette[0] }, uTransport: { value: palette[1] }, uFood: { value: palette[2] }, uFocus: { value: -1 } } }), []);
  const group = useRef<THREE.Group>(null), points = useRef<THREE.Points>(null);
  const motion = useRef({ time: 0, transition: 1, shape: shape === 'city' ? 1 : 0, from: shape === 'city' ? 1 : 0, target: shape === 'city' ? 1 : 0, density: carbonParticleDensity(result.annual), shares: [0, 0], stamp: '' });
  const targetDensity = carbonParticleDensity(result.annual), signature = result.sectors.map(s => s.value).join(':');
  const shares = [result.annual ? result.sectors[0].value / result.annual : 0, result.annual ? result.sectors[1].value / result.annual : 0];
  useEffect(() => {
    camera.position.set(0, 1.95, 6.1); camera.lookAt(0, 1, 0); invalidate();
    gl.domElement.dataset.particleScene = 'carbon-living-forms';
    raycaster.params.Points = { threshold: .055 };
    return () => { delete gl.domElement.dataset.particleScene; };
  }, [camera, gl, invalidate, raycaster]);
  useEffect(() => {
    const m = motion.current;
    m.from = m.shape; m.target = shape === 'city' ? 1 : 0; m.transition = reduced ? 1 : 0;
    // Demand mode still presents the latest data and silhouette immediately.
    if (paused || reduced || frameloop === 'demand') { m.transition = 1; m.shape = m.target; m.density = targetDensity; m.shares = shares; }
    invalidate();
    // The primitive sector values, rather than an object identity, trigger regrouping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, signature, paused, reduced, frameloop, invalidate]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, dt) => {
    const m = motion.current, stopped = paused || reduced || frameloop === 'demand', step = Math.min(dt, .05);
    if (stopped) m.transition = 1;
    if (!stopped) { m.time += step; m.transition = Math.min(1, m.transition + Math.max(0, dt) / 2.25); }
    const ease = m.transition * m.transition * (3 - 2 * m.transition);
    m.shape = stopped ? m.target : THREE.MathUtils.lerp(m.from, m.target, ease);
    m.density = stopped ? targetDensity : THREE.MathUtils.damp(m.density, targetDensity, 3, step);
    for (let j = 0; j < 2; j++) m.shares[j] = stopped ? shares[j] : THREE.MathUtils.damp(m.shares[j], shares[j], 4, step);
    const disperse = stopped ? 0 : Math.sin(m.transition * Math.PI), visible = Math.round(count * m.density);
    geometry.setDrawRange(0, visible);
    const uniforms=material.uniforms;
    uniforms.uShape.value=m.shape;uniforms.uDisperse.value=disperse;uniforms.uTime.value=m.time;
    uniforms.uShares.value.set(m.shares[0],m.shares[1]);uniforms.uFocus.value=focus?sectors.indexOf(focus):-1;
    uniforms.uPixelRatio.value = gl.getPixelRatio();
    if (group.current && !stopped) {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, pointer.x * .17, 3, step);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -pointer.y * .055, 3, step);
    }
    const stamp = `${Math.floor(m.time * 2)}:${visible}:${shape}:${paused}:${reduced}:${Math.round(ease * 10)}`;
    if (stamp !== m.stamp) {
      m.stamp = stamp;
      Object.assign(gl.domElement.dataset, { particleCount: String(visible), particleShape: shape, particleTime: m.time.toFixed(3), particleTransition: ease.toFixed(3), particlePaused: String(stopped), particleAnnual: result.annual.toFixed(4), particleCompute: 'gpu-shader' });
    }
  });
  // Keep picking aligned with the shader, including its in-between silhouette.
  // CPU work occurs only when the user points at the object.
  const pick: THREE.Points['raycast'] = function(this: THREE.Points, ray, intersections) {
    const m=motion.current,disperse=material.uniforms.uDisperse.value as number;
    for (let i = 0; i < geometry.drawRange.count; i++) {
      const n = i * 3, seed = samples.seeds[i], phi = seed * Math.PI * 2;
      const swirl = phi + disperse * 2.3 + m.time * .12;
      const drift = .009 * Math.sin(m.time * 1.2 + phi * 3);
      positions[n] = THREE.MathUtils.lerp(samples.tree[n], samples.city[n], m.shape) + Math.cos(swirl) * disperse * (1.1 + seed) + drift;
      positions[n + 1] = THREE.MathUtils.lerp(samples.tree[n + 1], samples.city[n + 1], m.shape) + Math.sin(phi * 3 + m.time) * disperse * .65 + drift;
      positions[n + 2] = THREE.MathUtils.lerp(samples.tree[n + 2], samples.city[n + 2], m.shape) + Math.sin(swirl) * disperse * (1 + seed) + drift;
    }
    THREE.Points.prototype.raycast.call(this,ray,intersections);
  };
  const choose = (event: ThreeEvent<MouseEvent>) => {
    if (event.index === undefined || event.index >= geometry.drawRange.count) return;
    event.stopPropagation(); const seed = samples.seeds[event.index], m = motion.current;
    onChoose(sectors[seed < m.shares[0] ? 0 : seed < m.shares[0] + m.shares[1] ? 1 : 2]);
  };
  return <>
    <group ref={group}><points ref={points} geometry={geometry} material={material} raycast={pick} onClick={choose} frustumCulled={false} /></group>
    <mesh position={[0, -.19, 0]}><cylinderGeometry args={[1.65, 1.48, .13, 80]} /><meshStandardMaterial color="#193b31" roughness={.6} metalness={.35} /></mesh>
    <mesh position={[0, -.117, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.58, 1.595, 80]} /><meshBasicMaterial color="#7cb399" transparent opacity={.55} /></mesh>
    <OrbitControls target={[0, .95, 0]} enablePan={false} enableDamping={!paused && !reduced} minDistance={3.8} maxDistance={8} minPolarAngle={.5} maxPolarAngle={1.55} />
  </>;
}
export default function CarbonParticleScene(props: Props) {
  return <SceneStage label="碳数据粒子：拖动环绕，点击粒子选择来源" transparent sceneLights paused={props.paused || props.reduced} pauseWhenHidden fallback={<p>三维粒子暂不可用。下方来源表和全部核算继续可操作，可重试三维视图。</p>}>
    <Particles {...props} />
  </SceneStage>;
}
