'use client';
import { SceneFrameReady, SceneLifecycle, useSceneRuntime } from '@/lib/three/scene-runtime';
import { SceneResources, Environment, useGLTF, useTexture } from '@/lib/three/scene-assets';

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ArrowUpRight, Rotate3D } from 'lucide-react';
import { GARMENTS } from '@/lib/wardrobe';
import { useTryOnStore } from '@/lib/stores/TryOnStore';
import { useUIStore } from '@/lib/stores/UIStore';
import { TRY_ON_GARMENTS } from '@/lib/tryon/garments';
import { DenimJacket, DenimJacketCamera, DenimJacketLights, JacketDeparture } from './DenimJacket';

const ITEMS = [
  { ...GARMENTS[0], asset: 'tshirt', english: 'THE CLASSIC TEE', subtitle: '纯白短袖 T 恤', fabric: '棉布', kind: 'cotton', color: '#f0eee8', rotation: Math.PI / 2, author: 'Nayeem', uid: '7018d8578d6b4ee7af010d26eda1ecc9' },
  { ...GARMENTS[5], asset: 'sweater', english: 'THE SOFT KNIT', subtitle: '米白针织毛衣', fabric: '针织', kind: 'knit', color: '#e4d9bc', rotation: 0, author: 'ntrousdale', uid: '7075ff0a93d14fdd8cf34121f0897777' },
  { ...GARMENTS[6], asset: 'jeans', english: 'THE VINTAGE DENIM', subtitle: '复古蓝牛仔裤', fabric: '丹宁布', kind: 'denim', color: '#b1c0d6', rotation: 0, author: 'hazelmatthews', uid: 'ea045ee2bd364a6fb21a2c51181bcaf9' },
  { ...GARMENTS[2], asset: 'denim_jacket', english: 'THE DENIM JACKET', subtitle: '深蓝牛仔外套', fabric: '丹宁布', kind: 'denim', color: '#1A2A42', rotation: 0, author: 'k_Helferty99', uid: '1f11ec52bd8c4421abc18f45197c198e', kg: 15.5, reference: '项目给定牛仔外套估算情景', proxy: true, advice: '生命周期碳排约 15.5kg CO₂e。此为项目给定估算，非该模型的实测足迹；具体阶段比例需供应商数据核验。' },
  { ...GARMENTS[3], asset: 'trousers', english: 'THE EVERYDAY TROUSER', subtitle: '卡其色休闲长裤', fabric: '斜纹布', kind: 'khaki', color: '#b8a17c', rotation: 0, author: 'albertoch', uid: '33ec066dd147462494ff1ab544bcc469' },
  { ...GARMENTS[4], asset: 'shorts', english: 'THE WEEKEND SHORT', subtitle: '卡其色短裤', fabric: '斜纹布', kind: 'khaki', color: '#b8a17c', rotation: 0, author: 'Tijerín Art Studio', uid: 'b2c020425d444757ad491af696cbb66b' },
] as const;
type Item = (typeof ITEMS)[number];
const GALLERY_TO_TRY_ON = ITEMS.map((item) => TRY_ON_GARMENTS.findIndex((garment) => garment.id === item.id));
const NORMALS = { cotton: '/models/clothing/textures/fabric_pattern_05-nor_gl.jpg', khaki: '/models/clothing/textures/fabric_pattern_05-nor_gl.jpg', denim: '/models/clothing/textures/denim_fabric-nor_gl.jpg', knit: '/models/clothing/textures/knitted_fleece-nor_gl.jpg' };

function useGalleryActivity() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false), [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (ref.current) observer.observe(ref.current);
    const update = () => setPageVisible(!document.hidden);
    update(); document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);
  return { ref, active: visible && pageVisible };
}

function GalleryRenderActivity({ active, reduced, angle }: { active: boolean; reduced: boolean; angle: number }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    gl.domElement.dataset.galleryActivity = active ? reduced ? 'on-demand' : 'continuous' : 'paused';
    // Re-entry into a demand-rendered exhibit still needs a fresh frame.
    if (active) invalidate();
  }, [active, reduced, angle, gl, invalidate]);
  return null;
}

class AssetBoundary extends Component<{ children: ReactNode; label: string; html?: boolean; onError?: (error: Error) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError?.(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    const message = <div className="garment-error" role="alert">{this.props.label}<br />请刷新重试；碳数据仍可查看。</div>;
    return this.props.html ? message : <Html center>{message}</Html>;
  }
}

function LoadProgress() {
  const { progress } = useProgress();
  return <Html center><div className="garment-progress" role="status"><span>正在载入真实衣物网格</span><progress aria-label="衣物资源加载进度" value={progress} max={100} /><small>{Math.round(progress)}%</small></div></Html>;
}

function GLBGarment({ item, onReady, small = false }: { item: Item; onReady: (asset: string) => void; small?: boolean }) {
  const reduced = useUIStore(state => state.reduced), { invalidate } = useThree();
  const { scene } = useGLTF(`/models/clothing/${item.asset}.glb`, '/models/draco/');
  const weave = useTexture(NORMALS[item.kind]);
  const model = useMemo(() => {
    const root = scene.clone(true);
    const detail = weave.clone();
    detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
    detail.repeat.set(item.kind === 'knit' ? 6 : 16, item.kind === 'knit' ? 6 : 16);
    detail.colorSpace = THREE.NoColorSpace;
    detail.needsUpdate = true;
    const materials: THREE.Material[] = [];
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      if (item.asset === 'shorts' && /tassel/i.test(node.name)) { node.visible = false; return; }
      node.castShadow = node.receiveShadow = true;
      const convert = (original: THREE.MeshStandardMaterial) => {
        const denim = item.kind === 'denim', knit = item.kind === 'knit', cotton = item.kind === 'cotton';
        const material = new THREE.MeshPhysicalMaterial({
          color: item.asset === 'shorts' ? '#665d43' : item.color, map: item.asset === 'shorts' || cotton ? null : original.map,
          normalMap: original.normalMap ?? detail,
          normalScale: new THREE.Vector2(knit ? 1.65 : denim ? 1.25 : .45, knit ? 1.65 : denim ? 1.25 : .45),
          roughness: cotton || item.asset === 'shorts' ? .9 : denim ? .9 : knit ? .95 : .8, metalness: 0,
          sheen: cotton ? 1 : knit ? .9 : 0, sheenRoughness: knit ? .28 : .8, side: THREE.DoubleSide,
        });
        materials.push(material); return material;
      };
      node.material = Array.isArray(node.material) ? node.material.map(m => convert(m as THREE.MeshStandardMaterial)) : convert(node.material as THREE.MeshStandardMaterial);
    });
    root.rotation.y = item.rotation; root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const scale = (item.asset === 'shorts' ? 1.8 : 2.55) / Math.max(size.x, size.y);
    root.scale.setScalar(scale); root.position.set(-center.x * scale, -.4 - bounds.min.y * scale, -center.z * scale);
    return { root, detail, materials };
  }, [scene, weave, item]);
  useEffect(() => { onReady(item.asset); }, [item.asset, onReady]);
  useEffect(() => () => { model.materials.forEach(m => m.dispose()); model.detail.dispose(); }, [model]);
  const group = useRef<THREE.Group>(null), targetScale = useMemo(() => new THREE.Vector3(), []);
  const [hovered, setHovered] = useState(false);
  useEffect(() => { invalidate(); }, [hovered, reduced, invalidate]);
  useFrame((_, dt) => { if (group.current) group.current.scale.lerp(targetScale.setScalar(hovered && !small && !reduced ? 1.015 : 1), reduced ? 1 : 1 - Math.exp(-8 * dt)); });
  return <group ref={group} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}><primitive object={model.root} dispose={null} /></group>;
}

function Plinth({ small = false }: { small?: boolean }) {
  return <mesh receiveShadow position={[0, -.47, 0]}><cylinderGeometry args={[small ? 1.4 : 1.65, small ? 1.4 : 1.65, .12, 80]} /><meshStandardMaterial color="#24252b" roughness={.65} metalness={.3} /></mesh>;
}

function CameraPose({ angle, collection, jacket = false }: { angle: number; collection: boolean; jacket?: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { size } = useThree();
  useEffect(() => {
    if (!controls.current) return;
    const distance = jacket ? Math.max(4.4, 3.6 / (2 * Math.tan(THREE.MathUtils.degToRad(19)) * (size.width / size.height))) : 5.2;
    controls.current.object.position.set(collection ? 0 : Math.sin(angle) * distance, collection ? 1.7 : jacket ? 1.05 : 1.15, collection ? 10.8 : Math.cos(angle) * distance);
    controls.current.target.set(0, collection ? 1.3 : jacket ? .55 : .8, 0); controls.current.update();
  }, [angle, collection, jacket, size.width, size.height]);
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.05} enablePan={false} minDistance={collection ? 7 : 2.2} maxDistance={collection ? 14 : 8} minPolarAngle={.25} maxPolarAngle={Math.PI - .25} target={[0, .8, 0]} />;
}

function GalleryScene({ item, collection, angle, onReady, jacketFromCollection, onState, active, reduced }: { item: Item; collection: boolean; angle: number; onReady: (asset: string) => void; jacketFromCollection: boolean; onState: (state: { key: string; ready: boolean; phase: string }) => void; active: boolean; reduced: boolean }) {
  const runtime=useSceneRuntime(active,'数字衣物 / '+item.asset);
  const sceneKey=collection?'collection':item.asset;
  useEffect(()=>{onState({key:sceneKey,ready:runtime.ready,phase:runtime.phase});},[onState,sceneKey,runtime.ready,runtime.phase]);
  return <><SceneResources.Provider value={runtime.scope}><AssetBoundary key={runtime.generation} html label="三维展台暂时无法启动" onError={runtime.fail}>{!runtime.error&&<Canvas camera={{ position: [0, 1.15, 5.2], fov: 38 }} shadows dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }} frameloop={!active||runtime.lost?'never':reduced?'demand':'always'} role="group" aria-label="真实 GLB 衣物三维展台，支持鼠标拖拽环绕">
    <SceneLifecycle runtime={runtime}/><GalleryRenderActivity active={active} reduced={reduced} angle={angle}/><color attach="background" args={['#0A0A0F']} /><ambientLight intensity={.45} />
    <spotLight castShadow position={[3, 5, 4]} intensity={3} angle={.65} penumbra={1} decay={0} shadow-mapSize={[2048, 2048]} shadow-bias={-.0002} />
    <spotLight position={[-3, 4, -3]} intensity={2} angle={.75} penumbra={1} decay={0} color="#c6d9ff" />
    <Suspense fallback={null}><Environment files="/models/twin/interior.hdr" environmentIntensity={.75} /></Suspense>
    {collection ? ITEMS.map((entry, i) => <group key={entry.asset} position={[(i % 3 - 1) * 2.4, i < 3 ? 2.1 : -.45, 0]} scale={.72}>
      <Plinth small /><AssetBoundary onError={runtime.fail} label={`${entry.subtitle}加载失败`}><Suspense fallback={<LoadProgress />}>{entry.asset === 'denim_jacket' ? <DenimJacket small onReady={onReady} /> : <GLBGarment item={entry} small onReady={onReady} />}</Suspense></AssetBoundary>
      <Html position={[0, -.8, 0]} center><span className="collection-label">{entry.subtitle}</span></Html>
    </group>) : item.asset === 'denim_jacket' ? <>
      <Plinth /><DenimJacketLights />
      <AssetBoundary onError={runtime.fail} label="牛仔外套模型加载失败"><Suspense fallback={<LoadProgress />}><DenimJacket onReady={onReady} fromCollection={jacketFromCollection && !reduced} /></Suspense></AssetBoundary>
      {jacketFromCollection && !reduced && ITEMS.map((entry, i) => entry.asset === 'denim_jacket' ? null : <JacketDeparture key={entry.asset} position={[(i % 3 - 1) * 2.4, i < 3 ? 2.1 : -.45, 0]}><Plinth small /><Suspense fallback={null}><GLBGarment item={entry} small onReady={onReady} /></Suspense></JacketDeparture>)}
    </> : <>
      <Plinth /><AssetBoundary key={item.asset} onError={runtime.fail} label="衣物模型加载失败"><Suspense fallback={<LoadProgress />}><GLBGarment item={item} onReady={onReady} /></Suspense></AssetBoundary>
      {item.asset !== 'shorts' && <Html position={[1.6, .7, 0]} center distanceFactor={7}><div className="clothing-holo"><span className="clothing-holo-kicker">MATERIAL / {item.fabric}</span><strong>{item.kg.toFixed(1)}<small> kg CO₂e</small></strong><p>{item.subtitle}</p><span>每件全生命周期参考值{item.proxy ? ' · 代理品类' : ''}</span></div></Html>}
    </>}
    {!collection && item.asset === 'denim_jacket' && !reduced ? <DenimJacketCamera angle={angle} fromCollection={jacketFromCollection} /> : <CameraPose angle={angle} collection={collection} jacket={!collection && item.asset === 'denim_jacket'} />}
    <Suspense fallback={null}><SceneFrameReady scope={runtime.scope} onReady={runtime.onRendered}/></Suspense>
  </Canvas>}</AssetBoundary></SceneResources.Provider>{runtime.error?<div className="garment-progress" role="alert"><p>{runtime.error}</p><button type="button" onClick={runtime.retry}>重新加载三维衣物</button></div>:!runtime.ready&&<div className="garment-progress" role="status">{runtime.lost?'正在恢复图形连接':'正在载入衣物与材质'} · {runtime.progress.loaded}/{runtime.progress.total} 组资源</div>}</>;
}

export default function ClothingGallery() {
  const { ref: stageRef, active } = useGalleryActivity();
  const reduced = useUIStore(state => state.reduced);
  const [selected, setSelected] = useState(0), [collection, setCollection] = useState(false), [angle, setAngle] = useState(0);
  const activeGarmentIndex = useTryOnStore((state) => state.activeGarmentIndex);
  const selectGarment = useTryOnStore((state) => state.selectGarment);
  const [jacketFromCollection, setJacketFromCollection] = useState(false);
  useEffect(() => {
    const galleryIndex = GALLERY_TO_TRY_ON.indexOf(activeGarmentIndex);
    if (galleryIndex < 0) return;
    setSelected(galleryIndex);
    setCollection(false);
    setAngle(0);
  }, [activeGarmentIndex]);
  useEffect(() => {
    if (!jacketFromCollection) return;
    const timeout = window.setTimeout(() => setJacketFromCollection(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [jacketFromCollection]);
  const [loaded, setLoaded] = useState<string[]>([]);
  const onReady = useMemo(() => (asset: string) => setLoaded(previous => previous.includes(asset) ? previous : [...previous, asset]), []);
  const item = ITEMS[selected];
  const [sceneState,setSceneState]=useState({key:'',ready:false,phase:'initializing'});
  const sceneKey=collection?'collection':item.asset;
  return <section className="clothing-gallery" aria-labelledby="clothing-gallery-title" data-ready={sceneState.key===sceneKey&&sceneState.ready} data-load-state={sceneState.phase} data-asset={item.asset} data-loaded={loaded.join(',')} data-focus-transition={jacketFromCollection ? 'jacket' : 'idle'}>
    <div className="clothing-gallery-heading"><div><span className="section-kicker">THE MATERIAL ARCHIVE / 06 OBJECTS</span><h2 id="clothing-gallery-title">Cloth, in <i>real space.</i></h2><p>从轮廓到纤维，重新认识衣物。拖拽环绕，靠近观察，再读懂它留下的碳足迹。</p></div><div className="clothing-gallery-status"><Rotate3D size={18} /><span>REAL GLB ASSETS<br /><small>360° / DRACO</small></span></div></div>
    <div className="garment-toolbar"><div role="group" aria-label="展台视图"><button type="button" aria-pressed={!collection} onClick={() => setCollection(false)}>单品细览</button><button type="button" aria-pressed={collection} onClick={() => setCollection(true)}>六件全览</button></div><div role="group" aria-label="衣物观察角度"><button type="button" onClick={() => setAngle(0)}>正面</button><button type="button" onClick={() => setAngle(Math.PI / 2)}>侧面</button><button type="button" onClick={() => setAngle(Math.PI)}>背面</button><button type="button" onClick={() => setAngle(2 * Math.PI)}>复位</button></div></div>
    <div className="clothing-gallery-stage"><div ref={stageRef} className="clothing-gallery-canvas"><GalleryScene key={sceneKey} item={item} collection={collection} angle={angle} onReady={onReady} jacketFromCollection={jacketFromCollection} onState={setSceneState} active={active} reduced={reduced}/><div className="clothing-gallery-badge"><span className="live-dot" />{collection ? 'THE COMPLETE COLLECTION' : `${item.fabric} / PHYSICAL MATERIAL`}</div><div className="garment-orbit-hint">拖拽环绕 · 滚轮放大 · 双指缩放</div></div>
      <aside className="clothing-gallery-copy"><div className="clothing-gallery-number">0{selected + 1} <span>/ 06</span></div><h3>{item.english}</h3><p className="clothing-gallery-subtitle">{item.subtitle} / {item.fabric}</p><div className="clothing-gallery-measure"><strong>{item.kg.toFixed(1)}</strong><span>kg CO₂e<br />全生命周期 / 件</span></div><p className="garment-data-boundary">{item.asset === 'denim_jacket' ? '项目给定估算情景，非该模型的实测足迹。' : item.proxy ? `数据代理：${item.reference}，不等于这件模型的实测足迹。` : `ADEME「${item.reference}」代表产品基准。`}</p><p className="clothing-gallery-note">{item.advice}</p><a href={item.asset === 'denim_jacket' ? '/models/denim_jacket.sources.json' : `https://impactco2.fr/outils/habillement/${item.path}`} target="_blank" rel="noreferrer">{item.asset === 'denim_jacket' ? '查看外套数据说明' : '查看 ADEME 数据边界'} <ArrowUpRight size={15} /></a><details className="garment-source"><summary>模型与材质来源</summary><p>{item.asset === 'denim_jacket' ? `模型：${item.author} · CC BY 4.0。复用已核验的 Sketchfab 同源 GLB，保留原始 PBR 贴图；仅调整外套的物理材质参数。` : `模型：${item.author} · CC BY 4.0。经过衣物提取、压缩与材质改色。版型为公开资产近似，非参考图的 1:1 扫描重建。`}</p><a href={`https://sketchfab.com/3d-models/${item.uid}`} target="_blank" rel="noreferrer">查看原作者资产 ↗</a><a href={item.asset === 'denim_jacket' ? '/models/denim_jacket.sources.json' : '/models/clothing/sources.json'} target="_blank" rel="noreferrer">完整授权清单 ↗</a></details></aside></div>
    <nav className="clothing-gallery-nav" aria-label="选择数字衣物">{ITEMS.map((entry, index) => <button key={entry.asset} type="button" aria-pressed={index === selected} onClick={() => { setJacketFromCollection(entry.asset === 'denim_jacket' && collection); setSelected(index); setCollection(false); setAngle(0); const tryOnIndex = GALLERY_TO_TRY_ON[index]; if (tryOnIndex >= 0) selectGarment(tryOnIndex, '三维衣物档案'); }}><span>{String(index + 1).padStart(2, '0')} / {entry.fabric}</span>{entry.asset === 'denim_jacket' ? <span style={{ fontFamily: 'var(--font-instrument), Georgia, serif', fontSize: 'clamp(14px, 1.35vw, 20px)', color: 'inherit', letterSpacing: 0, lineHeight: 1.1 }}>{entry.english}</span> : entry.subtitle}</button>)}</nav>
    <p className="clothing-gallery-disclaimer">六件展品均加载真实 GLB 网格；不使用代码几何体拼接衣物。模型经 Objaverse 公开档案获取，原作者署名与改动详见来源清单。补充织物法线来自 Poly Haven（CC0）。碳数值为法国代表产品的全生命周期教学基准，未虚构生产阶段占比。</p>
  </section>;
}
