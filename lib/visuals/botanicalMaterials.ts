import * as THREE from 'three';

/** Original procedural botanical maps; no third-party image or network request. */
export function botanicalMaps() {
  const width = 96, height = 192;
  const leafColor = new Uint8Array(width * height * 4), leafNormal = new Uint8Array(width * height * 4);
  const barkColor = new Uint8Array(width * height * 4), barkNormal = new Uint8Array(width * height * 4);
  const barkRoughness = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / (width - 1), v = y / (height - 1), index = (y * width + x) * 4;
    const center = Math.abs(u - .5), veinLine = Math.abs(Math.sin((v - center * .75) * Math.PI * 13));
    const vein = Math.max(Math.exp(-center * 130), Math.exp(-veinLine * 32) * .48);
    const grain = Math.sin(x * 12.31 + y * 7.21) * Math.sin(x * 2.7 - y * 1.4);
    const light = .72 + .2 * Math.sin(v * Math.PI) + vein * .24 + grain * .035;
    leafColor.set([Math.min(255, 123 * light), Math.min(255, 159 * light), 68 * light, 255], index);
    leafNormal.set([128 + Math.sin((u - .5) * Math.PI) * 28, 128 + vein * 18, 250, 255], index);
    const ridge = Math.sin(x * .43 + Math.sin(y * .045) * 1.5) * .5 + .5;
    const crack = Math.pow(ridge, 8), grainBark = Math.sin(x * 7.3 + y * 3.7) * 5;
    const b = 88 + ridge * 32 - crack * 42 + grainBark;
    barkColor.set([b, b * .79, b * .57, 255], index);
    barkNormal.set([128 + Math.cos(x * .43 + Math.sin(y * .045) * 1.5) * 48, 128 + Math.cos(y * .045) * 5, 242, 255], index);
    barkRoughness.set([185 + crack * 50, 185 + crack * 50, 185 + crack * 50, 255], index);
  }
  const map = (data: Uint8Array, color = false) => {
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true; texture.needsUpdate = true;
    return texture;
  };
  return { leaf: map(leafColor, true), leafNormal: map(leafNormal), bark: map(barkColor, true), barkNormal: map(barkNormal), barkRoughness: map(barkRoughness) };
}

/** A curved blade with a midrib; its silhouette is actual geometry. */
export function botanicalLeafGeometry() {
  const position: number[] = [], uv: number[] = [], indices: number[] = [];
  const rows = 7;
  for (let row = 0; row <= rows; row++) {
    const v = row / rows, width = Math.pow(Math.sin(v * Math.PI), .8) * .35 + .002;
    for (let side = -1; side <= 1; side++) {
      position.push(side * width, v, Math.sin(v * Math.PI) * .12 - Math.abs(side) * .055);
      uv.push((side + 1) / 2, v);
    }
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < 2; col++) {
    const a = row * 3 + col, b = a + 3;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
