'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import { useEffect, useMemo, useRef } from 'react';

import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStoryAtmosphere } from '@/lib/stores/StoryAtmosphere';
import {storyLighting} from '@/lib/visuals/storyLighting';
import ExploreStaticBatch from './ExploreStaticBatch';
import {makeFinancialSkyline,FINANCIAL_SKYLINE_COUNT} from '@/lib/visuals/financialSkyline';

/** Distant massing supplies depth; detailed source buildings stay in the foreground. */
export default function CityBackdrop() {
  const time = useStoryAtmosphere(s => s.time), { gl } = useThree();
  const {scene:kit}=useGLTF('/models/citylight/v12/light-court-lod.glb');
  const architecture=useMemo(()=>makeFinancialSkyline(kit),[kit]);
  useEffect(()=>()=>{architecture.group.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose();});architecture.materials.forEach(material=>material.dispose());architecture.disposeSurfaces();},[architecture]);
  useEffect(()=>{const light=storyLighting(time);architecture.interior.emissiveIntensity=light.windows*.85;architecture.interior.color.set(time==='night'||time==='bluehour'?'#f5dcb4':'#516b76');architecture.crown.emissiveIntensity=light.windows;},[architecture,time]);
  useEffect(() => {
    gl.domElement.dataset.skylineBuildings = String(FINANCIAL_SKYLINE_COUNT);
    gl.domElement.dataset.skylineRevision = 'v123-financial';
    gl.domElement.dataset.skylineDesign = 'light-court-materials-five-forms';
    return () => { delete gl.domElement.dataset.skylineBuildings; delete gl.domElement.dataset.skylineRevision; delete gl.domElement.dataset.skylineDesign; };
  }, [gl]);
  return <group name="Distant-design-study-skyline">
    <ExploreStaticBatch>
      <mesh position={[0,-.069,-127]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[390,146]}/><meshStandardMaterial color="#6c7770" roughness={1}/></mesh>
      {[-64,-89,-115,-149,-184].map(z=><mesh key={z} position={[0,-.055,z]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[385,3.2]}/><meshStandardMaterial color="#637775" roughness={1}/></mesh>)}
      {[-143,-91,-39,13,65,117,169].map(x=><mesh key={x} position={[x,-.05,-125]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[3.2,145]}/><meshStandardMaterial color="#637775" roughness={1}/></mesh>)}
    </ExploreStaticBatch>
    <primitive object={architecture.group} dispose={null}/>
  </group>;
}

/** Reuse the original local pedestrian mesh with one draw per source surface. */
export function CityPedestrians() {
  const { scene } = useGLTF('/models/city-studies/pedestrian.glb');
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]), { gl } = useThree();
  const placements = useMemo(() => [[-28, 7.4, .3], [-26, 7.2, -.4], [-10, 5.3, 2.3], [8, 5.6, -.8], [29, 7, 1.7], [32, 7.1, -1.5], [-15, -8.4, .4], [20, -21.2, 2.6]], []);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const normalize = new THREE.Matrix4().makeScale(1.72 / size.y, 1.72 / size.y, 1.72 / size.y)
      .multiply(new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
    const result: { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[] }[] = [];
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) result.push({ geometry: object.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(normalize, object.matrixWorld)), material: object.material });
    });
    return result;
  }, [scene]);
  useEffect(() => () => parts.forEach(part => part.geometry.dispose()), [parts]);
  useEffect(() => {
    const object = new THREE.Object3D();
    placements.forEach(([x, z, angle], i) => {
      object.position.set(x, .09, z); object.rotation.y = angle; object.scale.setScalar(.94 + i % 3 * .04); object.updateMatrix();
      refs.current.forEach(mesh => mesh?.setMatrixAt(i, object.matrix));
    });
    refs.current.forEach(mesh => { if (mesh) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); } });
    gl.domElement.dataset.pedestrians = String(placements.length);
    return () => { delete gl.domElement.dataset.pedestrians; };
  }, [gl, parts, placements]);
  return <group name="Retained-street-pedestrians">{parts.map((part, i) => <instancedMesh key={i} ref={mesh => { refs.current[i] = mesh; }} args={[part.geometry, part.material, placements.length]} dispose={null} />)}</group>;
}
