import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { buildingPosition } from '@/lib/experience/CameraDirector';
import { buildingSize } from '@/components/3d/CityLife';
import {makeFacadeSurfaces} from './facadeSurfaces';

/** Project-authored geometry. The very same meshes supply the formation targets. */
export function makeCoastalDistrict(landmarks: THREE.Group[], buildingIds?: ReadonlySet<number>, financial=false) {
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const surfaces = makeFacadeSurfaces(),facade=surfaces.map;
  const palette = {
    glass: new THREE.MeshPhysicalMaterial({ color: financial?'#648a91':'#789d91', map: facade, roughnessMap: surfaces.roughnessMap, metalness: financial?.32:.62, roughness: .2, envMapIntensity: 1.5, clearcoat: .65, clearcoatRoughness: .12 }),
    blue: new THREE.MeshPhysicalMaterial({ color: financial?'#53778b':'#789aa8', map: facade, roughnessMap: surfaces.roughnessMap, metalness: financial?.34:.64, roughness: .22, envMapIntensity: 1.4, clearcoat: .55, clearcoatRoughness: .14 }),
    stone: new THREE.MeshStandardMaterial({ color: '#c8bda3', roughness: .79 }),
    limestone: new THREE.MeshStandardMaterial({ color: '#e1d6bd', roughness: .69 }),
    terracotta: new THREE.MeshStandardMaterial({ color: '#a67758', roughness: .82 }),
    frame: new THREE.MeshStandardMaterial({ color: '#344940', metalness: .68, roughness: .35 }),
    brass: new THREE.MeshStandardMaterial({ color: '#b1a17c', metalness: .72, roughness: .3 }),
    wood: new THREE.MeshStandardMaterial({ color: '#8f7050', roughness: .85 }),
    garden: new THREE.MeshStandardMaterial({ color: '#405f3a', roughness: 1 }),
    window: new THREE.MeshStandardMaterial({ color: '#e6c99c', emissive: '#e3ad61', emissiveIntensity: .16, roughness: .36 }),
  };
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  function add(g: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, scale: [number, number, number] = [1, 1, 1], rotation = 0) {
    p.set(x, y, z); s.set(...scale); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation); matrix.compose(p, q, s);
    g.applyMatrix4(matrix);
    const list = buckets.get(material) ?? []; list.push(g); buckets.set(material, list);
  }
  const box = (mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const cylinder = (mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => add(new THREE.CylinderGeometry(.5, .5, 1, 40), mat, x, y, z, [w, h, d]);
  const towerIds = [0, 9, 21, 6, 18];
  for (let id = 0; id < 25; id++) {
    if (buildingIds && !buildingIds.has(id)) continue;
    const [x, , z] = buildingPosition(id), [w, h, d] = buildingSize(id), kind = id % 7;
    box(palette.limestone, x, .3, z, w + 1.3, .6, d + 1.4);
    if (towerIds.includes(id)) continue;
    if (kind === 0 || kind === 5) {
      // Terraced courtyard and inhabited roof gardens, not a single scaled box.
      const tiers = kind === 0 ? 4 : 3;
      for (let t = 0; t < tiers; t++) {
        const tw = w * (1 - t * .17), td = d * (1 - t * .12), th = h / tiers;
        box(kind === 0 ? palette.limestone : palette.terracotta, x - t * .22, .6 + th * (t + .5), z, tw, th, td);
        for (let y = .6 + th * t + 1; y < .6 + th * (t + 1) - .4; y += 1.2) {
          box(palette.glass, x - t * .22, y, z + td / 2 + .018, tw - .7, .69, .04);
          for(let bay=-tw/2+.75;bay<tw/2-.5;bay+=1.25) box(palette.frame,x-t*.22+bay,y,z+td/2+.052,.045,.72,.06);
          box(palette.frame, x - t * .22, y - .38, z + td / 2 + .1, tw + .25, .1, .35);
          box(palette.glass, x + tw / 2 - t * .22 + .018, y, z, .04, .69, td - .8);
          box(palette.glass, x - tw / 2 - t * .22 - .018, y, z, .04, .69, td - .8);
          box(palette.frame, x + tw / 2 - t * .22 + .08, y - .38, z, .2, .1, td + .12);
          box(palette.frame, x - tw / 2 - t * .22 - .08, y - .38, z, .2, .1, td + .12);
        }
        box(palette.garden, x - t * .22, .6 + th * (t + 1) + .07, z, tw + .1, .14, td + .1);
      }
    } else if (kind === 1 || kind === 6) {
      // Rounded research towers with stone floor plates and bronze mullions.
      cylinder(kind === 1 ? palette.glass : palette.blue, x, h / 2 + .6, z, w, h, d);
      for (let y = 1; y <= h + .6; y += 1.35) cylinder(palette.limestone, x, y, z, w + .28, .12, d + .28);
      for (let a = 0; a < 20; a++) {
        const angle = a / 20 * Math.PI * 2;
        box(palette.brass, x + Math.sin(angle) * w * .501, h / 2 + .6, z + Math.cos(angle) * d * .501, .07, h, .07);
      }
      cylinder(palette.garden, x, h + .7, z, w * .83, .2, d * .83);
      cylinder(palette.frame, x, h + 1, z, w * .55, .5, d * .55);
    } else if (kind === 2) {
      // Two offset residential wings with projecting balconies.
      for (const side of [-1, 1]) {
        const bh = h * (side < 0 ? 1 : .74), bx = x + side * w * .255, bz = z + side * .65;
        box(palette.terracotta, bx, bh / 2 + .6, bz, w * .46, bh, d * .78);
        for (let y = 1.5; y < bh; y += 1.5) {
          box(palette.glass, bx, y, bz + d * .39 + .02, w * .38, .98, .04);
          for(let bay=-1;bay<=1;bay++) box(palette.frame,bx+bay*w*.13,y,bz+d*.39+.05,.045,1,.06);
          box(palette.limestone, bx, y - .55, bz + d * .39 + .3, w * .48, .12, .8);
          box(palette.frame, bx, y - .1, bz + d * .39 + .68, w * .48, .05, .045);
          for (const face of [-1, 1]) {
            const edge = bx + face * (w * .23 + .025);
            box(palette.glass, edge, y, bz, .05, .98, d * .62);
            box(palette.limestone, edge, y - .55, bz, .16, .12, d * .72);
            for (let bay = -1; bay <= 1; bay++) box(palette.frame, edge + face * .035, y, bz + bay * d * .2, .07, 1.02, .045);
          }
        }
      }
    } else if (kind === 3) {
      // Low public hall: long glazed room, broad floating roof, colonnade.
      const bh = Math.min(h, 8);
      box(palette.glass, x, bh / 2 + .6, z, w, bh, d);
      box(palette.wood, x, bh + .75, z, w + 2, .32, d + 2);
      box(palette.garden, x, bh + .96, z, w * .9, .1, d * .88);
      for (let i = 0; i < 6; i++) box(palette.limestone, x - w / 2 + i * w / 5, bh / 2, z + d / 2 + .65, .16, bh, .16);
      for (let i = 0; i < 5; i++) box(palette.brass, x - w / 2 + i * w / 4, bh / 2, z - d / 2 - .02, .06, bh, .08);
    } else {
      // Articulated office with alternating setbacks and a screened crown.
      const bh = h * .8;
      box(palette.blue, x, bh / 2 + .6, z, w, bh, d);
      box(palette.glass, x - w * .15, bh + h * .1 + .6, z, w * .7, h * .2, d * .8);
      for (let y = 1; y < bh; y += 1.25) {
        box(palette.limestone, x, y, z, w + .25, .1, d + .25);
      }
      for (let i = 0; i <= 8; i++) {
        box(palette.brass, x - w / 2 + w * i / 8, bh / 2 + .6, z + d / 2 + .06, .065, bh, .18);
        box(palette.frame, x + w / 2 + .06, bh / 2 + .6, z - d / 2 + d * i / 8, .18, bh, .065);
      }
      box(palette.frame, x - w * .15, h + .9, z, w * .72, .2, d * .82);
    }
    // Glazed ground floor and legible street-facing entrances.
    box(palette.glass, x, 1.25, z + d / 2 + .04, w * .62, 1.35, .08);
    box(palette.brass, x, 2.05, z + d / 2 + .55, w * .54, .12, 1.3);
    box(palette.frame, x, 1.2, z + d / 2 + .12, .065, 1.5, .08);
    for (let f = 2.8; f < Math.min(h, 15); f += 3) for (let bay = -1; bay <= 1; bay++) {
      if ((id + bay + Math.round(f)) % 3 === 0) box(palette.window, x + bay * w * .22, f, z + d / 2 + .12, w * .12, .55, .025);
    }
  }
  const architecture = new THREE.Group(); architecture.name = 'CT original coastal architecture v10';
  for (const [material, geometries] of buckets) {
    const flat = geometries.map(g => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); return n; });
    const merged = mergeGeometries(flat, false); flat.forEach(g => g.dispose());
    if (merged) { const mesh = new THREE.Mesh(merged, material); mesh.castShadow = mesh.receiveShadow = true; architecture.add(mesh); }
  }
  landmarks.forEach((source, i) => {
    if (buildingIds && !buildingIds.has(towerIds[i])) return;
    const id = towerIds[i], model = source.clone(true), bounds = new THREE.Box3().setFromObject(model), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
    const ratio = i < 3 ? buildingSize(id)[1] / size.y : Math.min(buildingSize(id)[1] / size.y, 12 / size.x, 11 / size.z), [x, , z] = buildingPosition(id);
    const holder = new THREE.Group(); holder.position.set(x, 0, z);
    model.position.set(-center.x * ratio, -bounds.min.y * ratio, -center.z * ratio); model.scale.setScalar(ratio);
    const cloned = new Map<THREE.Material, THREE.Material>();
    const cloneMaterial = (source: THREE.Material) => {
      if (cloned.has(source)) return cloned.get(source)!;
      const material = source.clone() as THREE.MeshPhysicalMaterial;
      // The complete studio retains transmission. At district scale a reflective
      // glass LOD avoids a second full-scene transmission render for tiny panes.
      if (material.transmission > 0) { material.transmission = 0; material.metalness = .45; material.roughness = .18; material.envMapIntensity = 1.3; }
      cloned.set(source, material); return material;
    };
    model.traverse(o => { if (o instanceof THREE.Mesh) { o.material = Array.isArray(o.material) ? o.material.map(cloneMaterial) : cloneMaterial(o.material); o.castShadow = o.receiveShadow = true; } });
    holder.add(model); architecture.add(holder);
  });
  architecture.updateMatrixWorld(true);
  return architecture;
}

export function sampleActualSurfaces(group: THREE.Group, count: number, seed = 20261108) {
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  group.updateMatrixWorld(true);
  const sources: { sampler: MeshSurfaceSampler; mesh: THREE.Mesh; cumulative: number }[] = [];
  let total = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  group.traverse(o => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh) return;
    const pos = o.geometry.getAttribute('position'), ix = o.geometry.index;
    let area = 0;
    for (let i = 0; i < (ix?.count ?? pos.count); i += 3) {
      a.fromBufferAttribute(pos, ix ? ix.getX(i) : i).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, ix ? ix.getX(i + 1) : i + 1).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, ix ? ix.getX(i + 2) : i + 2).applyMatrix4(o.matrixWorld);
      area += b.sub(a).cross(c.sub(a)).length() * .5;
    }
    if (area > 0) {
      total += area;
      // r187 exposes this method; the installed @types package omits it.
      const sampler = new MeshSurfaceSampler(o) as MeshSurfaceSampler & { setRandomGenerator: (random: () => number) => MeshSurfaceSampler };
      sources.push({ sampler: sampler.setRandomGenerator(random).build(), mesh: o, cumulative: total });
    }
  });
  const targets = new Float32Array(count * 3), origins = new Float32Array(count * 3), seeds = new Float32Array(count);
  const point = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const pick = random() * total, source = sources.find(x => x.cumulative >= pick) ?? sources[sources.length - 1];
    source.sampler.sample(point); point.applyMatrix4(source.mesh.matrixWorld);
    targets.set(point.toArray(), i * 3); origins.set([random() * 145 - 72.5, random() * 58, random() * 100 - 72], i * 3); seeds[i] = random();
  }
  return { targets, origins, seeds, sourceMeshes: sources.length };
}

/** Cached glTF buffers belong to useGLTF. Dispose only merged original buffers and cloned materials. */
export function disposeCoastalDistrict(group: THREE.Group) {
  const owned = new Set<THREE.Material>();
  group.traverse(o => { if (o instanceof THREE.Mesh) { if (o.parent === group) o.geometry.dispose(); for (const m of Array.isArray(o.material) ? o.material : [o.material]) owned.add(m); } });
  const textures = new Set<THREE.Texture>();
  owned.forEach(m => {for(const texture of [(m as THREE.MeshStandardMaterial).map,(m as THREE.MeshStandardMaterial).roughnessMap])if(texture?.userData.carbonTwinOwned) textures.add(texture);});
  textures.forEach(t => t.dispose());
  owned.forEach(m => m.dispose());
}
