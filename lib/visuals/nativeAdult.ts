import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Identity } from '@/lib/store';
import type { AvatarAction } from '@/components/3d/IdentityAvatar';
import { characterPerformance, type CharacterPose } from './characterPerformance';

/** The exported skeleton owns deformation. Cache geometry and materials stay
 * immutable; each viewer gets independent bones, bind matrices and morphs. */
export function nativeAdultCharacter(source: THREE.Group) {
  const model = clone(source) as THREE.Group, elbows: Partial<Record<'right' | 'left', THREE.Bone>> = {};
  for (const side of ['right', 'left'] as const) elbows[side] = model.getObjectByName(`CT_Forearm_${side === 'right' ? 'R' : 'L'}`) as THREE.Bone;
  const skeletons = new Set<THREE.Skeleton>();
  const chair = new THREE.Group(); chair.name = 'CT_ChairContact'; model.add(chair);
  const chairParts: THREE.Mesh[] = [];
  model.traverse(o => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = !/head|eyes|eyebrow|eyelash|hair|groom|fringe/i.test(o.name);
      o.frustumCulled = false;
    }
    if (o instanceof THREE.SkinnedMesh) skeletons.add(o.skeleton);
    else if (o instanceof THREE.Mesh && o.name.startsWith('V108d_') && /leather|backrest|upholstered|chair/i.test(o.name)) chairParts.push(o);
  });
  model.updateMatrixWorld(true); chairParts.forEach(part => chair.attach(part));
  model.userData.nativeHumanoid = true;
  return { model, elbows, elbow: elbows.right, dispose: () => skeletons.forEach(s => s.dispose()) };
}

function reach(model: THREE.Group, upper: THREE.Object3D, lower: THREE.Object3D, end: THREE.Object3D, point: THREE.Vector3, pole: THREE.Vector3) {
  upper.updateWorldMatrix(true, true);
  const target = model.localToWorld(point.clone()), bend = model.localToWorld(pole.clone());
  const a = upper.getWorldPosition(new THREE.Vector3()), b = lower.getWorldPosition(new THREE.Vector3()), c = end.getWorldPosition(new THREE.Vector3());
  const la = a.distanceTo(b), lb = b.distanceTo(c);
  const direction = target.clone().sub(a).normalize();
  const distance = THREE.MathUtils.clamp(a.distanceTo(target), Math.abs(la - lb) + .0001, la + lb - .0001);
  const along = (la * la + distance * distance - lb * lb) / (2 * distance), height = Math.sqrt(Math.max(0, la * la - along * along));
  const perpendicular = bend.sub(a); perpendicular.addScaledVector(direction, -perpendicular.dot(direction)).normalize();
  const joint = a.clone().addScaledVector(direction, along).addScaledVector(perpendicular, height);
  const set = (bone: THREE.Object3D, q: THREE.Quaternion) => {
    bone.quaternion.copy((bone.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion()).invert().multiply(q));
    bone.updateWorldMatrix(true, true);
  };
  set(upper, new THREE.Quaternion().setFromUnitVectors(b.sub(a).normalize(), joint.clone().sub(a).normalize()).multiply(upper.getWorldQuaternion(new THREE.Quaternion())));
  const e = lower.getWorldPosition(new THREE.Vector3()), w = end.getWorldPosition(new THREE.Vector3());
  set(lower, new THREE.Quaternion().setFromUnitVectors(w.sub(e).normalize(), target.sub(e).normalize()).multiply(lower.getWorldQuaternion(new THREE.Quaternion())));
}

/** Orient the donor's real palm over the armrest. An IK wrist location alone
 * leaves the original standing hand hanging vertically beside the chair. */
function restPalm(model: THREE.Group, hand: THREE.Object3D, side: 'R' | 'L', amount: number) {
  if (amount < .0001) return;
  const middle = model.getObjectByName(`CT_Middle3_${side}`), index = model.getObjectByName(`CT_Index1_${side}`), pinky = model.getObjectByName(`CT_Pinky1_${side}`);
  if (!middle || !index || !pinky) return;
  hand.updateWorldMatrix(true, true);
  const current = hand.getWorldQuaternion(new THREE.Quaternion());
  const distal = middle.getWorldPosition(new THREE.Vector3()).sub(hand.getWorldPosition(new THREE.Vector3())).normalize();
  const width = index.getWorldPosition(new THREE.Vector3()).sub(pinky.getWorldPosition(new THREE.Vector3())).normalize();
  const normal = width.cross(distal).normalize().multiplyScalar(side === 'R' ? 1 : -1);
  const forward = new THREE.Vector3(side === 'R' ? .035 : -.035, -.12, 1).normalize().transformDirection(model.matrixWorld);
  const align = new THREE.Quaternion().setFromUnitVectors(distal, forward);
  normal.applyQuaternion(align); normal.addScaledVector(forward, -normal.dot(forward)).normalize();
  const down = new THREE.Vector3(0, -1, 0).transformDirection(model.matrixWorld); down.addScaledVector(forward, -down.dot(forward)).normalize();
  const angle = Math.atan2(forward.dot(normal.clone().cross(down)), normal.dot(down));
  const wanted = new THREE.Quaternion().setFromAxisAngle(forward, angle).multiply(align).multiply(current);
  const parent = hand.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
  hand.quaternion.slerp(parent.invert().multiply(wanted), amount); hand.updateWorldMatrix(true, true);
}

function curlNativeFinger(model: THREE.Group, side: 'R' | 'L', finger: string, joint: number, amount: number, palmNormal: THREE.Vector3) {
  const bone = model.getObjectByName(`CT_${finger}${joint}_${side}`), next = model.getObjectByName(`CT_${finger}${joint + 1}_${side}`);
  if (!bone || !bone.parent) return;
  bone.updateWorldMatrix(true, true);
  // The business donor ends at phalanx 3. Its real weighted distal skin
  // still needs flexion even though glTF contains no fourth joint marker.
  const direction = next
    ? next.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize()
    : bone.getWorldPosition(new THREE.Vector3()).sub(bone.parent.getWorldPosition(new THREE.Vector3())).normalize();
  const axis = direction.cross(palmNormal).normalize().applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, amount));
  bone.updateWorldMatrix(true, true);
}

export function nativeAdultPerformance(model: THREE.Group, id: Identity, retained?: CharacterPose) {
  const face = characterPerformance(model, id, {}, retained);
  const bones: THREE.Bone[] = [];
  model.traverse(o => { if (o instanceof THREE.Bone && o.name.startsWith('CT_')) bones.push(o); });
  const rest = new Map(bones.map(b => [b, { q: b.quaternion.clone(), p: b.position.clone() }]));
  const get = (name: string) => model.getObjectByName('CT_' + name);
  const pelvis = get('Pelvis'), skeleton = model.getObjectByName('CT_Humanoid');
  const rigPosition = skeleton?.position.clone() ?? new THREE.Vector3();
  const rigQuaternion = skeleton?.quaternion.clone() ?? new THREE.Quaternion();
  const chair = model.getObjectByName('CT_ChairContact');
  // Measure the actual retained upholstery in model coordinates. A fixed
  // wrist target in front of the chair previously left both palms floating.
  model.updateMatrixWorld(true);
  const armrests: Partial<Record<'R' | 'L', THREE.Box3>> = {};
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !/^V108d[ _]padded[ _]leather[ _]arm/.test(object.name)) return;
    object.geometry.computeBoundingBox();
    if (!object.geometry.boundingBox) return;
    const matrix = model.matrixWorld.clone().invert().multiply(object.matrixWorld);
    const bounds = object.geometry.boundingBox.clone().applyMatrix4(matrix);
    armrests[bounds.getCenter(new THREE.Vector3()).x < 0 ? 'R' : 'L'] = bounds;
  });
  const palmSurfaces: Partial<Record<'R' | 'L', { mesh: THREE.SkinnedMesh; indices: number[] }>> = {};
  model.traverse(object => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    const side = /^V12[ _]anatomical[ _]hand[ _]([RL])$/.exec(object.name)?.[1] as 'R' | 'L' | undefined;
    if (!side) return;
    const wrist = get('Hand_' + side), middle = get('Middle1_' + side);
    if (!wrist || !middle) return;
    const center = object.worldToLocal(wrist.getWorldPosition(new THREE.Vector3()).lerp(middle.getWorldPosition(new THREE.Vector3()), .55));
    const positions = object.geometry.getAttribute('position'), point = new THREE.Vector3();
    const indices = Array.from({ length: positions.count }, (_, index) => ({ index, distance: point.fromBufferAttribute(positions, index).distanceToSquared(center) }))
      .sort((a, b) => a.distance - b.distance).slice(0, 32).map(item => item.index);
    palmSurfaces[side] = { mesh: object, indices };
  });
  const samples: { name: string; mesh: THREE.SkinnedMesh; vertex: number }[] = [];
  for (const name of ['CT_Index2_R', 'CT_Calf_R', 'CT_Chest']) {
    let best: { mesh: THREE.SkinnedMesh; vertex: number; weight: number } | undefined;
    model.traverse(o => {
      if (!(o instanceof THREE.SkinnedMesh)) return;
      const joint = o.skeleton.bones.findIndex(b => b.name === name), indices = o.geometry.getAttribute('skinIndex'), weights = o.geometry.getAttribute('skinWeight');
      if (joint < 0 || !indices || !weights) return;
      for (let i = 0; i < indices.count; i++) for (let k = 0; k < 4; k++) {
        const weight = weights.getComponent(i, k);
        if (indices.getComponent(i, k) === joint && weight > (best?.weight ?? .01)) best = { mesh: o, vertex: i, weight };
      }
    });
    if (best) samples.push({ name, mesh: best.mesh, vertex: best.vertex });
  }
  let elapsed = retained?.elapsed ?? 0, actionTime = retained?.nativeGesture?.actionTime ?? 0, previous = retained?.nativeGesture?.previous ?? '', serial = retained?.nativeGesture?.sequence ?? -1;
  const blend = { greeting: 0, guide: 0, thinking: 0, listening: 0, stand: 0, walk: 0, turning: 0, ...retained?.nativeGesture?.blend };
  const gaze = new THREE.Vector2(...(retained?.nativeGesture?.pointer ?? [0, 0]));
  let gazeEngaged = retained?.nativeGesture?.engaged ?? false, initialized = false;
  const rotate = (name: string, axis: THREE.Vector3, angle: number) => {
    const b = get(name); if (!b || !angle) return;
    b.parent?.updateWorldMatrix(true, false);
    const worldAxis = axis.clone().applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion()));
    if (b.parent) worldAxis.applyQuaternion(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    b.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(worldAxis, angle));
  };
  const x = new THREE.Vector3(1, 0, 0), y = new THREE.Vector3(0, 1, 0), z = new THREE.Vector3(0, 0, 1);
  return {
    snapshot(): CharacterPose { return { ...face.snapshot(), elapsed, rotations: Object.fromEntries(bones.map(b => [b.name, [b.rotation.x, b.rotation.y, b.rotation.z]])), nativeGesture: { blend: { ...blend }, actionTime, previous, sequence: serial, pointer: gaze.toArray(), engaged: gazeEngaged } }; },
    update(dt: number, action: AvatarAction, sequence: number, reduced: boolean, paused: boolean, pointer: THREE.Vector2, engaged: boolean) {
      const state = face.update(dt, action, sequence, reduced, paused, pointer, engaged);
      if (paused && initialized) return { ...state, elapsed };
      const delta = paused ? 0 : Math.min(.05, dt); elapsed += delta;
      if (!paused && (previous !== action || serial !== sequence)) { previous = action; serial = sequence; actionTime = 0; }
      actionTime += delta;
      if (!paused) { gaze.copy(pointer); gazeEngaged = engaged; }
      for (const key of Object.keys(blend) as (keyof typeof blend)[]) {
        const on = key === 'stand' ? action === 'standing' || action === 'walking' : key === 'walk' ? action === 'walking' : action === key;
        if (!paused) blend[key] = reduced ? Number(on) : THREE.MathUtils.damp(blend[key], Number(on), key === 'stand' ? 2 : 5, delta);
      }
      bones.forEach(b => { b.quaternion.copy(rest.get(b)!.q); b.position.copy(rest.get(b)!.p); });
      if (skeleton) { skeleton.position.copy(rigPosition); skeleton.quaternion.copy(rigQuaternion); }
      if (chair) chair.position.z = -.24 * blend.stand;
      const t = elapsed, breathing = reduced ? 0 : Math.sin(t * 1.35);
      rotate('Spine', x, breathing * .005); rotate('Chest', x, breathing * .006);
      if (id === 'business') {
        const seated = 1 - blend.stand;
        rotate('Spine', x, -.035 * seated); rotate('Chest', x, -.018 * seated);
        rotate('Head', x, .035 * seated);
      }
      rotate('Head', x, action === 'nod' ? Math.sin(actionTime * 5.4) * .055 : blend.listening * .07);
      rotate('Head', y, action === 'observing' ? -.20 : gazeEngaged ? -gaze.x * .045 : reduced ? 0 : Math.sin(t * .31) * .025);
      rotate('Neck', z, blend.thinking * -.025);
      if (pelvis && id === 'business') { pelvis.position.y += blend.stand * .345; pelvis.position.z += blend.stand * .28; }
      if (skeleton) {
        const axis = y.clone().applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion()));
        if (skeleton.parent) axis.applyQuaternion(skeleton.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
        skeleton.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, blend.turning * .28));
      }
      for (const [side, sign] of [['R', -1], ['L', 1]] as const) {
        const upper = get('UpperArm_' + side), lower = get('Forearm_' + side), hand = get('Hand_' + side);
        if (upper && lower && hand) {
          model.updateMatrixWorld(true);
          const target = model.worldToLocal(hand.getWorldPosition(new THREE.Vector3()));
          if (id === 'business') {
            // Rest the actual wrists over the chair arms, retaining a natural
            // elbow bend. Standing/walking blend back into the standing rig.
            const support = armrests[side], center = support?.getCenter(new THREE.Vector3());
            // Clearance includes the donor palm's measured 22 mm underside
            // below its proximal knuckle; inspect actual skin, not bones only.
            target.lerp(new THREE.Vector3(center?.x ?? sign * .32, (support?.max.y ?? .7375) + .026, (center?.z ?? -.015) + .10), 1 - blend.stand);
          }
          if (side === 'R') {
            const greeting = new THREE.Vector3(-.35, id === 'business' ? 1.00 + .35 * blend.stand : 1.30, .17);
            target.lerp(greeting, blend.greeting);
            target.lerp(new THREE.Vector3(-.40, id === 'business' ? .85 + .35 * blend.stand : 1.10, .28), blend.guide);
            target.lerp(new THREE.Vector3(-.075, id === 'business' ? .965 + .35 * blend.stand : 1.355, .17), blend.thinking);
            target.lerp(new THREE.Vector3(-.12, id === 'business' ? .76 + .35 * blend.stand : 1.01, .29), blend.listening);
          }
          const swing = reduced ? 0 : Math.sin(actionTime * 3.5 + (side === 'R' ? 0 : Math.PI)) * .045 * blend.walk;
          target.z += swing;
          const seatedRest = id === 'business' ? (1 - blend.stand) * (1 - Math.max(blend.greeting, blend.guide, blend.thinking, blend.listening)) : 0;
          const pole = new THREE.Vector3(sign * (id === 'business' ? .265 : .45), id === 'business' ? .68 + .35 * blend.stand : 1.10, id === 'business' ? .025 : -.03)
            .lerp(new THREE.Vector3(sign * .32, .80, -.10), seatedRest);
          reach(model, upper, lower, hand, target, pole);
          if (id === 'business') restPalm(model, hand, side, (1 - blend.stand) * (1 - Math.max(blend.greeting, blend.guide, blend.thinking, blend.listening)));
          rotate('Hand_' + side, z, sign * blend.greeting * (reduced ? .08 : .10 + Math.sin(actionTime * 6) * .08));
        }
        // Finger pose varies by phalange and hand. These are the donor mesh's
        // real skin weights, not separate floating finger primitives.
        const index = get(`Index1_${side}`), pinky = get(`Pinky1_${side}`), middle = get(`Middle1_${side}`);
        if (hand && index && pinky && middle) {
          model.updateMatrixWorld(true);
          const distal = middle.getWorldPosition(new THREE.Vector3()).sub(hand.getWorldPosition(new THREE.Vector3())).normalize();
          const normal = index.getWorldPosition(new THREE.Vector3()).sub(pinky.getWorldPosition(new THREE.Vector3())).normalize().cross(distal).normalize().multiplyScalar(side === 'R' ? 1 : -1);
          for (const [fi, finger] of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].entries()) {
            for (let joint = 1; joint <= 3; joint++) {
              const resting = (finger === 'Thumb' ? .08 : .11 + fi * .025) * (1 + (reduced ? 0 : Math.sin(t * .65 + fi * .4) * .12));
              const thinking = finger === 'Thumb' ? .22 : finger === 'Index' ? [.25, .46, .28][joint - 1] : [.72, .92, .52][joint - 1];
              const angle = THREE.MathUtils.lerp(resting * (1 - blend.greeting * .8), thinking, side === 'R' ? blend.thinking : 0);
              curlNativeFinger(model, side, finger, joint, angle, normal);
            }
          }
        }
        if (id === 'business' || blend.walk > .0001) {
          const thigh = get('Thigh_' + side), calf = get('Calf_' + side), foot = get('Foot_' + side);
          if (thigh && calf && foot) {
            const phase = Math.max(0, actionTime - (id === 'business' ? 2 : 0)) * 2.8 + (side === 'R' ? 0 : Math.PI);
            // A planted support foot remains stationary. The lifted foot
            // follows an arc and returns to contact before the other lifts.
            const lift = Math.max(0, Math.sin(phase));
            const target = new THREE.Vector3(sign * .108, .075 + lift * .065 * blend.walk, (id === 'business' ? .412 - .12 * blend.stand : -.014) + lift * .055 * blend.walk);
            reach(model, thigh, calf, foot, target, new THREE.Vector3(sign * .12, .45, .42));
          }
        }
      }
      model.updateMatrixWorld(true);
      const vertices = Object.fromEntries(samples.map(sample => {
        sample.mesh.skeleton.update();
        const p = sample.mesh.getVertexPosition(sample.vertex, new THREE.Vector3());
        model.worldToLocal(sample.mesh.localToWorld(p));
        return [sample.name, p.toArray().map(v => Number(v.toFixed(6)))];
      }));
      const chairContact = id === 'business' ? Object.fromEntries((['R', 'L'] as const).map(side => {
        const support = armrests[side], hand = get('Hand_' + side), palm = get('Middle1_' + side);
        if (!support || !hand || !palm) return [side, null];
        const point = model.worldToLocal(palm.getWorldPosition(new THREE.Vector3()));
        const wrist = model.worldToLocal(hand.getWorldPosition(new THREE.Vector3()));
        const sample = palmSurfaces[side];
        sample?.mesh.skeleton.update();
        const surface = sample?.indices.map(index => model.worldToLocal(sample.mesh.localToWorld(sample.mesh.getVertexPosition(index, new THREE.Vector3())))) ?? [];
        const supported = surface.filter(p => p.x >= support.min.x && p.x <= support.max.x && p.z >= support.min.z && p.z <= support.max.z);
        return [side, { wrist: wrist.toArray(), palm: point.toArray(), supportMin: support.min.toArray(), supportMax: support.max.toArray(), gap: point.y - support.max.y, overSupport: point.x >= support.min.x && point.x <= support.max.x && point.z >= support.min.z && point.z <= support.max.z, surfaceVertices: surface.length, supportedVertices: supported.length, surfaceGap: supported.length ? Math.min(...supported.map(p => p.y - support.max.y)) : null }];
      })) : undefined;
      model.userData.nativeRig = { joints: bones.length, fingers: bones.filter(b => /Thumb|Index|Middle|Ring|Pinky/.test(b.name)).length, action, stand: blend.stand, vertices, chairContact };
      initialized = true;
      return { ...state, elapsed, motion: id + '-native-' + action };
    },
  };
}
