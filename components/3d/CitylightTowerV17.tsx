'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStableRenderer } from '@/lib/citylight/stable-renderer';

const modelUrl = '/models/citylight/v17/massing-r1/tower01-massing.glb';
const views = {
  perspective: { name: '正面 45°', position: [70, 42, 95] },
  front: { name: '正面', position: [0, 27, 115] },
  side: { name: '侧面', position: [115, 27, 0] },
} as const;
type View = keyof typeof views;

function Model() {
  const { scene } = useGLTF(modelUrl);
  const { gl } = useThree();
  useEffect(() => {
    gl.domElement.dataset.modelUrl = modelUrl;
    gl.domElement.dataset.modelLoaded = 'true';
    return () => { delete gl.domElement.dataset.modelLoaded; };
  }, [gl]);
  return <primitive object={scene} dispose={null} />;
}

function Camera({ view }: { view: View }) {
  const { camera, gl } = useThree();
  const ref = useRef<OrbitControls>();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.set(0, 23, 0);
    controls.enableDamping = true;
    controls.minDistance = 25;
    controls.maxDistance = 250;
    controls.maxPolarAngle = Math.PI / 2;
    controls.update();
    ref.current = controls;
    return () => { controls.dispose(); ref.current = undefined; };
  }, [camera, gl]);
  useEffect(() => {
    const position = views[view].position;
    camera.position.set(position[0], position[1], position[2]);
    ref.current?.target.set(0, 23, 0);
    ref.current?.update();
    gl.domElement.dataset.view = view;
  }, [camera, gl, view]);
  useFrame(() => ref.current?.update());
  return null;
}

export default function TowerStudyV17() {
  const [view, setView] = useState<View>('perspective');
  const [lost, setLost] = useState(false);
  return <>
    <header className="citylight-heading"><div><span className="citylight-kicker">TOWER_01 / V17 / 未通过</span>
      <h1>错层建筑体量研究</h1><p>基于参考图估算的真实三维样件。当前为不透明体块：玻璃、室内、绿化和三时段尚未完成，不能用于美术验收。</p></div>
      <div><Link href="/citylight/tower-study">保留的 V16 研究 ↗</Link><br /><Link href="/citylight/review">原证据中心 ↗</Link></div>
    </header>
    <div className="citylight-workbench"><section className="citylight-viewport" aria-label="第一栋建筑体量样件">
      <div className="tower-study-canvas">{lost ? <div className="citylight-fallback" role="status"><h2>三维画面中断</h2><p>请刷新页面重新加载样件。</p></div> :
        <Canvas camera={{ position: views.perspective.position, fov: 40, near: .1, far: 500 }} dpr={1} gl={canvas => createStableRenderer(canvas, 1)}
          onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setLost(true); }, { once: true }); }}>
          <color attach="background" args={['#b7c4c6']} /><hemisphereLight args={['#e5eff3', '#788079', 1.3]} />
          <directionalLight position={[55, 90, 60]} intensity={2.1} />
          <Suspense fallback={null}><Model /></Suspense><Camera view={view} />
        </Canvas>}</div>
    </section><aside className="citylight-controls"><div><span className="citylight-kicker">NEEDS_REWORK · 第二栋锁定</span><h2>先核对结构比例</h2>
      <p>左侧核心墙、逐层退台与右上悬挑为初步估算。拖动可环绕模型；细节和尺度仍需核对。</p></div>
      <fieldset><legend>观察角度</legend><div className="citylight-buttons">{(Object.keys(views) as View[]).map(key =>
        <button key={key} aria-pressed={view === key} onClick={() => setView(key)}>{views[key].name}</button>)}</div></fieldset>
      <p>本画面不是参考图、最终玻璃材质或三时段效果，也不代表 98 分通过。</p></aside></div>
  </>;
}
