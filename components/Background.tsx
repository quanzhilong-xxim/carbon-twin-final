'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useUIStore } from '@/lib/stores/UIStore';
import { THEMES as IDENTITIES, type Identity } from '@/lib/store';

export default function Background({ identity }: { identity: Identity }) {
  const emotion = useUIStore(s => s.emotion);
  const hostRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef({ primary: new THREE.Color(IDENTITIES[identity].accent), secondary: new THREE.Color(IDENTITIES[identity].secondary) });
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    paletteRef.current.primary.set(emotion === 'danger' ? '#FF869C' : IDENTITIES[identity].accent);
    paletteRef.current.secondary.set(emotion === 'danger' ? '#A32435' : IDENTITIES[identity].secondary);
    redrawRef.current?.();
  }, [identity, emotion]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' }); }
    catch { host.dataset.fallback = 'true'; return; }
    const narrow = window.innerWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, narrow ? 1.25 : 1.7));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 80);
    camera.position.set(0, .6, 5);
    camera.lookAt(0, 0, 0);
    const universe = new THREE.Group(); scene.add(universe); universe.scale.setScalar(.62);
    const city = new THREE.Group(); city.position.set(0, .2, 0); universe.add(city);
    const primary = new THREE.Color(IDENTITIES.student.accent);
    const secondary = new THREE.Color(IDENTITIES.student.secondary);
    const sharedUniforms = { uTime: { value: 0 }, uPrimary: { value: primary }, uSecondary: { value: secondary }, uPixel: { value: renderer.getPixelRatio() } };
    const count = narrow ? 6000 : 14000;
    const positions = new Float32Array(count * 3), seeds = new Float32Array(count), sizes = new Float32Array(count);
    // A seeded spiral galaxy: four arms, a central bulge, and a soft dust halo.
    const rand = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    for (let i = 0; i < count; i++) {
      const r = Math.pow(rand(i + 1), .65) * 4.8;
      const arm = (i % 4) * Math.PI / 2;
      const angle = arm + r * 1.35 + (rand(i + 8) - .5) * .65;
      const scatter = .06 + r * .12;
      positions.set([Math.cos(angle) * r + (rand(i + 9) - .5) * scatter, (rand(i + 14) - .5) * (.12 + r * .12), Math.sin(angle) * r + (rand(i + 20) - .5) * scatter], i * 3);
      seeds[i] = rand(i + 5); sizes[i] = 1 + rand(i + 15) * 2;
    }
    const galaxyGeometry = new THREE.BufferGeometry();
    galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    galaxyGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    galaxyGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    const galaxyMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: sharedUniforms,
      vertexShader: `attribute float aSeed; attribute float aSize; uniform float uTime; uniform float uPixel; varying float vSeed; varying float vTwinkle;
        void main(){vSeed=aSeed;vec3 p=position;p.y+=sin(uTime*.5+aSeed*30.)*.025;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*13./-mv.z,1.,4.)*uPixel;vTwinkle=.45+.35*sin(uTime*.7+aSeed*80.);}`,
      fragmentShader: `uniform vec3 uPrimary; uniform vec3 uSecondary; varying float vSeed; varying float vTwinkle;
        void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float glow=pow(1.-d*2.,1.5);gl_FragColor=vec4(mix(uPrimary,uSecondary,vSeed),glow*vTwinkle);}`,
    });
    const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial);
    galaxy.rotation.set(.44, 0, -.22); galaxy.position.set(.1, -.9, -.5); city.add(galaxy);

    const globeMaterial = new THREE.LineBasicMaterial({ color: primary, transparent: true, opacity: .2 });
    const globeSource = new THREE.IcosahedronGeometry(1.93, 3);
    const globe = new THREE.LineSegments(new THREE.WireframeGeometry(globeSource), globeMaterial);
    globeSource.dispose();
    city.add(globe);
    const globeDots = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      const y = 1 - (i / 1499) * 2, r = Math.sqrt(1 - y * y), a = i * 2.399963;
      globeDots.set([Math.cos(a) * r * 1.94, y * 1.94, Math.sin(a) * r * 1.94], i * 3);
    }
    const globeGeometry = new THREE.BufferGeometry(); globeGeometry.setAttribute('position', new THREE.BufferAttribute(globeDots, 3));
    const globePointMaterial = new THREE.PointsMaterial({ color: primary, size: .018, transparent: true, opacity: .85, blending: THREE.AdditiveBlending });
    const globeParticles = new THREE.Points(globeGeometry, globePointMaterial); city.add(globeParticles);

    const rings: THREE.Line[] = [];
    for (let j = 0; j < 3; j++) {
      const points = [];
      for (let i = 0; i <= 240; i++) { const a = i / 240 * Math.PI * 2; points.push(new THREE.Vector3(Math.cos(a) * (2.25 + j * .19), 0, Math.sin(a) * (2.25 + j * .19))); }
      const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: j === 1 ? secondary : primary, transparent: true, opacity: j === 1 ? .28 : .19 }));
      ring.rotation.set(.2 + j * .43, j * .42, .18 + j * .3); city.add(ring); rings.push(ring);
    }
    const towerGeometry = new THREE.BoxGeometry(.055, 1, .055);
    const towerMaterial = new THREE.MeshBasicMaterial({ color: primary, wireframe: true, transparent: true, opacity: .5 });
    const towers = new THREE.InstancedMesh(towerGeometry, towerMaterial, 220);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 220; i++) {
      const x = (i % 15 - 7) * .145, z = (Math.floor(i / 15) - 7) * .145;
      const radius = Math.sqrt(x * x + z * z);
      const h = (.08 + Math.pow(rand(i + 90), 3) * 1.1) * Math.max(.2, 1 - radius / 2.3);
      matrix.compose(new THREE.Vector3(x, -.75 + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)); towers.setMatrixAt(i, matrix);
    }
    city.add(towers);
    const grid = new THREE.GridHelper(2.7, 20, primary, primary); grid.position.y = -.76;
    (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = .22; city.add(grid);
    const nodeGeometry = new THREE.SphereGeometry(.025, 8, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: primary });
    const nodes: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) { const node = new THREE.Mesh(nodeGeometry, nodeMaterial); city.add(node); nodes.push(node); }

    const starPositions = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) starPositions.set([(rand(i + 70) - .5) * 30, (rand(i + 140) - .5) * 18, -3 - rand(i + 200) * 12], i * 3);
    const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#c4d9f8', size: .017, transparent: true, opacity: .45 })); scene.add(stars);
    let width = 1, height = 1, frame = 0, disposed = false, inViewport = true, elapsed = 0, last = 0;
    const pointer = new THREE.Vector2(), motion = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => { width = host.clientWidth; height = host.clientHeight; renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.position.z = 5 - useUIStore.getState().progress * 2.5; camera.updateProjectionMatrix(); schedule(); };
    const render = (time: number) => {
      frame = 0; if (disposed || document.hidden || !inViewport) return;
      const reduced = useUIStore.getState().reduced;
      camera.position.z = 5 - (reduced ? 0 : useUIStore.getState().progress) * 2.5;
      const delta = last ? Math.min((time - last) / 1000, .06) : .016; last = time;
      if (!reduced) elapsed += delta;
      primary.lerp(paletteRef.current.primary, reduced ? 1 : .045); secondary.lerp(paletteRef.current.secondary, reduced ? 1 : .045);
      globeMaterial.color.copy(primary); globePointMaterial.color.copy(primary); towerMaterial.color.copy(primary); nodeMaterial.color.copy(primary);
      rings.forEach((ring, i) => (ring.material as THREE.LineBasicMaterial).color.copy(i === 1 ? secondary : primary));
      const scroll = Math.min(1, window.scrollY / Math.max(innerHeight * 2, 1));
      city.rotation.y = elapsed * .04 + (reduced ? 0 : pointer.x * .12);
      city.rotation.x += ((reduced ? 0 : pointer.y * .06) - city.rotation.x) * (reduced ? 1 : .03);
      city.position.y += ((reduced ? .1 : scroll > .2 ? -.5 : .1) - city.position.y) * (reduced ? 1 : .02);
      galaxy.rotation.y = elapsed * .024;
      globe.rotation.y = -elapsed * .025;
      rings[1].rotation.z = elapsed * .035;
      sharedUniforms.uTime.value = elapsed;
      nodes.forEach((node, i) => { const a = elapsed * .15 + i * Math.PI * .4; node.position.set(Math.cos(a) * 2.28, Math.sin(a * 2 + i) * .5, Math.sin(a) * 2.28); });
      universe.position.x += ((reduced ? 0 : pointer.x * .16) - universe.position.x) * (reduced ? 1 : .025);
      renderer.render(scene, camera);
      if (host.dataset.cameraZ !== camera.position.z.toFixed(2)) host.dataset.cameraZ = camera.position.z.toFixed(2);
      host.dataset.rendered = 'true';
      if (!reduced) frame = requestAnimationFrame(render);
    };
    function schedule() { if (!frame && !disposed && !document.hidden && inViewport) frame = requestAnimationFrame(render); }
    const pointerMove = (event: PointerEvent) => { pointer.set(event.clientX / innerWidth - .5, event.clientY / innerHeight - .5); };
    const visible = () => { cancelAnimationFrame(frame); frame = 0; last = 0; schedule(); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const viewportObserver = new IntersectionObserver(([entry]) => { inViewport = entry.isIntersecting; cancelAnimationFrame(frame); frame = 0; last = 0; schedule(); });
    viewportObserver.observe(host);
    window.addEventListener('pointermove', pointerMove, { passive: true });
    document.addEventListener('visibilitychange', visible); motion.addEventListener('change', visible);
    const unsubscribeUI = useUIStore.subscribe(schedule);
    redrawRef.current = schedule; schedule();
    return () => {
      disposed = true; unsubscribeUI(); cancelAnimationFrame(frame); observer.disconnect(); viewportObserver.disconnect(); window.removeEventListener('pointermove', pointerMove); document.removeEventListener('visibilitychange', visible); motion.removeEventListener('change', visible); redrawRef.current = null;
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material)); });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, []);
  return <div ref={hostRef} className="galaxy-canvas" aria-hidden="true"><div className="webgl-fallback-orbit" /></div>;
}
