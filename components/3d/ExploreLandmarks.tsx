'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import { useEffect, useMemo } from 'react';

import * as THREE from 'three';
import { buildingPosition } from '@/lib/experience/CameraDirector';
import { buildingSize } from './CityLife';

export const exploreLandmarks = [
  { id: 0, file: 'b01-diagrid-lod', name: '春笋 · 斜网格塔' },
  { id: 9, file: 'b02-spiral-lod', name: '云旋 · 幕墙塔' },
  { id: 21, file: 'b03-deco-lod', name: '时序 · 退台塔' },
] as const;

function Landmark({ id, file }: { id: number; file: string }) {
  const { scene } = useGLTF(`/models/city-studies/${file}.glb`);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
    const [, height] = buildingSize(id), ratio = height / size.y;
    clone.position.set(-center.x * ratio, -bounds.min.y * ratio, -center.z * ratio);
    clone.scale.setScalar(ratio);
    return clone;
  }, [id, scene]);
  useEffect(() => { model.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } }); }, [model]);
  return <group position={buildingPosition(id)}><primitive object={model} dispose={null} /></group>;
}

export default function ExploreLandmarks() {
  return <>{exploreLandmarks.map(landmark => <Landmark key={landmark.id} {...landmark} />)}</>;
}
