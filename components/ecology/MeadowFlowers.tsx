'use client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Small volumetric flower heads, stalks and leaves, instanced in the meadow. */
export default function MeadowFlowers({ compact, paused }: { compact: boolean; paused: boolean }) {
  const heads = useRef<THREE.InstancedMesh>(null), stems = useRef<THREE.InstancedMesh>(null);
  const count = compact ? 55 : 140, time = useRef(0);
  const instance = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => {
    let seed = 12043;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    return Array.from({ length:count }, () => {
      const a = random() * Math.PI * 2, r = 1.15 + random() * 4.6;
      return { x:Math.cos(a)*r, z:Math.sin(a)*r*.78, height:.11+random()*.18, scale:.025+random()*.023, phase:random()*6.28, color:new THREE.Color().setHSL(.88+random()*.16,.30+random()*.3,.75+random()*.13) };
    });
  }, [count]);
  const geometry = useMemo(() => {
    const petals = Array.from({length:5}, (_, i) => new THREE.SphereGeometry(1,7,5).scale(.65,.18,.33).translate(.57,0,0).rotateY(i*Math.PI*2/5));
    const head = mergeGeometries(petals); petals.forEach(p=>p.dispose());
    const stalk = new THREE.CylinderGeometry(.002,.003,1,5).translate(0,.5,0);
    return { head, stalk };
  }, []);
  useEffect(() => () => { geometry.head.dispose(); geometry.stalk.dispose(); }, [geometry]);
  const update = useCallback((t:number) => {
    const o = instance;
    data.forEach((p,i) => {
      const sway = Math.sin(t*.85+p.phase)*.035;
      o.position.set(p.x+sway*p.height,p.height,p.z);o.rotation.set(.1*Math.sin(p.phase),p.phase,sway);o.scale.setScalar(p.scale);o.updateMatrix();heads.current?.setMatrixAt(i,o.matrix);
      o.position.set(p.x,.01,p.z);o.rotation.set(0,0,sway);o.scale.set(1,p.height,1);o.updateMatrix();stems.current?.setMatrixAt(i,o.matrix);
    });
    if (heads.current) heads.current.instanceMatrix.needsUpdate=true;
    if (stems.current) stems.current.instanceMatrix.needsUpdate=true;
  }, [data, instance]);
  useEffect(() => { data.forEach((p,i)=>heads.current?.setColorAt(i,p.color));if(heads.current?.instanceColor)heads.current.instanceColor.needsUpdate=true;update(time.current); }, [data, update]);
  useFrame((_,dt) => { if(paused)return;time.current+=Math.min(dt,.05);update(time.current); });
  return <group><instancedMesh ref={heads} args={[geometry.head,undefined,count]}><meshStandardMaterial roughness={.72}/></instancedMesh><instancedMesh ref={stems} args={[geometry.stalk,undefined,count]}><meshStandardMaterial color="#758d4a" roughness={.9}/></instancedMesh></group>;
}
