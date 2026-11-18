'use client';
import { useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const fabricStudies = {
  cotton: { name: '棉', color: '#d5c5a6', roughness: .93, note: '棉纤维形成纱线，再由经纬交织成布；表面柔和、较少镜面反射。' },
  polyester: { name: '聚酯', color: '#b6cac4', roughness: .44, note: '连续长丝可以更平滑；真实光泽仍取决于截面、纺丝与整理工艺。' },
  wool: { name: '羊毛', color: '#c7ac8b', roughness: .98, note: '卷曲纤维形成较蓬松的纱线；这里放大卷曲特征，不代表实际纤维尺寸。' },
  denim: { name: '牛仔斜纹', color: '#52697a', roughness: .86, note: '经纬浮长形成斜纹方向；牛仔是一种织物结构，不能仅凭蓝色推定纤维成分。' },
};
export type FabricStudy = keyof typeof fabricStudies;

/** True interlaced yarn geometry, merged to three draw calls. Editorial model,
 * not a micrograph, measured fibre diameter or physical garment disassembly. */
export default function FabricStructure({ kind }: { kind: FabricStudy }) {
  const study = fabricStudies[kind];
  const geometries = useMemo(() => {
    const pieces: THREE.BufferGeometry[][] = [[], [], []];
    const tube = (points: THREE.Vector3[], radius: number, target: number) => pieces[target].push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, radius, 5, false));
    for (let axis = 0; axis < 2; axis++) for (let row = 0; row < 15; row++) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 84; i++) {
        const t = i / 84, fixed = (row - 7) * .068, moving = (t - .5) * .98;
        const twill = kind === 'denim' ? row * Math.PI * .66 : row * Math.PI;
        const over = .019 * Math.cos(t * Math.PI * 28 + twill) * (axis ? -1 : 1);
        pts.push(new THREE.Vector3(axis ? fixed : moving, axis ? moving : fixed, over));
      }
      tube(pts, kind === 'polyester' ? .014 : .020, 0);
    }
    for (let strand = 0; strand < 7; strand++) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 70; i++) {
        const t = i / 70, a = t * Math.PI * 8 + strand / 7 * Math.PI * 2;
        pts.push(new THREE.Vector3(.032 * Math.cos(a), (t - .5), .032 * Math.sin(a)));
      }
      tube(pts, .011, 1);
    }
    for (let strand = 0; strand < 8; strand++) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60, wave = kind === 'wool' ? .018 : kind === 'polyester' ? .001 : .006;
        pts.push(new THREE.Vector3((strand - 3.5) * .026 + Math.sin(t * 28 + strand) * wave, (t - .5), Math.cos(t * 23 + strand) * wave));
      }
      tube(pts, .004, 2);
    }
    return pieces.map(group => { const combined = mergeGeometries(group); group.forEach(g => g.dispose()); return combined; });
  }, [kind]);
  useEffect(() => () => geometries.forEach(g => g?.dispose()), [geometries]);
  return <group position={[.65, .8, .1]} rotation={[0, -.25, 0]}>{geometries.map((geometry, i) => geometry && <group key={i} position={[i * .68, 0, i * .2]}>
    <mesh geometry={geometry}><meshPhysicalMaterial color={study.color} roughness={study.roughness} sheen={kind === 'polyester' ? .35 : .8} sheenRoughness={.7} /></mesh>
    <Html position={[0, -.68, 0]} center zIndexRange={[10, 0]}><span className="layer-label">{['经纬织物', '加捻纱线', '纤维束'][i]}</span></Html>
  </group>)}</group>;
}
