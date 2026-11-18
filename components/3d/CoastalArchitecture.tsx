'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import { useEffect, useMemo, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import * as THREE from 'three';
import { disposeCoastalDistrict, makeCoastalDistrict, sampleActualSurfaces } from '@/lib/visuals/coastalGeometry';
import { dustFragment, dustVertex } from '@/lib/visuals/cityDust';
import { installSurfaceReveal } from '@/lib/visuals/surfaceReveal';

export default function CoastalArchitecture({ progress, onSelect }: { progress: MutableRefObject<number>; onSelect: (id: number) => void }) {
  const { gl } = useThree();
  const [a, b, c, d, e] = useGLTF(['/models/city-studies/b01-diagrid-lod.glb', '/models/city-studies/b02-spiral-lod.glb', '/models/city-studies/b03-deco-lod.glb', '/models/citylight/v12/light-court-lod.glb', '/models/citylight/v11/tide-gate-a-lod.glb']);
  const model = useMemo(() => makeCoastalDistrict([a.scene, b.scene, c.scene, d.scene, e.scene]), [a.scene, b.scene, c.scene, d.scene, e.scene]);
  const particles = useMemo(() => {
    const data = sampleActualSurfaces(model, 10500), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.targets, 3));
    g.setAttribute('aDust', new THREE.BufferAttribute(data.origins, 3));
    g.setAttribute('aFlow', new THREE.BufferAttribute(data.origins.map((v, i) => i % 3 === 1 ? v * .25 + 8 : v * .75), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(data.seeds, 1));
    return { g, sources: data.sourceMeshes };
  }, [model]);
  const uniforms = useMemo(() => ({ uProgress: { value: 0 }, uTime: { value: 0 }, uDpr: { value: 1 }, uOpacity: { value: 0 } }), []);
  const reveal = useMemo(() => ({ value: 0 }), []);
  useEffect(() => {
    const surfaces = new Set<THREE.Material>();
    model.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      materials.forEach(m => surfaces.add(m));
    });
    const restore = [...surfaces].map(m => installSurfaceReveal(m, reveal));
    return () => { restore.forEach(fn => fn()); disposeCoastalDistrict(model); particles.g.dispose(); };
  }, [model, particles, reveal]);
  useFrame(({ clock }) => {
    const p = progress.current;
    // Formation takes place in the original model space. No approximate box targets.
    uniforms.uProgress.value = THREE.MathUtils.clamp((p - .42) / .5, 0, 1);
    uniforms.uOpacity.value = THREE.MathUtils.smoothstep(p, .38, .52);
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uDpr.value = gl.getPixelRatio();
    reveal.value = THREE.MathUtils.smoothstep(p, .69, .92);
    model.visible = p > .68;
    gl.domElement.dataset.citySurfaceMeshes = String(particles.sources);
    gl.domElement.dataset.citySurfaceSamples = String(particles.g.getAttribute('position').count);
    gl.domElement.dataset.architectureVersion = 'coastal-v10';
  });
  return <>
    <points geometry={particles.g} frustumCulled={false} dispose={null}><shaderMaterial uniforms={uniforms} vertexShader={dustVertex} fragmentShader={dustFragment} transparent depthWrite={false} /></points>
    <primitive object={model} dispose={null} onClick={(event: { stopPropagation: () => void; point: THREE.Vector3 }) => {
      if (progress.current < .9) return;
      event.stopPropagation();
      const local = model.worldToLocal(event.point.clone());
      let closest = 0, distance = Infinity;
      for (let id = 0; id < 25; id++) {
        const x = id === 0 ? 0 : (((id - 1) % 8) - 3.5) * 13;
        const z = id === 0 ? 0 : -18 - Math.floor((id - 1) / 8) * 13;
        const d = (local.x - x) ** 2 + (local.z - z) ** 2;
        if (d < distance) { closest = id; distance = d; }
      }
      onSelect(closest);
    }} />
  </>;
}
