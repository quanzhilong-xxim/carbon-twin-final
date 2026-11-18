'use client';
import { Environment } from '@/lib/three/scene-assets';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import SceneStage from '../3d/SceneStage';
import { CompanionAnimal } from '../ecology/LivingAssets';
import CompanionGlade from '../ecology/CompanionGlade';
import { useUIStore } from '@/lib/stores/UIStore';
import CafeScene from '../3d/CafeScene';
import MilkJourneyAssets from './MilkJourneyAssets';
import StorySky, { StoryInteriorAtmosphere } from '../ecology/StorySky';
import { MeadowGround } from '../ecology/NaturalSurfaces';
import { useStoryAtmosphere } from '@/lib/stores/StoryAtmosphere';
import ComparisonDistrict from './ComparisonDistrict';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

function Shot({ kind, state, candidate = false }: { kind: string; state: string; candidate?: boolean }) {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => { camera.position.set(...(kind === 'cat' ? candidate ? [1.33, 1.02, 2.66] : [1.5, .85, 2.6] : kind === 'cafe' ? [5.3, 3.1, 6.4] : [4.6, 2.5, 5.5]) as [number, number, number]); camera.lookAt(0, kind === 'cat' ? candidate ? .72 : .3 : kind === 'cafe' ? 1.25 : .65, 0); invalidate(); }, [camera, invalidate, kind, candidate]);
  useEffect(() => { gl.domElement.dataset.storyScene = kind; gl.domElement.dataset.storyState = state; }, [gl, kind, state]);
  return null;
}
function Grass({ pasture = false }: { pasture?: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!mesh.current) return; const o = new THREE.Object3D(); let s = 108;
    const rand = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 680; i++) { const x = (rand() - .5) * (pasture ? 7 : 3), z = (rand() - .5) * (pasture ? 5 : 2); o.position.set(x, .01, z); o.rotation.set(0, rand() * Math.PI, (rand() - .5) * .35); o.scale.setScalar(.5 + rand()); o.updateMatrix(); mesh.current.setMatrixAt(i, o.matrix); }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [pasture]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, 680]}><coneGeometry args={[.012, .16, 3]} /><meshStandardMaterial color="#819e58" roughness={1} /></instancedMesh>;
}
function Mill({ paused }: { paused: boolean }) {
  const rotor = useRef<THREE.Group>(null); useFrame((_, dt) => { if (rotor.current && !paused) rotor.current.rotation.z += Math.min(dt, .05) * .5; });
  return <group position={[-2.35, 0, -1.5]}><mesh position={[0, .8, 0]}><cylinderGeometry args={[.14, .27, 1.6, 12]} /><meshStandardMaterial color="#c3b18c" /></mesh><group ref={rotor} position={[0, 1.6, .2]}>{[0, 1, 2, 3].map(i => <group key={i} rotation={[0, 0, i * Math.PI / 2]}><mesh position={[0, .42, 0]}><boxGeometry args={[.10, .72, .025]} /><meshStandardMaterial color="#d9caa8" /></mesh></group>)}</group></group>;
}
function Pasture({ stage, paused }: { stage: number; paused: boolean }) {
  return <group>
    <CompanionAnimal kind="cow" position={[-.6, 0, .3]} rotation={.45} paused={paused} /><CompanionAnimal kind="cow" position={[.8, 0, .6]} scale={.55} rotation={-.5} paused={paused} /><CompanionAnimal kind="sheep" position={[1.6, 0, -.7]} rotation={-.65} paused={paused} />
    <Grass pasture /><Mill paused={paused} />
    <group position={[1.25, 0, -2]}><RoundedBox args={[1.6, 1.2, 1.2]} radius={.04} position={[0, .6, 0]}><meshStandardMaterial color="#b1a080" roughness={.9} /></RoundedBox><mesh position={[0, 1.42, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.4, .68, 4]} /><meshStandardMaterial color="#736c57" /></mesh><mesh position={[0, .38, .61]}><boxGeometry args={[.48, .76, .025]} /><meshStandardMaterial color="#4d5d50" /></mesh></group>
    {Array.from({ length: 12 }, (_, i) => <group key={i} position={[-3.3 + i * .6, 0, -1.1]}><mesh position={[0, .35, 0]}><boxGeometry args={[.055, .7, .055]} /><meshStandardMaterial color="#b2a17e" /></mesh>{[.23, .52].map(y => <mesh position={[.3, y, 0]} key={y}><boxGeometry args={[.6, .05, .04]} /><meshStandardMaterial color="#b2a17e" /></mesh>)}</group>)}
    {[0, 1].map(i => <group key={i} position={[-1.9 + i * .3, 0, .8]}><mesh position={[0, .18, 0]}><cylinderGeometry args={[.10, .13, .36, 24]} /><meshStandardMaterial color="#c4ccc2" metalness={.7} roughness={.32} /></mesh><mesh position={[0, .37, 0]}><torusGeometry args={[.08, .012, 8, 24]} /><meshStandardMaterial color="#c4ccc2" metalness={.7} /></mesh></group>)}
    <MilkJourneyAssets stage={stage} paused={paused}/>
  </group>;
}
function BuildingShot({ view, paused }: { view: 'both' | 'home' | 'office'; paused: boolean }) {
  const { camera, gl, invalidate } = useThree(), controls = useRef<OrbitControlsImpl>(null), moving = useRef(true);
  const target = useMemo(() => new THREE.Vector3(view === 'home' ? -1.8 : view === 'office' ? 1.45 : 0, view === 'office' ? 1.25 : 1, 0), [view]);
  const position = useMemo(() => new THREE.Vector3(...(view === 'home' ? [-.15, 2.25, 4.3] : view === 'office' ? [3.9, 2.8, 4.4] : [5.6, 3.8, 8.6]) as [number, number, number]), [view]);
  useEffect(() => { moving.current = true; if (paused) { camera.position.copy(position); controls.current?.target.copy(target); controls.current?.update(); moving.current = false; } invalidate(); gl.domElement.dataset.buildingView = view; gl.domElement.dataset.storyScene = 'buildings'; }, [view, camera, position, target, paused, invalidate, gl]);
  useFrame((_, dt) => { if (!moving.current || !controls.current) return; const alpha = 1 - Math.exp(-Math.min(dt, .05) * 5); camera.position.lerp(position, alpha); controls.current.target.lerp(target, alpha); controls.current.update(); if (camera.position.distanceTo(position) < .008) moving.current = false; else invalidate(); });
  return <OrbitControls ref={controls} enablePan={false} minDistance={3} maxDistance={13} maxPolarAngle={1.5} onStart={() => { moving.current = false; }} />;
}
export default function StoryScene({ kind, vitality = .7, state = '', stage = 0, home = 45, office = 180, buildingView = 'both', onBuildingSelect, paused = false, reaction = 0, onInteract, companionModel }: { kind: 'cat' | 'pasture' | 'buildings' | 'cafe'; vitality?: number; state?: string; stage?: number; home?: number; office?: number; buildingView?: 'both' | 'home' | 'office'; onBuildingSelect?: (view: 'home' | 'office') => void; paused?: boolean; reaction?: number; onInteract?: () => void; companionModel?: string }) {
  const reduced = useUIStore(s => s.reduced), stopped = paused || reduced, night=useStoryAtmosphere(s=>s.time==='night');
  const candidate = kind === 'cat' && Boolean(companionModel);
  return <SceneStage label={kind === 'cat' ? '三维生态伙伴：呼吸、眨眼、耳朵与尾巴' : kind === 'pasture' ? '乳品牧场：奶牛、小牛、羊、风车与四节点' : kind === 'cafe' ? '可旋转、可操作设备的真实三维咖啡馆' : '同一运营购电边界的建筑情景'} sceneLights={false} pauseWhenHidden paused={stopped} shadows fallback={<div className="story-scene-fallback"><strong>{kind === 'cat' ? '生态伙伴' : kind === 'pasture' ? '从牧场到冰箱' : kind === 'cafe' ? '街角咖啡馆' : '建筑运营购电比较'}</strong><p>{kind === 'cat' ? `当前反馈：${state}。下方活动量、排放和反馈继续同步。` : kind === 'pasture' ? ['牧场 · 饲料与动物肠道发酵','加工 · 加热、清洗、包装','冷链 · 运输、制冷与冷媒','消费 · 储存、饮用与食物损失'][stage] : '使用下方相同边界的参数计算器；所有数字保持可用。'}</p></div>}>
    <color attach="background" args={[candidate ? '#b2c49a' : kind === 'cafe' ? '#263b32' : '#c8d1bf']} />{kind !== 'cafe' && <StorySky paused={stopped} shadows={!candidate}/>}
    <Suspense fallback={null}>{kind !== 'buildings' && <Shot kind={kind} state={state || String(stage)} candidate={candidate} />}{kind === 'cat' ? <><CompanionAnimal vitality={vitality} paused={stopped} rotation={.2} reaction={reaction} onInteract={onInteract} modelUrl={companionModel} />{candidate ? <><hemisphereLight args={['#fff5dd','#84947a',night?.35:.9]}/><directionalLight position={[-3,4,5]} intensity={night?.5:1.4} color="#fff0d7" castShadow/><Environment files="/models/twin/interior.hdr" environmentIntensity={night?.15:.3}/><CompanionGlade paused={stopped}/></> : <Grass />}</> : kind === 'pasture' ? <Pasture stage={stage} paused={stopped} /> : kind === 'cafe' ? <><Environment files="/models/twin/interior.hdr" environmentIntensity={night?.25:.65} /><StoryInteriorAtmosphere/><CafeScene standalone paused={stopped} /></> : <><Environment files="/models/twin/interior.hdr" environmentIntensity={night?.25:.65} /><ComparisonDistrict homeIntensity={home} officeIntensity={office} selected={buildingView} onSelect={onBuildingSelect} paused={stopped} /><BuildingShot view={buildingView} paused={stopped} /></>}
      {kind === 'buildings' && <fog attach="fog" args={['#c8a992',14,40]}/>}
      {kind !== 'cafe' && kind !== 'buildings' && !candidate && <MeadowGround position={[0,-.015,0]} size={kind==='cat'?9:28}/>}
      {kind !== 'buildings' && <OrbitControls target={[0, kind === 'cat' ? candidate ? .72 : .3 : kind === 'cafe' ? 1.25 : .65, 0]} enablePan={false} minDistance={kind === 'cat' ? 1.1 : 3} maxDistance={kind === 'cat' ? 4 : 10} maxPolarAngle={1.5} />}
    </Suspense>
  </SceneStage>;
}
