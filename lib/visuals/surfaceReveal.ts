import * as THREE from 'three';

/** Animate the standard opacity uniform; retain the model's own wind shader. */
export function installSurfaceReveal(material: THREE.Material, reveal: { value: number }) {
  if (!(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial)) return () => {};
  const previous = material.onBeforeRender;
  const opacity = material.opacity, transparent = material.transparent, forceSinglePass = material.forceSinglePass;
  // Configure the variant once, instead of compiling custom discard code for
  // every mapped PBR surface. Multiple reveals compose for roads inside a site.
  material.transparent = true;
  material.forceSinglePass = true;
  material.onBeforeRender = function (...args) {
    material.opacity = opacity;
    previous.apply(this, args);
    material.opacity *= reveal.value;
  };
  material.needsUpdate = true;
  return () => { material.onBeforeRender = previous; material.opacity = opacity; material.transparent = transparent; material.forceSinglePass = forceSinglePass; material.needsUpdate = true; };
}
