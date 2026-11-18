'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';

import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';

/** Attributed, actual human meshes. A separate LOD never changes the role asset. */
export default function CoastalCitizens({ progress }: { progress: MutableRefObject<number> }) {
  const { scene } = useGLTF('/models/characters-v10/CT_Citizen_Rain_LOD_v1.glb');
  const root = useRef<THREE.Group>(null), instances = useRef<(THREE.InstancedMesh | null)[]>([]);
  const placements = useMemo(() => [
    [-34,3.7,.2],[-32,3.3,2.4],[-14,2.7,-.2],[-12,3.3,2.8],[-4,-7.8,.7],[-2,-7.8,-1],
    [12,3.2,-.6],[18,3.2,1.5],[23,4.2,-1.5],[38,3.6,-.4],[40,3.2,2.6],[10,-8,1.3],
  ], []);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.72 / size.y;
    const normalize = new THREE.Matrix4().makeScale(scale, scale, scale).multiply(new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    scene.traverse(o => {
      if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
      const source = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(normalize, o.matrixWorld));
      const g = source.index ? source.toNonIndexed() : source;
      if(g!==source)source.dispose();
      for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);
      const list=buckets.get(o.material)??[];list.push(g);buckets.set(o.material,list);
    });
    return [...buckets].map(([source,geometries]) => {
      const geometry = mergeGeometries(geometries, false)!;geometries.forEach(g=>g.dispose());
      const material=source.clone() as THREE.MeshPhysicalMaterial;
      if(material.transmission){material.transmission=0;material.metalness=.15;material.roughness=.15;}
      return {geometry,material};
    });
  },[scene]);
  useEffect(()=>()=>parts.forEach(p=>{p.geometry.dispose();p.material.dispose();}),[parts]);
  useEffect(()=>{
    const object = new THREE.Object3D();
    placements.forEach(([x,z,angle],i)=>{
      object.position.set(x,.08,z);object.rotation.y=angle;object.scale.setScalar(.94+(i%3)*.06);object.updateMatrix();
      parts.forEach((part,j)=>{
        const mesh=instances.current[j];mesh?.setMatrixAt(i,object.matrix);
        if(/plum|rose/.test(part.material.name))mesh?.setColorAt(i,new THREE.Color(['#e6cfab','#667a62','#b1b8c5','#bea173'][i%4]));
      });
    });
    instances.current.forEach(m=>{if(m){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere();}});
  },[parts,placements]);
  useFrame(({gl})=>{if(root.current)root.current.visible=progress.current>.93;gl.domElement.dataset.citizens=progress.current>.93?String(placements.length):'0';});
  return <group ref={root} visible={false}>{parts.map((p,i)=><instancedMesh key={i} ref={m=>{instances.current[i]=m;}} args={[p.geometry,p.material,placements.length]} receiveShadow/>)}</group>;
}
