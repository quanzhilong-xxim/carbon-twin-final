'use client';

/** Small public places sit clear of the retained building plots and carriageways. */
export default function ExplorePlaces({ theme }: { theme: number }) {
  return <group>
    <group position={[-18, .02, -1]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[33, 15]} /><meshStandardMaterial color={theme === 3 ? '#47684a' : '#9b9b83'} roughness={.91} /></mesh>
      {theme === 0 && <group>
        <mesh position={[0, 2.8, 0]}><cylinderGeometry args={[6.5, 7, .36, 8]} /><meshStandardMaterial color="#beaa7a" metalness={.3} roughness={.55} /></mesh>
        {[-4, 4].flatMap(x => [-3, 3].map(z => <mesh key={`${x}-${z}`} position={[x, 1.35, z]}><cylinderGeometry args={[.15, .2, 2.7, 8]} /><meshStandardMaterial color="#d9d2b4" roughness={.7} /></mesh>))}
        <mesh position={[0, .65, 0]}><torusKnotGeometry args={[1, .19, 56, 8]} /><meshStandardMaterial color="#aa8a4d" metalness={.7} roughness={.3} /></mesh>
      </group>}
      {theme === 1 && <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .035, 0]}><planeGeometry args={[28, 10]} /><meshStandardMaterial color="#3b7b7d" metalness={.45} roughness={.19} /></mesh>
        {[-4.4, 4.4].map(z => <mesh key={z} position={[0, .09, z]}><boxGeometry args={[28, .17, 1.4]} /><meshStandardMaterial color="#a18d64" roughness={.86} /></mesh>)}
        <mesh position={[0, .3, 0]}><boxGeometry args={[2, .3, 11]} /><meshStandardMaterial color="#baaa82" roughness={.7} /></mesh>
      </group>}
      {theme === 2 && <group>
        <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.5, 1, 1]}><torusGeometry args={[4.8, .65, 10, 40]} /><meshStandardMaterial color="#d1cbaa" metalness={.35} roughness={.45} /></mesh>
        {[-5, 5].map(x => <mesh key={x} position={[x, 1.4, 0]}><cylinderGeometry args={[.2, .2, 2.8, 8]} /><meshStandardMaterial color="#8aa7a0" metalness={.5} roughness={.3} /></mesh>)}
      </group>}
      {theme === 3 && Array.from({ length: 4 }, (_, i) => <mesh key={i} position={[-10 + i * 7, .28, 0]}><boxGeometry args={[4.2, .5, 9]} /><meshStandardMaterial color={i % 2 ? '#5e8052' : '#71875b'} roughness={.97} /></mesh>)}
      {theme === 4 && <group>
        <mesh position={[0, 3.1, 0]}><boxGeometry args={[28, .24, 7]} /><meshStandardMaterial color="#e0d8b8" metalness={.32} roughness={.45} /></mesh>
        {[-11, -4, 4, 11].map(x => <mesh key={x} position={[x, 1.5, 0]}><cylinderGeometry args={[.11, .16, 3, 8]} /><meshStandardMaterial color="#71827a" metalness={.55} roughness={.36} /></mesh>)}
        <mesh position={[0, 1.4, -2.8]}><boxGeometry args={[23, 2.4, .08]} /><meshStandardMaterial color="#76a19b" transparent opacity={.45} metalness={.2} roughness={.2} /></mesh>
      </group>}
      {theme === 5 && Array.from({ length: 6 }, (_, i) => <group key={i} position={[-10 + (i % 3) * 10, .8, -4 + Math.floor(i / 3) * 7]}>
        <mesh rotation={[-.22, 0, 0]}><boxGeometry args={[6, .12, 3.6]} /><meshStandardMaterial color="#365d6d" metalness={.55} roughness={.3} /></mesh><mesh position={[0, -.45, 0]}><cylinderGeometry args={[.1, .15, .9, 6]} /><meshStandardMaterial color="#85958a" roughness={.55} /></mesh>
      </group>)}
    </group>
  </group>;
}
