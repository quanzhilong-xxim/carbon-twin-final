'use client';
import { useEffect, type RefObject } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { focusModel, useUIStore } from '@/lib/stores/UIStore';
import type { ModelTarget } from '@/types';

const viewpoints: Record<ModelTarget, [number, number, number]> = {
  overview: [0, 0, 0], food: [0, .3, 0], beefTendon: [-.9, -.55, .38], energy: [-2.3, .7, 0], transport: [2.35, -.25, 0],
};
type Part = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

export function useCarbonModel(host: RefObject<HTMLDivElement>, onExplore: RefObject<(() => void) | undefined>) {
  useEffect(() => {
    const element = host.current; if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch { element.dataset.fallback = 'true'; return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); element.append(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 50);
    camera.position.set(4, 2.6, 6);
    scene.add(new THREE.AmbientLight('#A8C5FF', 2));
    const light = new THREE.PointLight('#8FFFD2', 50); light.position.set(2, 4, 3); scene.add(light);
    const group = new THREE.Group(); scene.add(group);
    const parts: Part[] = [], targets = new Map<THREE.Object3D, ModelTarget>();
    const add = (geometry: THREE.BufferGeometry, position: THREE.Vector3, name: ModelTarget, color = '#81CCB3') => {
      const material = new THREE.MeshStandardMaterial({ color, metalness: .65, roughness: .3, emissive: color, emissiveIntensity: .12, transparent: true });
      const mesh = new THREE.Mesh(geometry, material); mesh.position.copy(position); mesh.name = name;
      group.add(mesh); parts.push(mesh); targets.set(mesh, name); return mesh;
    };
    const body = add(new THREE.SphereGeometry(1, 24, 16), new THREE.Vector3(0, .3, 0), 'food'); body.scale.set(1.5, .65, .6);
    const head = add(new THREE.SphereGeometry(.48, 18, 12), new THREE.Vector3(1.5, .65, 0), 'food'); head.scale.set(.75, 1, .75);
    const muzzle = add(new THREE.SphereGeometry(.24, 12, 8), new THREE.Vector3(1.85, .5, 0), 'food'); muzzle.scale.set(1, .65, 1.2);
    for (const x of [-.9, .9]) for (const z of [-.38, .38]) add(new THREE.CylinderGeometry(.13, .1, .95, 12), new THREE.Vector3(x, -.55, z), x === -.9 && z === .38 ? 'beefTendon' : 'food');
    for (const z of [-.25, .25]) { const ear = add(new THREE.SphereGeometry(.18, 12, 8), new THREE.Vector3(1.5, 1.02, z), 'food'); ear.scale.set(.45, .4, 1.1); }
    add(new THREE.IcosahedronGeometry(.24, 1), new THREE.Vector3(...viewpoints.energy), 'energy', '#9CB8FF');
    add(new THREE.OctahedronGeometry(.22), new THREE.Vector3(...viewpoints.transport), 'transport', '#DEC384');
    const floor = new THREE.GridHelper(7, 22, '#2E655F', '#1D3545'); floor.position.y = -1.1; scene.add(floor);
    const pathGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...viewpoints.energy), new THREE.Vector3(0, .3, 0), new THREE.Vector3(...viewpoints.transport)]);
    const pathMaterial = new THREE.LineDashedMaterial({ color: '#80BFB1', dashSize: .12, gapSize: .08, transparent: true, opacity: .45 });
    const path = new THREE.Line(pathGeometry, pathMaterial); path.computeLineDistances(); scene.add(path);
    const target = new THREE.Vector3(), raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let frame = 0, visible = true, disposed = false, timeline: gsap.core.Timeline | null = null;
    const context = gsap.context(() => undefined);
    const render = () => {
      frame = 0; if (disposed || document.hidden || !visible) return;
      camera.lookAt(target); renderer.render(scene, camera);
      element.dataset.focus = useUIStore.getState().focus; element.dataset.rendered = 'true';
    };
    const schedule = () => { if (!frame && !disposed && !document.hidden && visible) frame = requestAnimationFrame(render); };
    const select = () => {
      const state = useUIStore.getState(), focus = state.focus, focused = focus !== 'overview';
      element.dataset.focus = focus;
      const point = new THREE.Vector3(...viewpoints[focus]);
      timeline?.kill();
      context.add(() => {
        timeline = gsap.timeline({ onUpdate: schedule });
        const duration = state.reduced ? .01 : 1.2;
        timeline.to(camera.position, { x: focused ? point.x + 1.9 : 4, y: focused ? point.y + 1 : 2.6, z: focused ? 2.8 : 6, duration, ease: 'power3.inOut' }, 0)
          .to(target, { x: point.x, y: point.y, z: point.z, duration, ease: 'power3.inOut' }, 0);
        parts.forEach(part => timeline?.to(part.material, { opacity: focused && part.name !== focus ? .3 : 1, emissiveIntensity: focused && part.name === focus ? 1.5 : .12, duration: state.reduced ? .01 : .8 }, 0));
      });
      schedule();
    };
    const unsubscribe = useUIStore.subscribe((state, previous) => { if (state.focusRevision !== previous.focusRevision || state.reduced !== previous.reduced) select(); });
    const resize = () => { renderer.setSize(element.clientWidth, element.clientHeight, false); camera.aspect = element.clientWidth / Math.max(element.clientHeight, 1); camera.updateProjectionMatrix(); schedule(); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const viewport = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }); viewport.observe(element);
    document.addEventListener('visibilitychange', schedule);
    const click = (event: PointerEvent) => {
      if (useUIStore.getState().networkBusy) return;
      const rect = element.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height * 2 - 1));
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(parts)[0], focus = hit ? targets.get(hit.object) : undefined;
      if (focus) { focusModel(focus); onExplore.current?.(); }
    };
    element.addEventListener('pointerdown', click); select();
    return () => {
      disposed = true; cancelAnimationFrame(frame); timeline?.kill(); context.revert(); unsubscribe(); observer.disconnect(); viewport.disconnect();
      document.removeEventListener('visibilitychange', schedule); element.removeEventListener('pointerdown', click);
      parts.forEach(part => { part.geometry.dispose(); part.material.dispose(); });
      floor.geometry.dispose(); (floor.material as THREE.Material).dispose(); pathGeometry.dispose(); pathMaterial.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [host, onExplore]);
}
