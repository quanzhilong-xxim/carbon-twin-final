'use client';
import { useGLTF, useTexture } from '@/lib/three/scene-assets';

import { RoundedBox } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Identity } from '@/lib/store';

function RetainedPlant({ tree = false, position, size }: { tree?: boolean; position: [number, number, number]; size: number }) {
  const { scene } = useGLTF(tree ? '/models/urban-vegetation/CT_ParkTree_StreetLite_v3.glb' : '/models/research/CT_AcademicPlant_LOD.glb');
  const { model, scale, center, low } = useMemo(() => {
    const model = scene.clone(true), box = new THREE.Box3().setFromObject(model), dimensions = box.getSize(new THREE.Vector3());
    model.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = true; });
    return { model, scale: size / dimensions.y, center: box.getCenter(new THREE.Vector3()), low: box.min.y };
  }, [scene, size]);
  return <group position={position} scale={scale}><primitive object={model} position={[-center.x, -low, -center.z]} dispose={null} /></group>;
}

function Rounded({ position, size, color, metal = 0 }: { position: [number, number, number]; size: [number, number, number]; color: string; metal?: number }) {
  return <RoundedBox args={size} radius={Math.min(...size) * .22} smoothness={3} position={position} castShadow receiveShadow><meshStandardMaterial color={color} roughness={metal ? .34 : .72} metalness={metal} /></RoundedBox>;
}

function RetainedArchitecture() {
  const { scene } = useGLTF('/models/citylight/light-tower-v2.glb');
  const { model, scale, origin } = useMemo(() => {
    const model = scene.clone(true), box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return { model, scale: .28 / Math.max(size.x, size.y, size.z), origin: new THREE.Vector3(-center.x, -box.min.y, -center.z) };
  }, [scene]);
  return <group position={[0, .77, 0]} scale={scale}><primitive object={model} position={origin} dispose={null} /></group>;
}

function CivicGround() {
  const originals = useTexture([
    '/models/citylight/v14-lab/resources/concrete_tiles_02_diff_1k.jpg',
    '/models/citylight/v14-lab/resources/concrete_tiles_02_rough_1k.jpg',
    '/models/citylight/v14-lab/resources/concrete_tiles_02_nor_gl_1k.jpg',
  ]);
  const textures = useMemo(() => originals.map((source, index) => {
    const texture = source.clone();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return texture;
  }), [originals]);
  useEffect(() => () => textures.forEach(texture => texture.dispose()), [textures]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.012, 0]} receiveShadow>
    <planeGeometry args={[10, 10]} /><meshStandardMaterial color="#ded9c6" map={textures[0]} roughnessMap={textures[1]} normalMap={textures[2]} normalScale={new THREE.Vector2(.25, .25)} roughness={.88} />
  </mesh>;
}

function ExplorerGround() {
  const grass = useRef<THREE.InstancedMesh>(null);
  const { meadow, path, blade } = useMemo(() => {
    const size = 256, pixels = new Uint8Array(size * size * 4);
    let seed = 0x743726;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const broad = Math.sin(x / size * Math.PI * 8) * Math.cos(y / size * Math.PI * 6);
      const fibre = random() * 26 + broad * 10, i = (y * size + x) * 4;
      pixels.set([87 + fibre, 105 + fibre, 53 + fibre * .7, 255], i);
    }
    const meadow = new THREE.DataTexture(pixels, size, size);
    meadow.colorSpace = THREE.SRGBColorSpace; meadow.wrapS = meadow.wrapT = THREE.RepeatWrapping;
    meadow.repeat.set(12, 12); meadow.magFilter = THREE.LinearFilter;
    meadow.minFilter = THREE.LinearMipmapLinearFilter; meadow.generateMipmaps = true; meadow.needsUpdate = true;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, z = -2.48 + t * 6, center = Math.sin((z + .2) * .55) * .30;
      positions.push(center - .58, -.006, z, center + .58, -.006, z); uvs.push(0, t * 5, 1, t * 5);
      if (i < 40) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const path = new THREE.BufferGeometry(); path.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    path.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); path.setIndex(indices); path.computeVertexNormals();
    const blade = new THREE.BufferGeometry();
    blade.setAttribute('position', new THREE.Float32BufferAttribute([-.007, 0, 0, .007, 0, 0, .002, .035, .006, .008, .065, .014], 3));
    blade.setIndex([0, 1, 2, 0, 2, 3]); blade.computeVertexNormals();
    return { meadow, path, blade };
  }, []);
  useEffect(() => {
    const mesh = grass.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D(); let seed = 0x742026;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 460; i++) {
      const z = random() * 4.6 - 2.45, center = Math.sin((z + .2) * .55) * .30;
      const side = i % 2 ? 1 : -1, x = center + side * (.60 + random() * 1.45);
      dummy.position.set(x, -.01, z); dummy.rotation.set(0, random() * Math.PI * 2, 0);
      dummy.scale.setScalar(.6 + random() * 1.2); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color().setHSL(.20 + random() * .035, .25 + random() * .2, .23 + random() * .12));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // instanceColor is allocated by the first setColorAt, after the initial
    // material may have compiled; refresh its instancing-color shader branch.
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  useEffect(() => () => { meadow.dispose(); path.dispose(); blade.dispose(); }, [meadow, path, blade]);
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.012, 0]} receiveShadow><planeGeometry args={[10, 10]} /><meshStandardMaterial map={meadow} roughness={.98} /></mesh>
    <mesh geometry={path} receiveShadow><meshStandardMaterial color="#b3a58b" roughness={.96} /></mesh>
    <instancedMesh ref={grass} args={[blade, undefined, 460]} receiveShadow castShadow><meshStandardMaterial color="#839261" side={THREE.DoubleSide} roughness={.98} /></instancedMesh>
  </group>;
}

/** Foreground geometry shares light and real contact shadows with the model;
 * the retained city compositions serve only as distant scenery. */
export default function CharacterSetting({ id }: { id: Identity }) {
  const source = useTexture(id === 'business' ? '/media/explore-v10/waterfront-v5.webp' : id === 'city' ? '/media/explore-v10/innovation-v5.webp' : '/media/explore-v10/valley-v8.webp');
  const originalWood = useTexture('/models/twin/wood-color.jpg');
  const wood = useMemo(() => { const t = originalWood.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.colorSpace = THREE.SRGBColorSpace; return t; }, [originalWood]);
  useEffect(() => () => wood.dispose(), [wood]);
  return <group>
    <mesh position={[0, 1.65, -2.5]}><planeGeometry args={[8, 4.5]} /><meshBasicMaterial map={source} color={id === 'business' ? '#eee3ca' : '#fffef5'} toneMapped={false} /></mesh>
    {id === 'student' ? <ExplorerGround /> : id === 'city' ? <CivicGround /> : <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.012, 0]} receiveShadow><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#7e6b4c" map={wood} roughness={.76} /></mesh>}
    {id !== 'student' ? <>
      {/* Thin glazing divisions establish the office, with the city beyond. */}
      {[-1.55, -.8, .8, 1.55].map(x => <Rounded key={x} position={[x, 1.35, -1.65]} size={[.025, 2.7, .04]} color="#77745f" metal={.65} />)}
      <Rounded position={[0, 2.55, -1.65]} size={[3.6, .035, .05]} color="#77745f" metal={.65} />
      <group position={[.77, 0, -.32]}>
        <Rounded position={[0, .72, 0]} size={[.78, .04, .48]} color={id === 'business' ? '#665139' : '#dddac6'} />
        {[-.29, .29].map(x => <Rounded key={x} position={[x, .35, 0]} size={[.018, .7, .32]} color="#a69a74" metal={.65} />)}
        <Rounded position={[0, .75, 0]} size={[.56, .015, .34]} color="#68765d" />
        <RetainedArchitecture />
      </group>
      {id === 'business' && <group position={[-.7, 0, -.65]} rotation={[0, .28, 0]}>
        <Rounded position={[0, .44, 0]} size={[.48, .14, .48]} color="#393b32" />
        <Rounded position={[0, .76, -.2]} size={[.48, .53, .1]} color="#393b32" />
        {[-.25, .25].map(x => <group key={x}><Rounded position={[x, .59, .02]} size={[.065, .09, .45]} color="#544d3b" /><Rounded position={[x * .83, .2, -.12]} size={[.023, .4, .026]} color="#a08b57" metal={.65} /></group>)}
        {[0, 1, 2, 3, 4].map(i => <Rounded key={i} position={[(i - 2) * .075, .77, -.14]} size={[.003, .4, .006]} color="#a39774" />)}
      </group>}
      {id === 'business' && <group position={[-1.30, 0, -.85]}>
        <Rounded position={[0, .025, 0]} size={[.22, .05, .22]} color="#73623f" metal={.7} />
        <Rounded position={[0, .75, 0]} size={[.018, 1.45, .018]} color="#9c8252" metal={.7} />
        <mesh position={[0, 1.50, 0]}><cylinderGeometry args={[.15, .22, .23, 32, 1, true]} /><meshStandardMaterial color="#d7c398" roughness={.85} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 1.43, 0]}><sphereGeometry args={[.026, 12, 8]} /><meshStandardMaterial color="#ffdda2" emissive="#ffca77" emissiveIntensity={.7} /></mesh>
      </group>}
      <RetainedPlant position={[-1.05, 0, -.95]} size={1.25} />
    </> : <>
      <RetainedPlant tree position={[-1.55, -.01, -1.9]} size={3.3} />
      <RetainedPlant position={[.7, 0, -.5]} size={.7} />
      <Rounded position={[.9, .24, -.9]} size={[.7, .09, .32]} color="#9b8964" />
      {[-.26, .26].map(x => <Rounded key={x} position={[.9 + x, .12, -.9]} size={[.035, .24, .28]} color="#565f4d" />)}
      {[-.65, -.45, .45, .65].map(x => <group key={x} position={[x, 0, .05 + Math.abs(x)]}>
        <mesh position={[0, .05, 0]}><cylinderGeometry args={[.002, .003, .1, 6]} /><meshStandardMaterial color="#667c49" /></mesh>
        {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 3) * .014, .105, Math.sin(i * Math.PI / 3) * .014]} scale={[1, .3, 1]}><sphereGeometry args={[.012, 8, 6]} /><meshStandardMaterial color="#f0e1ba" /></mesh>)}
      </group>)}
    </>}
  </group>;
}
