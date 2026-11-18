'use client';
import { useTexture } from '@/lib/three/scene-assets';
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export function MeadowGround({ position = [0, 0, 0], size = 40, tint = '#c4c7a4' }: { position?: [number, number, number]; size?: number | [number, number]; tint?: string }) {
  const [width, depth] = typeof size === 'number' ? [size, size] : size;
  const source = useTexture(['/textures/behaviour-v108/grass/color.jpg', '/textures/behaviour-v108/grass/normal.jpg', '/textures/behaviour-v108/grass/roughness.jpg']);
  const maps = useMemo(() => source.map((t, i) => { const m = t.clone(); m.wrapS = m.wrapT = THREE.RepeatWrapping; m.repeat.set(width / 9, depth / 9); m.anisotropy = 4; if (i === 0) m.colorSpace = THREE.SRGBColorSpace; m.needsUpdate = true; return m; }), [source, width, depth]);
  useEffect(() => () => maps.forEach(t => t.dispose()), [maps]);
  return <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[width, depth]} /><meshStandardMaterial map={maps[0]} normalMap={maps[1]} normalScale={new THREE.Vector2(.5, .5)} roughnessMap={maps[2]} roughness={.95} color={tint} /></mesh>;
}

/** Real planar reflection with one small render target; the normal map is
 * authored locally. It reflects the actual skyline, never a pasted image. */
export function StoryWater({ position, size = [60, 10], paused = false, night = false, reflectionIntervalMs=50 }: { position: [number, number, number]; size?: [number, number]; paused?: boolean; night?: boolean; reflectionIntervalMs?:number }) {
  const [width, depth] = size;
  const water = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(width, depth);
    const base = (Reflector as typeof Reflector & { ReflectorShader: { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string } }).ReflectorShader;
    const shader = { ...base, uniforms: { ...THREE.UniformsUtils.clone(base.uniforms), uTime: { value: 0 } },
      vertexShader: 'varying vec2 vWaterPosition;\n' + base.vertexShader.replace('void main() {', 'void main() { vWaterPosition=position.xy;'),
      fragmentShader: 'uniform float uTime; varying vec2 vWaterPosition;\n' + base.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );', 'vec4 rippleUv=vUv; rippleUv.xy+=vec2(sin(vWaterPosition.x*2.3+uTime)*cos(vWaterPosition.y*1.7+uTime*.7),cos(vWaterPosition.y*3.1-uTime*.6))*.0016*vUv.w; vec4 base=texture2DProj(tDiffuse,rippleUv);').replace('blendOverlay( base.rgb, color )', 'mix(color, blendOverlay(base.rgb,color),.28)') };
    const mesh = new Reflector(geometry, { textureWidth: 256, textureHeight: 256, color: 0x6a887e, clipBias: .003, shader });
    mesh.rotation.x = -Math.PI / 2;
    // The slow water needs fewer reflection captures than the main camera.
    // Reuse the real scene target between captures, with immediate updates for
    // camera/lens changes. This avoids drawing the entire city twice per frame.
    const capture = mesh.onBeforeRender.bind(mesh), previousView = new THREE.Matrix4(), previousLens = new THREE.Matrix4();
    let capturedAt = -Infinity;
    mesh.onBeforeRender = (renderer, scene, camera, ...rest) => {
      const now = performance.now();
      if (now-capturedAt < reflectionIntervalMs && previousView.equals(camera.matrixWorld) && previousLens.equals(camera.projectionMatrix)) return;
      previousView.copy(camera.matrixWorld); previousLens.copy(camera.projectionMatrix); capturedAt=now;
      capture(renderer,scene,camera,...rest);
    };
    // R3F's dispose={null} is assigned to the primitive itself; retain the
    // owner's disposal function before mounting it into the reconciler.
    return { mesh, geometry, material: mesh.material as THREE.ShaderMaterial, release: mesh.dispose.bind(mesh) };
  }, [width, depth,reflectionIntervalMs]); // primitive owns the reflection target and texture
  useEffect(() => { water.material.uniforms.color.value.set(night ? '#273e51' : '#6a887e'); }, [water, night]);
  useEffect(() => () => { water.geometry.dispose(); water.release(); }, [water]);
  useFrame((_, dt) => { if (!paused) water.material.uniforms.uTime.value += Math.min(dt, .05) * .35; });
  return <><primitive object={water.mesh} position={position} dispose={null} /><mesh position={[position[0], position[1] + .006, position[2]]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}><planeGeometry args={[width, depth]} /><meshBasicMaterial color={night ? "#294a56" : "#4f8b86"} transparent opacity={night ? .34 : .24} depthWrite={false} /></mesh></>;
}
