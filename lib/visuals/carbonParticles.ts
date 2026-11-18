/** Deterministic spatial samples. Neither silhouette nor particle count is a carbon unit. */
export function carbonParticleSamples(count: number) {
  const tree = new Float32Array(count * 3), city = new Float32Array(count * 3), seeds = new Float32Array(count);
  let seed = 12307;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const buildings = [
    [-1.02, -.3, .40, 1.1, .46], [-.48, -.55, .4, 1.68, .45], [.12, -.6, .45, 2.1, .48], [.76, -.4, .5, 1.48, .42],
    [-.78, .42, .55, .65, .5], [-.08, .3, .55, 1.05, .48], [.65, .38, .56, .79, .5], [1.12, .02, .3, .47, .4],
  ];
  for (let i = 0; i < count; i++) {
    const n = i * 3, angle = random() * Math.PI * 2, r = Math.sqrt(random()), a = random();
    seeds[i] = random();
    if (a < .14) {
      // Slightly winding trunk, sampled as a solid cylinder rather than a flat outline.
      const y = random() * 1.4;
      tree.set([Math.sin(y * 1.7) * .10 + Math.cos(angle) * r * (.12 - y * .045), y,
        Math.sin(angle) * r * (.13 - y * .04)], n);
    } else if (a < .27) {
      const branch = Math.floor(random() * 7), t = random(), az = branch * 2.4;
      tree.set([Math.cos(az) * t * .85 + (random() - .5) * .06, .65 + t * .93 + branch * .035,
        Math.sin(az) * t * .65 + (random() - .5) * .06], n);
    } else if (a < .89) {
      // Individual overlapping crowns leave readable air and branch spaces.
      const crown = Math.floor(random() * 9), az = crown * 2.4, rad = crown === 0 ? 0 : .64;
      const v = random() * 2 - 1, rr = Math.sqrt(1 - v * v) * (.68 + random() * .2);
      tree.set([Math.cos(az) * rad + Math.cos(angle) * rr * .69,
        1.61 + Math.sin(crown * 1.7) * .23 + v * .49,
        Math.sin(az) * rad * .78 + Math.sin(angle) * rr * .65], n);
    } else {
      tree.set([Math.cos(angle) * r * 1.47, -.08 + random() * .06, Math.sin(angle) * r * 1.15], n);
    }
    if (a > .89) {
      city.set([Math.cos(angle) * r * 1.5, -.08 + random() * .06, Math.sin(angle) * r * 1.18], n);
    } else {
      const [x, z, w, h, d] = buildings[Math.floor(random() * buildings.length)], face = Math.floor(random() * 5);
      let xx = (random() - .5) * w, yy = random() * h, zz = (random() - .5) * d;
      if (face === 0) xx = -w / 2; else if (face === 1) xx = w / 2;
      else if (face === 2) zz = -d / 2; else if (face === 3) zz = d / 2; else yy = h;
      // Setbacks and facade bays give the particle buildings individual silhouettes.
      const inset = yy > h * .8 ? .78 : 1;
      city.set([x + xx * inset, yy, z + zz * inset], n);
    }
  }
  return { tree, city, seeds };
}

export function carbonParticleDensity(annual: number) {
  return annual <= 0 ? 0 : .22 + .78 * Math.min(1, Math.sqrt(annual / 10000));
}
