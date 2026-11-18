'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import Link from 'next/link';
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStableRenderer, needsStableDrawingBuffer } from '@/lib/citylight/stable-renderer';

const REVISION = 'r3';
const CANDIDATES = {
  crystal: { id: 'CL-T01-V16-CRYSTAL', label: 'A · 连续晶体折面', uri: '/models/citylight/v16-study/' + REVISION + '/crystal.glb' },
  terrace: { id: 'CL-T01-V16-TERRACE', label: 'B · 分段退台对照', uri: '/models/citylight/v16-study/' + REVISION + '/terrace.glb' },
  baseline: { id: 'CL-T01-V12', label: '旧塔 · 同机位白模', uri: '/models/citylight/v12/light-court.glb' },
  previous: { id: 'CL-T01-V16-CRYSTAL-R2', label: 'R2 · 本轮初版对照', uri: '/models/citylight/v16-study/r2/crystal.glb' },
} as const;
type Candidate = keyof typeof CANDIDATES;
type Mode = 'clay' | 'silhouette' | 'normals' | 'section';
const VIEWS = {
  front: { name: '正面45°', position: [92, 66, 145], target: [0, 55, 0] },
  rear: { name: '背面45°', position: [-92, 66, -145], target: [0, 55, 0] },
  left: { name: '左侧', position: [-150, 62, 6], target: [0, 55, 0] },
  right: { name: '右侧', position: [150, 62, 6], target: [0, 55, 0] },
  roof: { name: '屋顶', position: [30, 139, 42], target: [0, 104, 0] },
  eye: { name: '人眼1.6m', position: [6, 1.6, 34], target: [0, 3.3, 0] },
  detail: { name: '幕墙结构近景', position: [25, 35, 34], target: [10, 32, 8] },
  hero: { name: '主视觉低机位', position: [60, 9, 118], target: [0, 53, 0] },
} satisfies Record<string, { name: string; position: [number, number, number]; target: [number, number, number] }>;
type View = keyof typeof VIEWS;
const LIGHTS = {
  neutral: { name: '中性斜光', position: [65, 95, 80], color: '#fff3df', power: 3.2, fill: .95, background: '#aebbc6' },
  dawn: { name: '清晨方向', position: [90, 18, 50], color: '#ffe1bb', power: 2.6, fill: .75, background: '#adb9bf' },
  day: { name: '上午方向', position: [60, 100, 75], color: '#fff2dc', power: 3.4, fill: .9, background: '#b1c4d1' },
  noon: { name: '正午方向', position: [15, 160, 25], color: '#fff8e9', power: 3.5, fill: .95, background: '#b8cbd6' },
  sunset: { name: '夕阳方向', position: [-95, 18, 55], color: '#ffd0a0', power: 3, fill: .72, background: '#b6b6b3' },
  blue: { name: '蓝调结构', position: [-60, 8, 55], color: '#b7c9df', power: .8, fill: .7, background: '#536b80' },
  night: { name: '夜间结构', position: [-60, 40, 45], color: '#b9c8d5', power: .65, fill: .5, background: '#253a4c' },
} satisfies Record<string, { name: string; position: [number, number, number]; color: string; power: number; fill: number; background: string }>;
type Light = keyof typeof LIGHTS;

class Boundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Model({ candidate, mode, onReady, onSelect }: { candidate: Candidate; mode: Mode; onReady: () => void; onSelect: () => void }) {
  const source = useGLTF(CANDIDATES[candidate].uri);
  const { gl } = useThree();
  const owned = useMemo(() => {
    const scene = source.scene.clone(true);
    const materials: THREE.Material[] = [];
    const materialMap = new Map<THREE.Material, THREE.Material>();
    scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const clone = (m: THREE.Material) => {
        if (materialMap.has(m)) return materialMap.get(m)!;
        let next: THREE.Material;
        if (mode === 'silhouette') next = new THREE.MeshBasicMaterial({ color: '#171e23' });
        else if (mode === 'normals') next = new THREE.MeshNormalMaterial();
        else {
          const name = m.name;
          const tint = candidate === 'baseline' ? (name.includes('frame') ? '#ced1cc' : '#969fa0') :
            name.includes('structure') ? '#d1d2ca' : name.includes('core') ? '#707c80' : name.includes('floor') ? '#909c9f' : name.includes('scale') ? '#9a735c' : '#b6c0c0';
          next = new THREE.MeshStandardMaterial({ color: tint, roughness: .72, metalness: 0 });
        }
        next.name = m.name;
        materials.push(next); materialMap.set(m, next); return next;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
      mesh.castShadow = true; mesh.receiveShadow = true;
      if (mesh.name.startsWith('site') || mesh.name.includes('paving')) mesh.visible = mode !== 'silhouette';
      if (mode === 'section' && (mesh.name.startsWith('envelope') || mesh.name.startsWith('podium'))) mesh.visible = false;
    });
    scene.name = CANDIDATES[candidate].id;
    return { scene, materials };
  }, [source.scene, candidate, mode]);
  useEffect(() => {
    const bounds = new THREE.Box3().setFromObject(owned.scene);
    Object.assign(gl.domElement.dataset, {
      assetId: CANDIDATES[candidate].id, modelUri: CANDIDATES[candidate].uri,
      revision: REVISION, modelLoaded: 'true', mode, bounds: JSON.stringify({ min: bounds.min.toArray(), max: bounds.max.toArray() }),
    });
    gl.shadowMap.needsUpdate = true; onReady();
  }, [owned, candidate, gl, mode, onReady]);
  useEffect(() => () => owned.materials.forEach(m => m.dispose()), [owned]);
  return <primitive object={owned.scene} dispose={null} onClick={(e: ThreeEvent<MouseEvent>) => {
    if (e.object.name.startsWith('site') || e.object.name.startsWith('scale')) return;
    e.stopPropagation(); onSelect();
  }} />;
}

function Lighting({ light }: { light: Light }) {
  const { scene, gl } = useThree();
  const config = LIGHTS[light];
  useEffect(() => {
    scene.background = new THREE.Color(config.background);
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
    gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true;
    Object.assign(gl.domElement.dataset, { light, sun: config.position.join(','), exposure: '1', bloom: 'none', materialStage: 'opaque-clay-only' });
  }, [gl, scene, config, light]);
  return <>
    <hemisphereLight args={['#d4e0e8', '#68685d', config.fill]} />
    <directionalLight position={config.position} color={config.color} intensity={config.power} castShadow
      shadow-mapSize={[2048, 2048]} shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={140}
      shadow-camera-bottom={-40} shadow-camera-near={1} shadow-camera-far={360} shadow-normalBias={.025} shadow-bias={-.0001} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.51, 0]} receiveShadow>
      <planeGeometry args={[1000, 1000]} /><meshStandardMaterial color="#6f7c80" roughness={.9} />
    </mesh>
  </>;
}

function Director({ view, revision, onLost }: { view: View; revision: number; onLost: () => void }) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControls>();
  const samples = useRef<number[]>([]);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableDamping = true; orbit.minDistance = 9; orbit.maxDistance = 320; orbit.maxPolarAngle = Math.PI * .7;
    controls.current = orbit;
    const lost = (event: Event) => { event.preventDefault(); onLost(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => { orbit.dispose(); gl.domElement.removeEventListener('webglcontextlost', lost); controls.current = undefined; };
  }, [camera, gl, onLost]);
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.enableDamping = false; orbit.update();
    camera.position.set(...VIEWS[view].position); orbit.target.set(...VIEWS[view].target);
    orbit.update(); orbit.enableDamping = true;
    gl.domElement.dataset.stable = 'true';
    samples.current = [];
  }, [camera, gl, view, revision]);
  useFrame((_, dt) => {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.update();
    camera.position.y = Math.max(1.6, camera.position.y);
    const radius = Math.hypot(camera.position.x, camera.position.z), safeRadius = camera.position.y < 12 ? 27 : 20;
    if (radius < safeRadius) { camera.position.x *= safeRadius / Math.max(radius, .001); camera.position.z *= safeRadius / Math.max(radius, .001); }
    camera.lookAt(orbit.target);
    Object.assign(gl.domElement.dataset, {
      camera: camera.position.toArray().join(','), target: orbit.target.toArray().join(','), fov: String((camera as THREE.PerspectiveCamera).fov),
      drawCalls: String(gl.info.render.calls), triangles: String(gl.info.render.triangles),
      geometries: String(gl.info.memory.geometries), textures: String(gl.info.memory.textures),
    });
    if (!document.hidden && dt < .5) samples.current.push(dt * 1000);
    if (samples.current.length >= 120) {
      const a = samples.current, sorted = [...a].sort((a, b) => a - b);
      Object.assign(gl.domElement.dataset, {
        fps: (1000 * a.length / a.reduce((s, n) => s + n, 0)).toFixed(2),
        p50: sorted[Math.floor(a.length * .5)].toFixed(2), p95: sorted[Math.floor(a.length * .95)].toFixed(2), p99: sorted[Math.floor(a.length * .99)].toFixed(2),
      });
      samples.current = [];
    }
  });
  return null;
}

export default function CitylightTowerStudy() {
  const [candidate, setCandidate] = useState<Candidate>('crystal'), [mode, setMode] = useState<Mode>('clay'), [view, setView] = useState<View>('front');
  const [light, setLight] = useState<Light>('neutral'), [revision, setRevision] = useState(0), [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false), [paused, setPaused] = useState(false), [generation, setGeneration] = useState(0);
  const [showCaption, setShowCaption] = useState(false), [loadFailed, setLoadFailed] = useState(false);
  const [selection, setSelection] = useState(''), [surface, setSurface] = useState(''), [metrics, setMetrics] = useState('采样中');
  const host = useRef<HTMLDivElement>(null);
  const onReady = useCallback(() => setReady(true), []), onLost = useCallback(() => { setLost(true); setReady(false); }, []);
  const onLoadError = useCallback(() => { setLoadFailed(true); setLost(true); setReady(false); }, []);
  const selectView = useCallback((v: View) => { setView(v); setRevision(n => n + 1); }, []);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSurface(needsStableDrawingBuffer() ? Math.floor(entry.contentRect.width) + ':' + Math.floor(entry.contentRect.height) : 'native'));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { selectView('front'); setSelection(''); } };
    window.addEventListener('keydown', key);
    const timer = setInterval(() => { const c = host.current?.querySelector('canvas'); if (c) setMetrics((c.dataset.fps || '采样中') + ' FPS · p95 ' + (c.dataset.p95 || '—') + ' ms · ' + (c.dataset.drawCalls || '—') + ' draws'); }, 1000);
    return () => { window.removeEventListener('keydown', key); clearInterval(timer); };
  }, [selectView]);
  const restore = () => { if (loadFailed) useGLTF.clear(CANDIDATES[candidate].uri); setLoadFailed(false); setLost(false); setPaused(false); setReady(false); setGeneration(n => n + 1); };
  return <>
    <header className="citylight-heading"><div><span className="citylight-kicker">CL-T01 / V16 / W02–W03 · 真实几何研究</span>
      <h1>先让轮廓，配得上光。</h1><p>同一栋首塔的两种体量候选。真实 GLB、真实楼板和可检查的大堂空腔。尚未达到 98 分，未开始正式玻璃、室内家具或第二栋制作。</p></div>
      <div><Link href="/citylight/review">中文证据中心 ↗</Link><br /><Link href="/citylight/studio">保留原塔 ↗</Link><br /><Link href="/citylight/material-lab">保留幕墙试件 ↗</Link></div>
    </header>
    <div className="citylight-workbench">
      <section className="citylight-viewport" data-ready={ready && !lost && !paused} data-candidate={candidate} data-mode={mode} data-view={view} data-light={light} aria-label="V16 首塔真实体量工作台">
        <div ref={host} className="tower-study-canvas">
          {lost || paused ? <div className="citylight-fallback" role="status"><h2>{paused ? '本地三维已暂停' : loadFailed ? '模型加载失败，未使用旧画面' : 'WebGL 中断，已移除旧画面'}</h2><p>可手动恢复本地模型，或返回保留的原塔。</p><button onClick={restore}>手动恢复三维</button><Link href="/citylight/studio">返回原塔</Link></div> :
            surface && <Boundary key={generation} onError={onLoadError}><Canvas key={surface + ':' + generation} camera={{ position: VIEWS.front.position, fov: 45, near: .1, far: 650 }} dpr={1} gl={canvas => createStableRenderer(canvas, 1)} shadows
              onCreated={({ gl }) => { const g = gl.getContext(), e = g.getExtension('WEBGL_debug_renderer_info'); gl.domElement.dataset.renderer = String(e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)); }}>
              <Suspense fallback={null}><Model candidate={candidate} mode={mode} onReady={onReady} onSelect={() => setSelection(CANDIDATES[candidate].id)} /><Lighting light={light} /><Director view={view} revision={revision} onLost={onLost} /></Suspense>
            </Canvas></Boundary>}
        </div>
        {showCaption && <div className="citylight-caption"><span><strong>{CANDIDATES[candidate].label}</strong>{VIEWS[view].name} · 拖动环绕 / Esc 返回正面</span><small>{ready ? '真实几何已加载' : '等待加载'} · 无 Bloom<br />白模研究 / 不能代替最终美术验收</small></div>}
      </section>
      <aside className="citylight-controls">
        <div><span className="citylight-kicker">FAILED_GATE / 首塔尚未通过</span><h2>先审结构，再做表面。</h2><p className="lab-diagnostics" aria-live="polite">{metrics}</p><p aria-live="polite">{selection ? '已选中 ' + selection : '点击实体可核对资产 ID。人形仅为尺度量具。'}</p></div>
        <fieldset><legend>首塔体量对照</legend><div className="citylight-buttons">{(Object.keys(CANDIDATES) as Candidate[]).map(k => <button key={k} aria-pressed={candidate === k} onClick={() => { if (k !== candidate) { setReady(false); setSelection(''); setCandidate(k); } }}>{CANDIDATES[k].label}</button>)}</div><p>A 为连续收分与渐变切角；B 为两级退台，均是第一栋的候选，不是两栋正式建筑。旧塔以相同白模材质、相机和灯光加载供比较。</p></fieldset>
        <fieldset><legend>剥离材质检查几何</legend><div className="citylight-buttons">{([['clay', '中性白模'], ['silhouette', '纯色剪影'], ['normals', '法线方向'], ['section', '拆除外壳查楼板']] as const).map(([k, text]) => <button key={k} aria-pressed={mode === k} onClick={() => { if (k !== mode) { setReady(false); setMode(k); } }}>{text}</button>)}</div><p>外壳为不透明体量代理，不是玻璃；拆壳模式只证明楼板与柱网存在，不表示内装已完成。</p></fieldset>
        <fieldset><legend>固定七视角</legend><div className="citylight-buttons">{(Object.keys(VIEWS) as View[]).map(k => <button key={k} aria-pressed={view === k} onClick={() => selectView(k)}>{VIEWS[k].name}</button>)}</div></fieldset>
        <fieldset><legend>几何受光方向研究</legend><div className="citylight-buttons">{(Object.keys(LIGHTS) as Light[]).map(k => <button key={k} aria-pressed={light === k} onClick={() => setLight(k)}>{LIGHTS[k].name}</button>)}</div><p>以上仅为白模受光检查；夜间保留检查用补光。尚无合格玻璃反射、完整世界时钟或正式六时段夜景。</p></fieldset>
        <fieldset><legend>资源控制</legend><div className="citylight-buttons"><button aria-pressed={showCaption} onClick={() => setShowCaption(v => !v)}>画内机位标签</button><button onClick={() => { setPaused(true); setReady(false); }}>暂停本地三维</button><a href={'/models/citylight/v16-study/' + REVISION + '/manifest.json'}>模型清单与 SHA256 ↗</a></div></fieldset>
      </aside>
    </div>
    <p className="lab-status">用户对旧实物的约35–40分评价保持原样。本工作台不自称98分，不申请正式验收；玻璃、家具、树车人和首塔整体均未放行。所有操作由浏览器本地完成。</p>
  </>;
}
