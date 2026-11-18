'use client';
import { useGLTF, useTexture } from '@/lib/three/scene-assets';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import SceneStage from './SceneStage';
import { useUIStore } from '@/lib/stores/UIStore';

const volumes = [
  { id: 'human-influence', title: 'IPCC', year: '2021', subtitle: 'THE PHYSICAL SCIENCE', color: '#283f36', x: -1.8, z: 1.1, turn: .23 },
  { id: 'scope-boundaries', title: 'GHG', year: '2004', subtitle: 'CORPORATE STANDARD', color: '#626c4b', x: -.5, z: 1.8, turn: -.18 },
  { id: 'ipcc-wgiii-demand', title: 'IPCC', year: '2022', subtitle: 'MITIGATION OF CLIMATE CHANGE', color: '#344a48', x: 1.5, z: 1.1, turn: -.3 },
];

function cover(title: string, year: string, subtitle: string, color: string) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 384;
  const c = canvas.getContext('2d')!;
  c.fillStyle = color; c.fillRect(0, 0, 256, 384);
  c.strokeStyle = '#d4cf9a'; c.lineWidth = 1; c.strokeRect(13, 13, 230, 358);
  c.fillStyle = '#f0eddb'; c.font = '48px Georgia'; c.fillText(title, 30, 82);
  c.font = 'italic 32px Georgia'; c.fillText(year, 30, 122);
  c.font = '10px Arial'; subtitle.split(' ').forEach((word, i) => c.fillText(word, 30, 180 + i * 16));
  c.strokeStyle = '#c8cc9e'; c.beginPath();
  for (let x = 0; x < 256; x++) { const y = 305 + Math.sin(x * .019) * 17 + Math.sin(x * .052) * 7; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); }
  c.stroke(); c.fillStyle = '#c7c6ac'; c.font = '8px Arial'; c.fillText('CARBONTWIN / READING COPY', 30, 350);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function LibraryPlants() {
  const { scene } = useGLTF('/models/research/CT_AcademicPlant_LOD.glb');
  const plants = useMemo(() => [scene.clone(true), scene.clone(true)], [scene]);
  return <>
    <primitive object={plants[0]} position={[-3.7, 0, -.8]} rotation={[0, .18, 0]} scale={1.35} dispose={null} />
    <primitive object={plants[1]} position={[3.7, 0, -.8]} rotation={[0, -.24, 0]} scale={1.35} dispose={null} />
  </>;
}

function FittedShelves() {
  const { scene } = useGLTF('/models/research/CT_LibraryShelf_v104.glb');
  const models = useMemo(() => [-2.25, 2.25].map(x => {
    const model = scene.clone(true), box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const scale = 3.9 / size.y;
    const group = new THREE.Group(); model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale); model.scale.setScalar(scale); group.add(model); group.position.set(x, 0, -2.04);
    return group;
  }), [scene]);
  // Cached source geometry and textures remain shared across both shelves.
  return <>{models.map((model, i) => <primitive key={i} object={model} dispose={null} />)}</>;
}

function LibraryFloor() {
  const [colorSource, normalSource, roughSource] = useTexture(['/textures/research/library-floor-v104/color.jpg', '/textures/research/library-floor-v104/normal.jpg', '/textures/research/library-floor-v104/roughness.jpg']);
  const { gl } = useThree();
  const maps = useMemo(() => [colorSource, normalSource, roughSource].map((source, i) => {
    // Own sampler state without changing the shared loader cache.
    const texture = source.clone(); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5.8, 5.5); texture.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy()); texture.needsUpdate = true; return texture;
  }), [colorSource, normalSource, roughSource, gl]);
  useEffect(() => () => maps.forEach(texture => texture.dispose()), [maps]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.06, -.1]}><planeGeometry args={[11.6, 11]} /><meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new THREE.Vector2(.18, .18)} color="#c0b394" roughness={.84} /></mesh>;
}

function ReadingRoomEnvelope() {
  const view = useTexture('/media/explore-v10/valley-v8.webp');
  return <group>
    {/* Original room geometry surrounds the licensed close shelves. The
        retained city render is explicitly distant scenery through the glass. */}
    <mesh position={[0, 2.7, -4.08]}><planeGeometry args={[10, 5.4]} /><meshBasicMaterial map={view} color="#c9d2b8" toneMapped={false} /></mesh>
    <LibraryFloor />
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * 4.4, 2.45, -2]}><boxGeometry args={[.34, 4.9, 4.5]} /><meshStandardMaterial color="#9e9477" roughness={.85} /></mesh>
      <mesh position={[side * 4.17, 2.45, -1.85]}><boxGeometry args={[.12, 4.9, .15]} /><meshStandardMaterial color="#51472e" roughness={.6} /></mesh>
      <mesh position={[side * 3.70, 2.45, -3.66]}><boxGeometry args={[.10, 4.9, .11]} /><meshStandardMaterial color="#aa925e" metalness={.65} roughness={.38} /></mesh>
    </group>)}
    {[-2.2, 0, 2.2].map(x => <mesh key={x} position={[x, 2.45, -3.66]}><boxGeometry args={[.052, 4.9, .08]} /><meshStandardMaterial color="#aa925e" metalness={.6} roughness={.38} /></mesh>)}
    {[.45, 3.5, 4.9].map(y => <mesh key={y} position={[0, y, -3.66]}><boxGeometry args={[8.6, .05, .08]} /><meshStandardMaterial color="#aa925e" metalness={.6} roughness={.38} /></mesh>)}
    <mesh position={[0, 4.88, -2]}><boxGeometry args={[8.8, .18, 4.5]} /><meshStandardMaterial color="#645a40" roughness={.85} /></mesh>
    <mesh position={[0, 4.75, -1]}><boxGeometry args={[7.8, .025, .05]} /><meshStandardMaterial color="#d3bd82" emissive="#ffdca1" emissiveIntensity={1.3} roughness={.5} /></mesh>
  </group>;
}

function Room({ open, pulled }: { open: (id: string) => void; pulled: string | null }) {
  const { camera, gl, invalidate } = useThree(), reduced = useUIStore(s => s.reduced);
  const rendered = useRef(false);
  const globe = useRef<THREE.Group>(null), books = useRef<THREE.InstancedMesh>(null);
  const selectedBooks = useRef<(THREE.Group | null)[]>([]);
  const land = useTexture('/textures/research/natural-earth-land.png');
  const covers = useMemo(() => volumes.map(v => cover(v.title, v.year, v.subtitle, v.color)), []);
  const library = useMemo(() => {
    const object = new THREE.Object3D(), matrices: THREE.Matrix4[] = [], colors: THREE.Color[] = [];
    const palette = ['#385548', '#616748', '#b8a175', '#243a36', '#8e6d49', '#768a70'];
    for (let side = 0; side < 2; side++) for (let row = 0; row < 6; row++) for (let i = 0; i < 25; i++) {
      const k = side * 150 + row * 25 + i, width = .066 + (k * 37 % 11) * .003;
      // Contact levels measured from upward faces of the actual CC0 mesh.
      const levels = [.11, .39, .67, .96, 1.28, 1.66, 2.06], scale = 3.9 / 2.0634419918;
      const gap = (levels[row + 1] - levels[row]) * scale - .09, height = gap * (.75 + (k * 13 % 9) * .025);
      object.position.set((side ? 1 : -1) * 2.25 + (i - 12) * .096, levels[row] * scale + .006 + height / 2, -1.92);
      object.rotation.set(0, 0, (k % 13 === 0 ? .09 : 0)); object.scale.set(width, height, .28 + (k % 4) * .025); object.updateMatrix();
      matrices.push(object.matrix.clone()); colors.push(new THREE.Color(palette[k % palette.length]));
    }
    return { matrices, colors };
  }, []);
  useEffect(() => {
    camera.position.set(2.8, 2.75, 7.8); camera.lookAt(0, 1.9, 0);
    land.colorSpace = THREE.SRGBColorSpace; land.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    if (books.current) { library.matrices.forEach((m, i) => { books.current!.setMatrixAt(i, m); books.current!.setColorAt(i, library.colors[i]); }); books.current.instanceMatrix.needsUpdate = true; }
    rendered.current = false;
    gl.domElement.dataset.libraryReady = 'false';
    invalidate();
    return () => { gl.domElement.style.cursor = ''; covers.forEach(t => t.dispose()); };
  }, [camera, gl, land, library, covers, invalidate]);
  useFrame((_, dt) => {
    // Read the preceding rendered frame, rather than reporting success before
    // the GPU has drawn the loaded shelves, globe and room. A second frame is
    // also needed when reduced motion uses the demand render loop.
    if (!rendered.current) {
      if (gl.info.render.triangles > 0) {
        rendered.current = true;
        gl.domElement.dataset.libraryReady = 'true';
      } else invalidate();
    }
    if (globe.current && !reduced) globe.current.rotation.y += Math.min(dt, .05) * .035;
    selectedBooks.current.forEach((book, i) => {
      if (!book) return;
      const active = pulled === volumes[i].id, speed = reduced ? 1 : 1 - Math.exp(-8 * Math.min(dt, .05));
      book.position.y = THREE.MathUtils.lerp(book.position.y, active ? 1.40 : 1.05, speed);
      book.position.z = THREE.MathUtils.lerp(book.position.z, volumes[i].z + (active ? .6 : 0), speed);
      book.rotation.x = THREE.MathUtils.lerp(book.rotation.x, active ? -.18 : 0, speed);
    });
    gl.domElement.dataset.libraryBook = pulled ?? '';
    gl.domElement.dataset.libraryDrawCalls = String(gl.info.render.calls);
    gl.domElement.dataset.libraryTriangles = String(gl.info.render.triangles);
  });
  return <>
    <fog attach="fog" args={['#27382a', 15, 28]} />
    <hemisphereLight args={['#d3ddc8', '#3d3020', 1.7]} />
    <directionalLight position={[0, 6, 4]} color="#ffe7b9" intensity={2.2} />
    <pointLight position={[-2, 3, 1]} color="#eecb83" intensity={16} distance={8} decay={2} />
    <pointLight position={[3, 3, -1]} color="#eecb83" intensity={11} distance={7} decay={2} />
    <ReadingRoomEnvelope />
    <FittedShelves />
    <mesh position={[0, 2.2, -2.23]}><planeGeometry args={[1.45, 3.45]} /><meshStandardMaterial color="#809c83" emissive="#879b76" emissiveIntensity={.25} roughness={.3} /></mesh>
    {[-.68, 0, .68].map(x => <mesh key={x} position={[x, 2.2, -2.19]}><boxGeometry args={[.025, 3.45, .035]} /><meshStandardMaterial color="#9d8754" metalness={.65} roughness={.4} /></mesh>)}
    {[1.15, 2.2, 3.3].map(y => <mesh key={y} position={[0, y, -2.18]}><boxGeometry args={[1.45, .025, .035]} /><meshStandardMaterial color="#9d8754" metalness={.65} roughness={.4} /></mesh>)}
    <instancedMesh ref={books} args={[undefined, undefined, library.matrices.length]}><boxGeometry /><meshStandardMaterial roughness={.86} /></instancedMesh>
    <mesh position={[0, 2.1, -2.18]}><torusGeometry args={[1.85, .022, 8, 100, Math.PI]} /><meshStandardMaterial color="#bba56c" roughness={.34} metalness={.7} /></mesh>
    {[-1.85, 1.85].map(x => <mesh key={x} position={[x, 1.05, -2.18]}><cylinderGeometry args={[.022, .022, 2.1, 8]} /><meshStandardMaterial color="#bba56c" metalness={.7} roughness={.34} /></mesh>)}
    {[[-.1, .12, 1.85], [-.1, .28, 1.5], [-.1, .4, 1.2]].map(([x, y, r], i) => <mesh key={i} position={[x, y, .15]}><cylinderGeometry args={[r, r, .15, 64]} /><meshStandardMaterial color={i === 1 ? '#a49562' : '#21392d'} roughness={.4} metalness={i === 1 ? .5 : .12} /></mesh>)}
    <mesh position={[-.1, .75, -.02]}><cylinderGeometry args={[.06, .16, .58, 24]} /><meshStandardMaterial color="#a49562" metalness={.65} roughness={.35} /></mesh>
    <group position={[-.1, 2.13, -.02]} rotation={[0, 0, -.16]}>
      <group ref={globe}><mesh><sphereGeometry args={[1.06, 64, 40]} /><meshStandardMaterial map={land} roughness={.4} metalness={.2} /></mesh></group>
      <mesh rotation={[0, .3, 0]}><torusGeometry args={[1.12, .023, 10, 100]} /><meshStandardMaterial color="#c1af72" metalness={.7} roughness={.3} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.15, .006, 6, 100]} /><meshBasicMaterial color="#a8bea0" /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[0, side * 1.09, 0]}><cylinderGeometry args={[.038, .038, .12, 16]} /><meshStandardMaterial color="#b6a06b" metalness={.7} roughness={.3} /></mesh>)}
    </group>
    {volumes.map((v, i) => <group ref={node => { selectedBooks.current[i] = node; }} key={v.id} position={[v.x, 1.05, v.z]} rotation={[0, v.turn, -.06 + i * .035]} onPointerOver={e => { e.stopPropagation(); gl.domElement.style.cursor = 'pointer'; }} onPointerOut={() => { gl.domElement.style.cursor = ''; }} onClick={e => { e.stopPropagation(); open(v.id); }}>
      <mesh><boxGeometry args={[.81, 1.22, .16]} /><meshStandardMaterial color="#d1cbb1" roughness={.94} /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[0, 0, side * .09]}><boxGeometry args={[.86, 1.27, .028]} /><meshStandardMaterial color={v.color} roughness={.72} /></mesh>)}
      <mesh position={[0, 0, .108]}><planeGeometry args={[.86, 1.27]} /><meshStandardMaterial map={covers[i]} roughness={.77} /></mesh>
      <mesh position={[-.42, 0, 0]}><boxGeometry args={[.04, 1.27, .19]} /><meshStandardMaterial color={v.color} /></mesh>
    </group>)}
    <LibraryPlants />
    <OrbitControls makeDefault target={[0, 1.7, 0]} enablePan={false} enableZoom={false} minPolarAngle={.8} maxPolarAngle={1.5} minAzimuthAngle={-.75} maxAzimuthAngle={.85} enableDamping dampingFactor={.08} />
  </>;
}

export default function ResearchLibraryScene({ open, pulled }: { open: (id: string) => void; pulled: string | null }) {
  return <SceneStage label="可旋转的三维研究图书馆与地球" sceneLights={false} pauseWhenHidden fallback={<div className="library-reading-fallback"><span className="library-fallback-globe" aria-hidden="true">◎</span><h3>一颗星球，许多种提问。</h3><p>当前使用轻量阅读视图。下方三本文献与完整档案仍可打开。</p><small>二维阅读视图</small></div>}><Room open={open} pulled={pulled} /></SceneStage>;
}
