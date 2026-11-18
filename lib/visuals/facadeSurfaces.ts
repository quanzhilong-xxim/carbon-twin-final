import * as THREE from 'three';

/** Subtle pane-to-pane coating variation. Mullions remain actual geometry;
 * this texture supplies surface response, never a photograph of a building. */
export function makeFacadeSurfaces() {
  const width=128,height=256,color=new Uint8Array(width*height*4),rough=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const col=Math.floor(x/16),row=Math.floor(y/32),seed=(col*17+row*29)%13;
    const variation=.92+seed/180,reflection=.96+Math.sin(x/width*Math.PI)*.04;
    const offset=(y*width+x)*4,value=variation*reflection;
    color.set([Math.round(239*value),Math.round(247*value),Math.round(248*value),255],offset);
    const finish=175+seed*5;rough.set([finish,finish,finish,255],offset);
  }
  const map=new THREE.DataTexture(color,width,height),roughnessMap=new THREE.DataTexture(rough,width,height);
  map.colorSpace=THREE.SRGBColorSpace;
  for(const texture of [map,roughnessMap]) {
    texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps=true;texture.userData.carbonTwinOwned=true;texture.needsUpdate=true;
  }
  return {map,roughnessMap,dispose:()=>{map.dispose();roughnessMap.dispose();}};
}
