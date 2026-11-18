import * as THREE from 'three';

export type CompanionKind = 'cat' | 'cow' | 'sheep';

/** Blender adds numeric suffixes and GLTFLoader removes periods and turns
 * spaces into underscores. Resolve the loaded names as well as source names. */
export function companionMotion(model: THREE.Object3D, kind: CompanionKind) {
  const nameOf = (name: string) => name.replace(/(?:\.\d+|_?\d+)$/, '').replace(/_/g, ' ');
  const part = (name: string) => {
    let found: THREE.Object3D | undefined;
    model.traverse(object => {
      if (!found && nameOf(object.name) === name) found = object;
    });
    return found;
  };
  const head = part('Head'), tail = part('Tail'), breath = part('Breath');
  const ears = [part('EarLeft'), part('EarRight')];
  const paws = [part('PawLeft'), part('PawRight')], pawRest = paws.map(paw => paw?.rotation.clone());
  const eyes: { object: THREE.Object3D; scale: number; blink?: number }[] = [];
  model.traverse(object => {
    if (/^(?:eye globe|EyeLeft|EyeRight|dark eye|eye glint|(?:vertical )?pupil|corneal(?: catchlight)?)$/i.test(nameOf(object.name))) eyes.push({ object, scale: object.scale.y, blink: object instanceof THREE.Mesh ? object.morphTargetDictionary?.Blink : undefined });
  });
  const headRest = head?.rotation.clone(), tailRest = tail?.rotation.clone();
  const breathRest = breath?.scale.y ?? 1, earRest = ears.map(ear => ear?.rotation.clone());
  let elapsed = 0, responseStart = -Infinity, lastReaction = 0, energy = .7;
  return {
    parts: { head, tail, breath, ears, eyes, paws },
    get elapsed() { return elapsed; },
    update(dt: number, vitality: number, paused: boolean, reaction = 0) {
      if (paused || !Number.isFinite(dt) || dt <= 0) return;
      const step = Math.min(dt, .05);
      elapsed += step;
      energy = THREE.MathUtils.damp(energy, THREE.MathUtils.clamp(vitality, 0, 1), 3, step);
      if (reaction !== lastReaction) { lastReaction = reaction; responseStart = elapsed; }
      const age = elapsed - responseStart, response = age < 1.8 ? Math.sin(age / 1.8 * Math.PI) : 0;
      const tempo = .48 + energy * .75;
      const blink = Math.max(Math.pow(Math.max(0, Math.cos(elapsed * .7 + .8)), 70), response * .85);
      if (head && headRest) {
        head.rotation.set(headRest.x + Math.sin(elapsed * .7) * .025 + (1 - energy) * .12 - response * .14,
          headRest.y + Math.sin(elapsed * .42) * .07 + response * .08,
          headRest.z + response * .09);
      }
      if (tail && tailRest) tail.rotation.y = tailRest.y + Math.sin(elapsed * tempo * (kind === 'cat' ? 1.6 : .8)) * (.045 + energy * .18 + response * .12);
      if (breath) breath.scale.y = breathRest * (1 + Math.sin(elapsed * 1.8) * .012);
      ears.forEach((ear, i) => {
        const rest = earRest[i];
        if (ear && rest) ear.rotation.z = rest.z + (i ? -1 : 1) * (1 - energy) * .13 + Math.sin(elapsed * .9 + i * 2) * .045 - response * .05;
      });
      paws.forEach((paw, i) => {
        const rest = pawRest[i];
        if (paw && rest) paw.rotation.z = rest.z + (i ? -1 : 1) * (response * .20 + Math.max(0, energy - .65) * Math.sin(elapsed * .65 + i) * .055);
      });
      eyes.forEach(({ object, scale, blink: channel }) => {
        if (channel !== undefined && object instanceof THREE.Mesh && object.morphTargetInfluences) object.morphTargetInfluences[channel] = Math.max(blink, (1 - energy) * .12);
        else object.scale.y = scale * (1 - blink * .94) * (.75 + energy * .25);
      });
    },
  };
}
