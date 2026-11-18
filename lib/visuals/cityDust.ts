/** Local visual metaphor only. Positions are sampled from the homepage's existing buildings. */
export type DustBlock = { id: number; p: [number, number, number]; s: [number, number, number]; type: number };
export const storySteps = [
  { key: 'dust', number: '01', title: '微尘', english: 'DUST', description: '散落的线索，尚未连成城市。' },
  { key: 'flow', number: '02', title: '汇流', english: 'FLOW', description: '让线索沿街区流动，逐渐找到彼此。' },
  { key: 'form', number: '03', title: '成形', english: 'FORM', description: '同一批粒子，勾勒出建筑的空间轮廓。' },
  { key: 'life', number: '04', title: '城市', english: 'LIFE', description: '街道、绿意与灯光，让空间有了生活。' },
] as const;
export function storyIndex(progress: number) { return progress < .23 ? 0 : progress < .49 ? 1 : progress < .79 ? 2 : 3; }
export function storyTarget(manual: boolean, progress: number, reduced: boolean, scroll: number) {
  return Math.max(0, Math.min(1, manual ? progress : reduced ? 1 : scroll));
}
export function smooth(from: number, to: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}
export function createDustData(blocks: readonly DustBlock[]) {
  const vertices: number[][] = [];
  function box(x: number, bottom: number, z: number, w: number, h: number, d: number) {
    // Include the last edge exactly; each cloud ends on the actual body/roof, not a generic skyline.
    const nx = Math.ceil(w / 1.8), ny = Math.ceil(h / 1.8), nz = Math.ceil(d / 1.8);
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) for (const side of [-1, 1]) vertices.push([x - w / 2 + i * w / nx, bottom + j * h / ny, z + side * d / 2]);
      for (let k = 1; k < nz; k++) for (const side of [-1, 1]) vertices.push([x + side * w / 2, bottom + j * h / ny, z - d / 2 + k * d / nz]);
    }
  }
  for (const b of blocks) {
    const [x, , z] = b.p, [w, h, d] = b.s;
    box(x, b.type === 2 ? h * .14 : 0, z, w * (b.type === 2 ? 1.25 : 1), h * (b.type === 2 ? .72 : 1), d * (b.type === 2 ? .72 : 1));
    box(x, h, z, w * .78, .7, d * .78);
  }
  for (let row = 0; row < 7; row++) {
    const roadZ = -11.5 - row * 13;
    for (let col = 0; col <= 40; col++) {
      const x = -50 + col * 2.5;
      for (const lane of [-2.4, -1.2, 0, 1.2, 2.4]) vertices.push([x, .045, roadZ + lane]);
      if (col % 2 === 0) for (const side of [-1, 1]) vertices.push([x, .035, roadZ + side * 4.9]);
    }
  }
  for (let row = 0; row <= 36; row++) {
    const z = -88 + row * 2.3;
    for (const lane of [-1.8, -.6, .6, 1.8]) vertices.push([lane, .045, z]);
  }
  let state = 12062026;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  // Shuffle once so a smaller draw range retains all 25 buildings and the full depth of the cloud.
  for (let i = vertices.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [vertices[i], vertices[j]] = [vertices[j], vertices[i]]; }
  const count = vertices.length, target = new Float32Array(count * 3), dust = new Float32Array(count * 3), flow = new Float32Array(count * 3), seeds = new Float32Array(count);
  vertices.forEach((v, i) => {
    const seed = random(), x = random() * 134 - 67, lane = i % 5;
    target.set(v, i * 3);
    dust.set([x, random() * 59 - 6, random() * 109 - 76], i * 3);
    flow.set([x, 12 + Math.sin(x * .035 + lane * .5) * 9 + lane * 2.3 + random() * 1.8, -56 + lane * 17 + Math.cos(x * .04) * 5 + random() * 1.4], i * 3);
    seeds[i] = seed;
  });
  return { count, target, dust, flow, seeds };
}
export const dustVertex = `
  attribute vec3 aDust;
  attribute vec3 aFlow;
  attribute float aSeed;
  uniform float uProgress;
  uniform float uTime;
  uniform float uDpr;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vWarm;
  void main() {
    float stream = smoothstep(.06, .36, uProgress);
    float gather = smoothstep(.32, .69, uProgress);
    vec3 drift = vec3(sin(uTime * .18 + aSeed * 19.), cos(uTime * .16 + aSeed * 31.), sin(uTime * .12 + aSeed * 12.)) * 1.3;
    vec3 source = aDust + drift;
    vec3 path = aFlow + vec3(sin(uTime * .24 + aSeed * 21.) * 2., 0., 0.);
    vec3 point = mix(mix(source, path, stream), position, gather);
    vec4 viewPosition = modelViewMatrix * vec4(point, 1.);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp((1.5 + aSeed * 1.4) * uDpr * 24. / max(1., -viewPosition.z), 1., 4.8);
    float density = mix(.50, 1., smoothstep(.04, .55, uProgress));
    vAlpha = (1. - smoothstep(density - .06, density, aSeed)) * (.42 + aSeed * .50) * (1. - smoothstep(.73, .97, uProgress)) * uOpacity;
    vWarm = step(.87, aSeed);
  }
`;
export const dustFragment = `
  varying float vAlpha;
  varying float vWarm;
  void main() {
    float radius = length(gl_PointCoord - .5) * 2.;
    if (radius > 1.) discard;
    vec3 color = mix(vec3(.63, .89, .74), vec3(.94, .81, .58), vWarm);
    float alpha = (1. - smoothstep(.16, 1., radius)) * vAlpha;
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
