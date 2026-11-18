'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const rows = 4;
const columns = 4;
const grassPerPit = 36;
const flowersPerPit = 4;

function makeBladeGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0,
    -.055, .38, 0,
    -.018, .72, .045,
    .045, .36, .018,
    0, .45, .025,
  ], 3));
  geometry.setIndex([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]);
  geometry.computeVertexNormals();
  return geometry;
}

function makePetalGeometry() {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let petal = 0; petal < 6; petal++) {
    const angle = petal * Math.PI / 3;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const px = -dz * .074, pz = dx * .074;
    const base = positions.length / 3;
    positions.push(
      dx * .06, 0, dz * .06,
      dx * .38 + px * 1.6, .012, dz * .38 + pz * 1.6,
      dx * .62, .006, dz * .62,
      dx * .38 - px * 1.6, .012, dz * .38 - pz * 1.6,
    );
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeWindMaterial() {
  return new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .88, side: THREE.DoubleSide });
}

export default function UrbanGroundcover() {
  const grass = useRef<THREE.InstancedMesh>(null);
  const stems = useRef<THREE.InstancedMesh>(null);
  const petals = useRef<THREE.InstancedMesh>(null);
  const centers = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const windBases=useRef<THREE.Matrix4[]>([]),windMatrix=useMemo(()=>new THREE.Matrix4(),[]),windRotation=useMemo(()=>new THREE.Matrix4(),[]);
  const blade = useMemo(makeBladeGeometry, []);
  const bloom = useMemo(makePetalGeometry, []);
  const grassMaterial = useMemo(makeWindMaterial, []);
  const stemGeometry = useMemo(() => new THREE.CylinderGeometry(.015, .035, .9, 5), []);
  const stemMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .94 }), []);
  const petalMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .82, side: THREE.DoubleSide }), []);
  const centerGeometry = useMemo(() => new THREE.SphereGeometry(.075, 8, 6), []);
  const centerMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e7bd62', roughness: .78 }), []);
  const grassCount = rows * columns * grassPerPit;
  const flowerCount = rows * columns * flowersPerPit;

  useEffect(() => {
    if (!grass.current || !stems.current || !petals.current || !centers.current) return;
    let seed = 0x5eed2026;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const grassColors = ['#416f45', '#56854c', '#719651', '#91a75d'];
    const flowerColors = ['#f0ead6', '#d9b3c3', '#e7c96f'];
    let bladeIndex = 0;
    let flowerIndex = 0;

    for (let row = 0; row < rows; row++) {
      const roadZ = -11.5 - row * 13;
      for (let column = 0; column < columns; column++) {
        const centerX = -45 + column * 30;
        const centerZ = roadZ + 3.75;
        for (let i = 0; i < grassPerPit; i++) {
          dummy.position.set(centerX + (random() - .5) * 4.6, .035, centerZ + (random() - .5) * 3.4);
          dummy.rotation.set(0, random() * Math.PI * 2, 0);
          const height = .65 + random() * .7;
          const width = .72 + random() * .6;
          dummy.scale.set(width, height, width);
          dummy.updateMatrix();
          grass.current.setMatrixAt(bladeIndex, dummy.matrix);
          windBases.current[bladeIndex]=dummy.matrix.clone();
          grass.current.setColorAt(bladeIndex, new THREE.Color(grassColors[Math.floor(random() * grassColors.length)]));
          bladeIndex++;
        }

        for (let i = 0; i < flowersPerPit; i++) {
          const x = centerX + (random() - .5) * 3.7;
          const z = centerZ + (random() - .5) * 2.7;
          const scale = .82 + random() * .35;
          const rotation = random() * Math.PI * 2;
          dummy.position.set(x, .32 * scale, z);
          dummy.rotation.set(0, rotation, 0);
          dummy.scale.set(.72 * scale, .64 * scale, .72 * scale);
          dummy.updateMatrix();
          stems.current.setMatrixAt(flowerIndex, dummy.matrix);
          stems.current.setColorAt(flowerIndex, new THREE.Color(['#557c49', '#6c8d4c'][Math.floor(random() * 2)]));
          dummy.position.y = .61 * scale;
          dummy.scale.setScalar(.32 * scale);
          dummy.updateMatrix();
          petals.current.setMatrixAt(flowerIndex, dummy.matrix);
          petals.current.setColorAt(flowerIndex, new THREE.Color(flowerColors[Math.floor(random() * flowerColors.length)]));
          dummy.position.y += .006;
          dummy.scale.setScalar(.28 * scale);
          dummy.updateMatrix();
          centers.current.setMatrixAt(flowerIndex, dummy.matrix);
          flowerIndex++;
        }
      }
    }

    for (const mesh of [grass.current, stems.current, petals.current, centers.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [dummy]);

  useFrame(({ clock }) => {
    if(!grass.current)return;
    windBases.current.forEach((base,index)=>{
      const phase=clock.elapsedTime*1.15+base.elements[12]*.12+base.elements[14]*.17;
      windRotation.makeRotationZ(Math.sin(phase)*.07);
      windMatrix.copy(base).multiply(windRotation);grass.current!.setMatrixAt(index,windMatrix);
    });
    grass.current.instanceMatrix.needsUpdate=true;
  });

  return <group>
    <instancedMesh ref={grass} args={[blade, grassMaterial, grassCount]} castShadow receiveShadow />
    <instancedMesh ref={stems} args={[stemGeometry, stemMaterial, flowerCount]} castShadow />
    <instancedMesh ref={petals} args={[bloom, petalMaterial, flowerCount]} castShadow />
    <instancedMesh ref={centers} args={[centerGeometry, centerMaterial, flowerCount]} castShadow />
  </group>;
}
