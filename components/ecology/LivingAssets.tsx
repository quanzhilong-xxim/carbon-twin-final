'use client';
import { useGLTF } from '@/lib/three/scene-assets';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { studentCharacter, studentPerformance } from '@/lib/visuals/studentPerformance';
import { characterQualityForDevice, exploreCharacterModel, type CharacterQuality } from '@/lib/visuals/exploreCharacterAssets';
import { makeCoastalDistrict, disposeCoastalDistrict } from '@/lib/visuals/coastalGeometry';
import { companionMotion } from './companionMotion';

/** Shared original master meshes: one cow also supplies the calf instance. */
export function CompanionAnimal({ kind = 'cat', position = [0, 0, 0], scale = 1, rotation = 0, vitality = .7, paused = false, reaction = 0, onInteract, modelUrl }: {
  kind?: 'cat' | 'cow' | 'sheep'; position?: [number, number, number]; scale?: number; rotation?: number; vitality?: number; paused?: boolean; reaction?: number; onInteract?: () => void; modelUrl?: string;
}) {
  const asset = modelUrl ?? `/models/behaviour-v108/${kind}.glb`;
  const { scene } = useGLTF(asset);
  const { gl } = useThree();
  const { model, motion, skinnedMeshes, headMesh } = useMemo(() => {
    const model = cloneSkeleton(scene);
    let skinnedMeshes = 0, headMesh: THREE.SkinnedMesh | undefined;
    model.traverse(o => {
      if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; }
      if (o instanceof THREE.SkinnedMesh) { skinnedMeshes++; if (/continuous_rounded_feline_head/i.test(o.name)) headMesh = o; }
    });
    return { model, motion: companionMotion(model, kind), skinnedMeshes, headMesh };
  }, [scene, kind]);
  useEffect(() => () => {
    const skeletons = new Set<THREE.Skeleton>();
    model.traverse(o => { if (o instanceof THREE.SkinnedMesh) skeletons.add(o.skeleton); });
    skeletons.forEach(s => s.dispose());
  }, [model]);
  // Expose the loaded interaction rig as soon as the GLB is mounted. WebKit
  // can report the scene ready before its first animation frame, so tests and
  // assistive diagnostics must not depend on useFrame having run already.
  useLayoutEffect(() => {
    if (!onInteract) return;
    const canvas = gl.domElement;
    const parts = [motion.parts.head, motion.parts.tail, motion.parts.breath, ...motion.parts.ears].filter(Boolean).length;
    canvas.dataset.companionParts = String(parts);
    canvas.dataset.companionEyes = String(motion.parts.eyes.length);
    canvas.dataset.companionAsset = asset;
    canvas.dataset.companionSkinnedMeshes = String(skinnedMeshes);
    canvas.dataset.companionMorphs = String(motion.parts.eyes.filter(eye => eye.blink !== undefined).length);
    canvas.dataset.companionPaws = String(motion.parts.paws.filter(Boolean).length);
  }, [asset, gl, motion, onInteract, skinnedMeshes]);
  const vertex = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ gl }, dt) => {
    motion.update(dt, vitality, paused, reaction);
    gl.domElement.dataset[`${kind}AnimatedParts`] = [motion.parts.head, motion.parts.tail, motion.parts.breath, ...motion.parts.ears].filter(Boolean).length.toString();
    gl.domElement.dataset[`${kind}MotionTime`] = motion.elapsed.toFixed(4);
    // Report the transforms of the loaded GLB, so browser checks can verify
    // real motion and a frozen pose rather than only a changing UI counter.
    if (onInteract) {
      gl.domElement.dataset.companionTime = motion.elapsed.toFixed(4);
      gl.domElement.dataset.companionReaction = String(reaction);
      gl.domElement.dataset.companionPaused = String(paused);
      gl.domElement.dataset.companionHead = motion.parts.head?.rotation.toArray().slice(0, 3).map(v => Number(v).toFixed(4)).join(',') ?? 'missing';
      gl.domElement.dataset.companionParts = [motion.parts.head, motion.parts.tail, motion.parts.breath, ...motion.parts.ears].filter(Boolean).length.toString();
      gl.domElement.dataset.companionEyes = String(motion.parts.eyes.length);
      gl.domElement.dataset.companionAsset = asset;
      gl.domElement.dataset.companionSkinnedMeshes = String(skinnedMeshes);
      gl.domElement.dataset.companionMorphs = String(motion.parts.eyes.filter(eye => eye.blink !== undefined).length);
      gl.domElement.dataset.companionPaws = String(motion.parts.paws.filter(Boolean).length);
      const eye = motion.parts.eyes.find(e => e.blink !== undefined);
      gl.domElement.dataset.companionBlink = eye?.object instanceof THREE.Mesh && eye.blink !== undefined ? String(eye.object.morphTargetInfluences?.[eye.blink] ?? 0) : 'legacy';
      if (headMesh) { model.updateMatrixWorld(true); headMesh.getVertexPosition(0, vertex); gl.domElement.dataset.companionVertex = vertex.toArray().map(n => n.toFixed(4)).join(','); }
    }
  });
  return <group position={position} scale={scale} rotation={[0, rotation, 0]} onClick={onInteract ? event => { if (event.delta < 4) { event.stopPropagation(); onInteract(); } } : undefined}><primitive object={model} dispose={null} /></group>;
}

/** The same skinned explorer as the identity page, never an unrelated cutout. */
export function MeadowExplorer({ position = [0, 0, 0], scale = 1, paused = false, seated = false }: { position?: [number, number, number]; scale?: number; paused?: boolean; seated?: boolean }) {
  // V13.5: the sakura scene resolves the SAME master student asset as the
  // identity page, using the shared device LOD policy instead of forking a model.
  const [quality] = useState<CharacterQuality>(() => characterQualityForDevice());
  const { scene } = useGLTF(exploreCharacterModel('student', quality));
  const rig = useMemo(() => studentCharacter(scene), [scene]);
  const performance = useMemo(() => studentPerformance(rig.model), [rig]);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const sitting = useMemo(() => {
    // The retained humanoid has real weighted legs. Rotate in model space so
    // the pose does not depend on the source bone's local axis convention.
    const entries = ['L', 'R'].flatMap(side => ['UpperLeg', 'LowerLeg'].map(part => {
      const bone = rig.model.getObjectByName(`J_Bip_${side}_${part}`);
      return bone ? { bone, rest: bone.quaternion.clone(), angle: part === 'UpperLeg' ? -1.35 : 1.45 } : null;
    })).filter((v): v is NonNullable<typeof v> => v !== null);
    rig.model.traverse(o => { if (/skateboard|maple deck|mineral griptape|laminated rail|wheel urethane|aluminium trucks/i.test(o.name)) o.visible = !seated; });
    return entries;
  }, [rig, seated]);
  useEffect(() => () => rig.dispose(), [rig]);
  useFrame((_, dt) => {
    performance.update(dt, 'idle', 0, paused, paused, pointer, false);
    if (seated) for (const { bone, rest, angle } of sitting) {
      bone.quaternion.copy(rest); rig.model.updateMatrixWorld(true);
      const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(rig.model.getWorldQuaternion(new THREE.Quaternion()));
      if (bone.parent) axis.applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
      bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, angle));
    }
  });
  return <group position={position} rotation={[0, -.35, 0]} scale={scale}><primitive object={rig.model} dispose={null} /></group>;
}

export function RetainedCity({ position = [0, 0, 0], height = 3 }: { position?: [number, number, number]; height?: number }) {
  const [a,b,c,d,e] = useGLTF(['/models/city-studies/b01-diagrid-lod.glb', '/models/city-studies/b02-spiral-lod.glb', '/models/city-studies/b03-deco-lod.glb', '/models/citylight/v12/light-court-lod.glb', '/models/citylight/v11/tide-gate-a-lod.glb']);
  const { model, center, low, size } = useMemo(() => {
    // Reuse five retained architectural masters with stable cache identities.
    const model = makeCoastalDistrict([a.scene,b.scene,c.scene,d.scene,e.scene]);
    const box = new THREE.Box3().setFromObject(model);
    return { model, center: box.getCenter(new THREE.Vector3()), low: box.min.y, size: box.getSize(new THREE.Vector3()).y };
  }, [a.scene,b.scene,c.scene,d.scene,e.scene]);
  useEffect(() => () => disposeCoastalDistrict(model), [model]);
  return <group position={position} scale={height / size}><primitive object={model} position={[-center.x, -low, -center.z]} dispose={null} /></group>;
}
