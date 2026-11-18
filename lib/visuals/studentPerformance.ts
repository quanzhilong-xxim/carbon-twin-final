import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AvatarAction } from '@/components/3d/IdentityAvatar';
import type { CharacterPose } from './characterPerformance';

// This model has its own weighted humanoid skeleton and cannot use the
// procedural sleeve rig used by the earlier three characters.
export function studentCharacter(source: THREE.Group) {
  const model = clone(source) as THREE.Group;
  const owned: THREE.BufferGeometry[] = [];
  const skeletons = new Set<THREE.Skeleton>();
  let bodySkin: THREE.SkinnedMesh | undefined;
  let anatomicalHands = false;
  model.traverse(object => { if (/anatomical[_ ]student[_ ]hand/.test(object.name)) anatomicalHands = true; });
  model.traverse(object => { if(object instanceof THREE.SkinnedMesh){const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.some(material=>material.name==='Body_00_SKIN'))bodySkin=object;} });
  model.updateMatrixWorld(true);
  if(bodySkin && !anatomicalHands)for(const side of ['L','R']){
    const wrist=model.getObjectByName(`J_Bip_${side}_Hand`),forearm=model.getObjectByName(`J_Bip_${side}_LowerArm`);
    if(!wrist||!forearm)continue;
    const center=model.worldToLocal(wrist.getWorldPosition(new THREE.Vector3())),direction=center.clone().sub(model.worldToLocal(forearm.getWorldPosition(new THREE.Vector3()))).normalize();
    const geometry=new THREE.CylinderGeometry(.018,.020,.05,18,6).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction));
    const middle=center.clone().addScaledVector(direction,.012);geometry.translate(middle.x,middle.y,middle.z);
    const lowerIndex=bodySkin.skeleton.bones.indexOf(forearm as THREE.Bone),handIndex=bodySkin.skeleton.bones.indexOf(wrist as THREE.Bone),position=geometry.getAttribute('position'),indices:number[]=[],weights:number[]=[];
    if(Math.min(lowerIndex,handIndex)<0){geometry.dispose();continue;}
    for(let i=0;i<position.count;i++){const t=THREE.MathUtils.clamp((new THREE.Vector3().fromBufferAttribute(position,i).sub(center).dot(direction)+.013)/.05,0,1);indices.push(lowerIndex,handIndex,0,0);weights.push(1-t,t,0,0);}
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));owned.push(geometry);
    const bridge=new THREE.SkinnedMesh(geometry,bodySkin.material);bridge.name='Student continuous wrist '+side;model.add(bridge);bridge.bind(bodySkin.skeleton,bodySkin.bindMatrix);bridge.frustumCulled=false;
  }
  model.userData.studentOwnedGeometries=owned;
  model.traverse(object => {
    if(object instanceof THREE.SkinnedMesh)skeletons.add(object.skeleton);
    if (object instanceof THREE.Mesh) {
      // Blender preview expressions must never become a second simultaneous
      // expression layer. The player owns all weights on this cloned model.
      object.morphTargetInfluences?.fill(0);
      // The source export contains two detached legacy cuff rings at the
      // wrists. They read as hard bracelets when the fitted sleeve deforms;
      // the sleeve and hand surfaces already provide the continuous seam.
      const sourceName = object.name.replace(/_/g, ' ');
      if (/cuff/i.test(sourceName)) {
        if (/^V3 fitted cuff(?:[ .]?001)?$/.test(sourceName)) object.visible = false;
      }
      object.castShadow = true;
      // Keep fine skin/hair free of shadow-map acne while allowing the actual
      // clothes to receive arm, braid and accessory contact shadows.
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      object.receiveShadow = !materials.some(material => /skin|hair|plait|rose satin/i.test(material.name))
        && !/hair|plait|rose.*lock/i.test(sourceName);
      object.frustumCulled = false;
    }
  });
  return { model, elbows: {}, elbow: undefined, dispose: () => { (model.userData.studentOwnedGeometries as THREE.BufferGeometry[] | undefined)?.forEach(geometry => geometry.dispose()); skeletons.forEach(skeleton=>skeleton.dispose()); } };
}

export function studentPerformance(model: THREE.Group, retained?: CharacterPose) {
  const bones = new Map<string, { bone: THREE.Object3D; rest: THREE.Quaternion }>();
  const fingers = ['Index', 'Middle', 'Ring', 'Little'];
  const fingerBones = ['L', 'R'].flatMap(side => fingers.flatMap(finger => [1, 2, 3].map(joint => `J_Bip_${side}_${finger}${joint}`)));
  const thumbBones = ['L', 'R'].flatMap(side => [1, 2, 3].map(joint => `J_Bip_${side}_Thumb${joint}`));
  for (const name of ['J_Bip_L_UpperArm', 'J_Bip_R_UpperArm', 'J_Bip_L_LowerArm', 'J_Bip_R_LowerArm', 'J_Bip_L_Hand', 'J_Bip_R_Hand', 'J_Roll_L_WristSkin', 'J_Roll_R_WristSkin', 'J_Bip_C_Head', 'J_Bip_C_Chest', ...fingerBones, ...thumbBones]) {
    const bone = model.getObjectByName(name);
    if (bone) bones.set(name, { bone, rest: bone.quaternion.clone() });
  }
  const morphs: THREE.Mesh[] = [];
  const recordingProps: THREE.Object3D[] = [];
  const notebookParts: THREE.Object3D[] = [];
  let pen: THREE.Object3D | undefined;
  model.traverse(object => {
    if (object instanceof THREE.Mesh && object.morphTargetDictionary && object.morphTargetInfluences) morphs.push(object);
    // GLTFLoader sanitizes spaces to underscores; Blender custom properties
    // are not guaranteed to survive every export. Recognize both real forms.
    const name = object.name.replace(/_/g, ' ');
    if (object.userData.ct_action_prop === 'recording' || /^V11 (notebook|field notebook)/.test(name)) {
      recordingProps.push(object); object.visible = false;
      if (/^V11 notebook/.test(name)) notebookParts.push(object);
      if (/^V11 field notebook pen/.test(name)) pen = object;
    }
  });
  // GLB exports may omit Blender custom properties. Infer a fitted A-pose
  // from the actual rest skeleton so an already lowered arm is not lowered twice.
  model.updateMatrixWorld(true);
  const shoulder = model.getObjectByName('J_Bip_R_UpperArm');
  const hand = model.getObjectByName('J_Bip_R_Hand');
  const restDirection = shoulder && hand
    ? hand.getWorldPosition(new THREE.Vector3()).sub(shoulder.getWorldPosition(new THREE.Vector3()))
    : undefined;
  const fitted = Boolean(restDirection && Math.abs(restDirection.y) > Math.abs(restDirection.x) * .7);
  const leftHand = bones.get('J_Bip_L_Hand')?.bone;
  const rightHand = bones.get('J_Bip_R_Hand')?.bone;
  const rootRest = model.getWorldQuaternion(new THREE.Quaternion());
  const leftRest = leftHand?.getWorldQuaternion(new THREE.Quaternion()).premultiply(rootRest.clone().invert());
  const rightRest = rightHand?.getWorldQuaternion(new THREE.Quaternion()).premultiply(rootRest.clone().invert());
  const notebookCenter = notebookParts.find(object => /pages$/.test(object.name));
  // Fit retained source meshes to the palm rather than leaving the former
  // eight-centimetre air gap. These transforms belong only to this clone.
  const notebookOffset = new THREE.Vector3(.075, 0, .004);
  const notebookThumbGrip = new THREE.Vector3(.045, -.020, .002);
  const penOffset = new THREE.Vector3(-.078, .012, .052);
  const writingGrip = new THREE.Vector3(-.093, -.014, .022);
  const rightMiddle = model.getObjectByName('J_Bip_R_Middle1'), rightIndex = model.getObjectByName('J_Bip_R_Index1'), rightLittle = model.getObjectByName('J_Bip_R_Little1');
  let rightPalmBasis: THREE.Quaternion | undefined;
  if (rightHand && rightMiddle && rightIndex && rightLittle) {
    const forward = rightHand.worldToLocal(rightMiddle.getWorldPosition(new THREE.Vector3())).normalize();
    const across = rightHand.worldToLocal(rightIndex.getWorldPosition(new THREE.Vector3())).sub(rightHand.worldToLocal(rightLittle.getWorldPosition(new THREE.Vector3())));
    across.addScaledVector(forward, -across.dot(forward)).normalize();
    rightPalmBasis = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(forward, across, forward.clone().cross(across).normalize())).invert();
  }
  let leftPalmBasis: THREE.Quaternion | undefined;
  const leftMiddle = model.getObjectByName('J_Bip_L_Middle1'), leftIndex = model.getObjectByName('J_Bip_L_Index1'), leftLittle = model.getObjectByName('J_Bip_L_Little1');
  if (leftHand && leftMiddle && leftIndex && leftLittle) {
    const forward = leftHand.worldToLocal(leftMiddle.getWorldPosition(new THREE.Vector3())).normalize();
    const across = leftHand.worldToLocal(leftIndex.getWorldPosition(new THREE.Vector3())).sub(leftHand.worldToLocal(leftLittle.getWorldPosition(new THREE.Vector3())));
    across.addScaledVector(forward, -across.dot(forward)).normalize();
    leftPalmBasis = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(forward, across, forward.clone().cross(across).normalize())).invert();
  }
  const penAxis = new THREE.Vector3(0, 1, 0);
  const penTipLocal = new THREE.Vector3(0, -.0475, 0);
  if (pen instanceof THREE.Mesh) {
    pen.geometry.computeBoundingBox();
    const size = pen.geometry.boundingBox?.getSize(new THREE.Vector3());
    if (size && pen.geometry.boundingBox) {
      penAxis.set(size.x > size.y && size.x > size.z ? 1 : 0, size.y >= size.x && size.y > size.z ? 1 : 0, size.z >= size.x && size.z >= size.y ? 1 : 0);
      pen.geometry.boundingBox.getCenter(penTipLocal);
      const axis = penAxis.x ? 0 : penAxis.y ? 1 : 2;
      penTipLocal.setComponent(axis, pen.geometry.boundingBox.min.getComponent(axis));
    }
  }
  let paperSurface = .006;
  const notebookHandTurn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
  if (leftPalmBasis) notebookHandTurn.multiply(leftPalmBasis);
  notebookOffset.set(-.093, 0, .004).applyQuaternion(notebookHandTurn.clone().invert());
  if (leftHand && notebookCenter) {
    const book = new THREE.Group(); book.name = 'Student open field notebook';
    book.position.copy(notebookCenter.getWorldPosition(new THREE.Vector3()));
    book.quaternion.copy(notebookCenter.getWorldQuaternion(new THREE.Quaternion()));
    model.add(book); model.updateMatrixWorld(true);
    for (const part of notebookParts) book.attach(part);
    leftHand.attach(book); book.position.copy(notebookOffset); book.quaternion.copy(notebookHandTurn.clone().invert());
    model.updateMatrixWorld(true);
    if (notebookCenter instanceof THREE.Mesh) {
      notebookCenter.geometry.computeBoundingBox();
      const bounds = notebookCenter.geometry.boundingBox?.clone().applyMatrix4(book.matrixWorld.clone().invert().multiply(notebookCenter.matrixWorld));
      if (bounds) paperSurface = bounds.max.z;
      // Support the underside of the actual page mesh. The retained notebook
      // has a different local up axis from the palm; a hard-coded wrist
      // offset previously put the supporting fingers above the paper.
      const pageBounds = notebookCenter.geometry.boundingBox;
      if (pageBounds) {
        const size = pageBounds.getSize(new THREE.Vector3());
        const thin = size.x < size.y && size.x < size.z ? 0 : size.y < size.z ? 1 : 2;
        const oldWrist = notebookCenter.worldToLocal(leftHand.getWorldPosition(new THREE.Vector3()));
        const supportedWrist = oldWrist.clone().setComponent(thin, pageBounds.min.getComponent(thin) - .019);
        const shift = notebookCenter.localToWorld(oldWrist.clone()).sub(notebookCenter.localToWorld(supportedWrist));
        const localShift = leftHand.worldToLocal(leftHand.getWorldPosition(new THREE.Vector3()).add(shift));
        notebookOffset.add(localShift); book.position.copy(notebookOffset);
        model.updateMatrixWorld(true);
        const thumb = pageBounds.getCenter(new THREE.Vector3());
        thumb.x = pageBounds.max.x + .001;
        thumb.setComponent(thin, pageBounds.max.getComponent(thin) + .012);
        notebookThumbGrip.copy(leftHand.worldToLocal(notebookCenter.localToWorld(thumb)));
      }
    }
    const cover = notebookParts.find(part => /front[_ ]cover/.test(part.name));
    if (cover) {
      // Open the retained front cover about its spine, exposing actual page
      // geometry. The former pose wrote on the closed green cover.
      const hinge = new THREE.Vector3(-.0485, 0, .008);
      const opening = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -2.65);
      cover.position.sub(hinge).applyQuaternion(opening).add(hinge);
      cover.quaternion.premultiply(opening);
    }
  }
  if (pen && rightHand) pen.position.copy(penOffset);

  // Lift the actual retained camera, including the brass rim/shutter that
  // were batched with other accessories in the source export. Split only
  // this instance's triangles; the shared GLTF buffers remain immutable.
  const cameraProp = new THREE.Group(); cameraProp.name = 'Student retained field camera';
  const cameraRest = new THREE.Vector3(0, 1.035, .172); cameraProp.position.copy(cameraRest); model.add(cameraProp);
  const cameraOwned: THREE.BufferGeometry[] = model.userData.studentOwnedGeometries ?? [];
  const staticMeshes: THREE.Mesh[] = [];
  model.updateMatrixWorld(true);
  model.traverse(object => { if (object instanceof THREE.Mesh && !(object instanceof THREE.SkinnedMesh)) staticMeshes.push(object); });
  const inverseModel = model.matrixWorld.clone().invert();
  for (const mesh of staticMeshes) {
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    const positions = geometry.getAttribute('position');
    if (!positions) { geometry.dispose(); continue; }
    const transform = inverseModel.clone().multiply(mesh.matrixWorld);
    const selected: number[] = [], remaining: number[] = [];
    for (let i = 0; i < positions.count; i += 3) {
      const center = new THREE.Vector3();
      for (let j = 0; j < 3; j++) center.add(new THREE.Vector3().fromBufferAttribute(positions, i + j).applyMatrix4(transform));
      center.multiplyScalar(1 / 3);
      const camera = /^(Field[_ ]camera|Camera[_ ]lens)$/.test(mesh.name) || Math.abs(center.x) < .09 && center.y > .95 && center.y < 1.13 && center.z > .14 && center.z < .26;
      (camera ? selected : remaining).push(i, i + 1, i + 2);
    }
    if (!selected.length) { geometry.dispose(); continue; }
    const subset = (indices: number[]) => {
      const result = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries(geometry.attributes)) {
        const values = new Float32Array(indices.length * attribute.itemSize);
        indices.forEach((source, destination) => { for (let k = 0; k < attribute.itemSize; k++) values[destination * attribute.itemSize + k] = attribute.getComponent(source, k); });
        result.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize, attribute.normalized));
      }
      cameraOwned.push(result); return result;
    };
    const cameraGeometry = subset(selected).applyMatrix4(transform).translate(-cameraRest.x, -cameraRest.y, -cameraRest.z);
    const piece = new THREE.Mesh(cameraGeometry, mesh.material); piece.name = mesh.name + '_camera_part'; piece.castShadow = true; cameraProp.add(piece);
    if (remaining.length) mesh.geometry = subset(remaining); else mesh.visible = false;
    geometry.dispose();
  }
  model.userData.studentOwnedGeometries = cameraOwned;
  const cameraStraps: THREE.Object3D[] = [];
  model.traverse(object => { if (/fitted[_ ]camera[_ ]neck[_ ]strap/.test(object.name)) cameraStraps.push(object); });

  const setWorldRotation = (bone: THREE.Object3D, rotation: THREE.Quaternion) => {
    const parent = bone.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
    bone.quaternion.copy(parent.invert().multiply(rotation));
    model.updateMatrixWorld(true);
  };
  const reach = (side: 'L' | 'R', target: THREE.Vector3, pole: THREE.Vector3, rotation: THREE.Quaternion | undefined, weight: number) => {
    const upper = bones.get(`J_Bip_${side}_UpperArm`)?.bone;
    const lower = bones.get(`J_Bip_${side}_LowerArm`)?.bone;
    const wrist = bones.get(`J_Bip_${side}_Hand`)?.bone;
    if (!upper || !lower || !wrist) return;
    const a = upper.getWorldPosition(new THREE.Vector3());
    const b = lower.getWorldPosition(new THREE.Vector3());
    const c = wrist.getWorldPosition(new THREE.Vector3());
    const lengthA = a.distanceTo(b), lengthB = b.distanceTo(c);
    if (Math.min(lengthA, lengthB) < 1e-5) return;
    const direction = target.clone().sub(a).normalize();
    const distance = THREE.MathUtils.clamp(a.distanceTo(target), Math.abs(lengthA - lengthB) + 1e-4, lengthA + lengthB - 1e-4);
    const along = (lengthA * lengthA + distance * distance - lengthB * lengthB) / (2 * distance);
    const bend = Math.sqrt(Math.max(0, lengthA * lengthA - along * along));
    const outward = pole.clone().sub(a).addScaledVector(direction, -pole.clone().sub(a).dot(direction)).normalize();
    const elbow = a.clone().addScaledVector(direction, along).addScaledVector(outward, bend);
    const upperBefore = upper.getWorldQuaternion(new THREE.Quaternion());
    const lowerBefore = lower.getWorldQuaternion(new THREE.Quaternion());
    const wristBefore = wrist.getWorldQuaternion(new THREE.Quaternion());
    const upperSolved = new THREE.Quaternion().setFromUnitVectors(b.sub(a).normalize(), elbow.clone().sub(a).normalize()).multiply(upperBefore);
    setWorldRotation(upper, upperSolved);
    const elbowNow = lower.getWorldPosition(new THREE.Vector3());
    const wristNow = wrist.getWorldPosition(new THREE.Vector3());
    const lowerSolved = new THREE.Quaternion().setFromUnitVectors(wristNow.sub(elbowNow).normalize(), target.clone().sub(elbowNow).normalize()).multiply(lower.getWorldQuaternion(new THREE.Quaternion()));
    setWorldRotation(lower, lowerSolved);
    // Blend the entire solved chain; this preserves the natural transition
    // and gives a fixed, measurable contact at the held writing pose.
    setWorldRotation(upper, upperBefore.slerp(upperSolved, weight));
    setWorldRotation(lower, lowerBefore.slerp(lowerSolved, weight));
    if(rotation)setWorldRotation(wrist, wristBefore.slerp(rotation, weight));
  };
  // Fit the skin fingertip, rather than folding the distal joint onto the
  // shaft. PIP/DIP joints have one bounded flex axis; they cannot twist or
  // bend backwards. Solve once per instance in palm coordinates, then blend
  // the retained local bone rotations without updating the entire scene in
  // every solver iteration.
  const grips = new Map<string, THREE.Quaternion[]>();
  const pinchFinger = (side: 'L' | 'R', finger: string, target: THREE.Vector3) => {
    const key = side + finger;
    const chain = [1, 2, 3].map(joint => bones.get(`J_Bip_${side}_${finger}${joint}`));
    const palm = bones.get(`J_Bip_${side}_Hand`)?.bone;
    if (!palm || chain.some(entry => !entry)) return;
    const entries = chain as NonNullable<typeof chain[number]>[];
    let solved = grips.get(key);
    if (!solved) {
      const restWorld: THREE.Quaternion[] = [];
      let rotation = new THREE.Quaternion();
      for (const entry of entries) restWorld.push(rotation = rotation.clone().multiply(entry.rest));
      const p1 = entries[0].bone.position.clone();
      const p2 = entries[1].bone.position.clone().applyQuaternion(restWorld[0]).add(p1);
      const p3 = entries[2].bone.position.clone().applyQuaternion(restWorld[1]).add(p2);
      const forward = p3.clone().sub(p2).normalize();
      let tip = entries[2].bone.position.clone().multiplyScalar(.80);
      let furthest = -Infinity;
      const candidates: { point: THREE.Vector3; along: number }[] = [];
      model.updateMatrixWorld(true);
      model.traverse(object => {
        if (!(object instanceof THREE.SkinnedMesh)) return;
        const boneIndex = object.skeleton.bones.indexOf(entries[2].bone as THREE.Bone);
        if (boneIndex < 0) return;
        const indices = object.geometry.getAttribute('skinIndex'), weights = object.geometry.getAttribute('skinWeight');
        const positions = object.geometry.getAttribute('position');
        if (!indices || !weights) return;
        for (let i = 0; i < positions.count; i++) {
          let influence = 0;
          for (let j = 0; j < 4; j++) if (indices.getComponent(i, j) === boneIndex) influence += weights.getComponent(i, j);
          if (influence < .6) continue;
          const point = object.localToWorld(object.applyBoneTransform(i, new THREE.Vector3().fromBufferAttribute(positions, i)));
          const local = palm.worldToLocal(point.clone()), along = local.clone().sub(p3).dot(forward);
          furthest = Math.max(furthest, along); candidates.push({ point, along });
        }
      });
      const surface = candidates.filter(sample => sample.along > furthest - .003);
      if (surface.length) {
        tip = new THREE.Vector3();
        for (const sample of surface) tip.add(entries[2].bone.worldToLocal(sample.point.clone()));
        tip.multiplyScalar(1 / surface.length);
      }
      const thumb = finger === 'Thumb';
      const hinge = thumb ? forward.clone().cross(target.clone().sub(p1)).normalize() : new THREE.Vector3(0, 0, side === 'R' ? 1 : -1);
      if (hinge.lengthSq() < .5) hinge.set(0, 0, side === 'R' ? 1 : -1);
      const axes = restWorld.map(q => hinge.clone().applyQuaternion(q.clone().invert()));
      const splayAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(restWorld[0].clone().invert());
      const bounds = [[thumb ? -.85 : -.45, thumb ? .85 : .45], [-.35, 1.25], [0, 1.55], [0, .95]];
      const baseline = [0, .05, .9, .45];
      const quaternions = (a: number[]) => entries.map((entry, i) => {
        const q = entry.rest.clone();
        if (i === 0) q.multiply(new THREE.Quaternion().setFromAxisAngle(splayAxis, a[0]));
        return q.multiply(new THREE.Quaternion().setFromAxisAngle(axes[i], a[i + 1]));
      });
      const pageObstacle = side === 'L' && thumb && notebookCenter instanceof THREE.Mesh && notebookCenter.geometry.boundingBox
        ? { transform: notebookCenter.matrixWorld.clone().invert().multiply(palm.matrixWorld), bounds: notebookCenter.geometry.boundingBox.clone().expandByScalar(.008) }
        : undefined;
      const loss = (a: number[]) => {
        const qs = quaternions(a), q = qs[0].clone(), point = p1.clone();
        const joints = [point.clone()];
        for (let i = 1; i < 3; i++) { point.add(entries[i].bone.position.clone().applyQuaternion(q)); q.multiply(qs[i]); joints.push(point.clone()); }
        point.add(tip.clone().applyQuaternion(q));
        joints.push(point.clone());
        let collision = 0;
        if (pageObstacle) for (let i = 1; i < joints.length; i++) for (const t of [.25, .5, .75, 1]) {
          const sample = joints[i - 1].clone().lerp(joints[i], t).applyMatrix4(pageObstacle.transform);
          if (!pageObstacle.bounds.containsPoint(sample)) continue;
          const depth = Math.min(...[0, 1, 2].flatMap(axis => [sample.getComponent(axis) - pageObstacle.bounds.min.getComponent(axis), pageObstacle.bounds.max.getComponent(axis) - sample.getComponent(axis)]));
          collision += depth * depth;
        }
        return point.distanceToSquared(target) + collision * 16 + a.reduce((n, v, i) => n + (v - baseline[i]) ** 2, 0) * .000002;
      };
      let best = baseline.slice(), score = Infinity;
      for (const seed of [baseline, [0, -.3, 1.4, .6], [0, .6, .8, .3]]) {
        const angles = seed.slice();
        for (let pass = 0; pass < 18; pass++) {
          const step = .45 * .76 ** Math.floor(pass / 2);
          for (let i = 0; i < 4; i++) {
            let value = angles[i], minimum = loss(angles);
            for (const sign of [-1, 1]) { const trial = angles.slice(); trial[i] = THREE.MathUtils.clamp(angles[i] + sign * step, ...bounds[i] as [number, number]); const cost = loss(trial); if (cost < minimum) { minimum = cost; value = trial[i]; } }
            angles[i] = value;
          }
        }
        const cost = loss(angles); if (cost < score) { score = cost; best = angles; }
      }
      solved = quaternions(best); grips.set(key, solved);
    }
    entries.forEach((entry, i) => entry.bone.quaternion.slerp(solved![i], record));
  };
  let elapsed = retained?.elapsed ?? .7, actionTime = retained?.actionTime ?? 0;
  let previous = retained?.previous ?? '', sequence = retained?.sequence ?? -1;
  let nextBlink = retained?.nextBlink ?? 3.2, blinkStart = retained?.blinkStart ?? -10;
  let blink = retained?.face.BlinkLeft ?? 0, smile = retained?.face.Smile ?? .12;
  let gazeX = 0, gazeY = 0;
  let observe = retained?.studentGesture?.observe ?? 0, record = retained?.studentGesture?.record ?? 0, turn = retained?.studentGesture?.turn ?? 0;
  let { wave, guide, listen, nod } = retained?.studentGesture ?? { wave: 0, guide: 0, listen: 0, nod: 0 };
  const rotate = (name: string, axis: THREE.Vector3, angle: number) => {
    const entry = bones.get(name);
    if (!entry || !entry.bone.parent) return;
    const rootRotation = model.getWorldQuaternion(new THREE.Quaternion());
    const parentRotation = entry.bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const localAxis = axis.clone().applyQuaternion(rootRotation).applyQuaternion(parentRotation.invert());
    entry.bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(localAxis, angle));
    model.updateMatrixWorld(true);
  };
  const apply = (action: AvatarAction, reduced: boolean) => {
    for (const { bone, rest } of bones.values()) bone.quaternion.copy(rest);
    model.updateMatrixWorld(true);
    if (!fitted) {
      rotate('J_Bip_L_UpperArm', new THREE.Vector3(0, 0, 1), -1.13);
      rotate('J_Bip_R_UpperArm', new THREE.Vector3(0, 0, 1), 1.13);
    }
    rotate('J_Bip_L_LowerArm', new THREE.Vector3(1, 0, 0), -.18);
    rotate('J_Bip_R_UpperArm', new THREE.Vector3(0, 0, 1), -.78 * wave - .25 * guide);
    rotate('J_Bip_R_LowerArm', new THREE.Vector3(1, 0, 0), -.18 - .12 * wave - .4 * listen);
    // Raise the palm with the elbow, rather than rotating the forearm across
    // the torso. Keep a small, bounded wrist-height oscillation for the greeting.
    rotate('J_Bip_R_LowerArm', new THREE.Vector3(0, 0, 1), wave * (-1.75 + (reduced ? 0 : Math.sin(actionTime * 7) * .1)));
    rotate('J_Bip_R_Hand', new THREE.Vector3(0, 1, 0), wave * .95);
    rotate('J_Bip_C_Head', new THREE.Vector3(1, 0, 0), nod * (reduced ? .06 : Math.sin(actionTime * 5) * .06) + .08 * listen);
    rotate('J_Bip_C_Head', new THREE.Vector3(0, 1, 0), gazeX);
    rotate('J_Bip_C_Head', new THREE.Vector3(1, 0, 0), gazeY);
    rotate('J_Bip_C_Head', new THREE.Vector3(0, 0, 1), -.035 * wave);
    rotate('J_Bip_C_Head', new THREE.Vector3(0, 1, 0), -.22 * observe);
    rotate('J_Bip_C_Head', new THREE.Vector3(1, 0, 0), -.09 * observe + .16 * record);
    rotate('J_Bip_C_Chest', new THREE.Vector3(0, 1, 0), -.08 * observe + .13 * turn);
    rotate('J_Bip_C_Chest', new THREE.Vector3(1, 0, 0), reduced ? 0 : Math.sin(elapsed * 1.6) * .004);
    cameraProp.position.copy(cameraRest).lerp(new THREE.Vector3(0, 1.18, .28), listen);
    cameraProp.rotation.x = -.10 * listen;
    model.userData.studentCamera = { pieces: cameraProp.children.length, raised: listen, height: cameraProp.position.y };
    for (const strap of cameraStraps) strap.visible = listen < .08;
    if (listen > .0001 && leftRest && rightRest) {
      const leftTarget = model.localToWorld(cameraProp.position.clone().add(new THREE.Vector3(.115, -.07, .015)));
      const rightTarget = model.localToWorld(cameraProp.position.clone().add(new THREE.Vector3(-.115, -.07, .015)));
      reach('L', leftTarget, model.localToWorld(new THREE.Vector3(.32, 1.06, .1)), undefined, listen);
      reach('R', rightTarget, model.localToWorld(new THREE.Vector3(-.32, 1.06, .1)), undefined, listen);
    }
    if (record > .0001 && leftRest && rightRest && notebookCenter && pen) {
      const rootRotation = model.getWorldQuaternion(new THREE.Quaternion());
      const pageRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -.8);
      const pageCenter = new THREE.Vector3(.075, 1.06, .25);
      const leftRotation = rootRotation.clone().multiply(pageRotation).multiply(notebookHandTurn);
      const pageWorld = model.localToWorld(pageCenter.clone());
      const leftOffset = notebookOffset.clone().applyQuaternion(leftRotation);
      const leftTarget = pageWorld.clone().sub(leftOffset);
      const ink = reduced ? 0 : Math.sin(actionTime * 7) * .005;
      const tip = model.localToWorld(pageCenter.clone().add(new THREE.Vector3(ink, .012, paperSurface + .0003).applyQuaternion(pageRotation)));
      const penDirection = new THREE.Vector3(-.45, .7, .55).normalize().applyQuaternion(rootRotation);
      const forward = new THREE.Vector3(1, -.35, -.10).normalize();
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(pageRotation);
      normal.addScaledVector(forward, -normal.dot(forward)).normalize();
      const across = normal.clone().cross(forward).normalize();
      const rightRotation = rightPalmBasis
        ? rootRotation.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(forward, across, normal))).multiply(rightPalmBasis)
        : rootRotation.clone().multiply(rightRest);
      const localPenDirection = penDirection.clone().applyQuaternion(rightRotation.clone().invert());
      penOffset.copy(writingGrip).addScaledVector(localPenDirection, .020);
      pen.position.copy(penOffset);
      pen.quaternion.setFromUnitVectors(penAxis, localPenDirection);
      const penCenter = tip.clone().sub(penTipLocal.clone().multiply(pen.scale).applyQuaternion(rightRotation.clone().multiply(pen.quaternion)));
      const rightTarget = penCenter.clone().sub(penOffset.clone().applyQuaternion(rightRotation));
      reach('L', leftTarget, model.localToWorld(new THREE.Vector3(.31, 1.035, .10)), leftRotation, record);
      reach('R', rightTarget, model.localToWorld(new THREE.Vector3(-.29, 1.035, .12)), rightRotation, record);
      if(record>.08)model.userData.studentContact = {
        notebookGrip: leftHand!.getWorldPosition(new THREE.Vector3()).distanceTo(leftTarget),
        writingTip: pen.localToWorld(penTipLocal.clone()).distanceTo(tip),
        paperSurface,
        penTip: pen.localToWorld(penTipLocal.clone()).toArray(),
      };else delete model.userData.studentContact;
    } else delete model.userData.studentContact;
    for (const side of ['L', 'R']) {
      const roll = bones.get(`J_Roll_${side}_WristSkin`)?.bone;
      const lower = bones.get(`J_Bip_${side}_LowerArm`)?.bone, wrist = bones.get(`J_Bip_${side}_Hand`)?.bone;
      if (roll && lower && wrist) setWorldRotation(roll, lower.getWorldQuaternion(new THREE.Quaternion()).slerp(wrist.getWorldQuaternion(new THREE.Quaternion()), .5));
    }
    for (const prop of recordingProps) prop.visible = record > .08;
    // Keep the hand relaxed while opening it slightly for a wave.
    for (const side of ['L', 'R']) for (const [index, finger] of fingers.entries()) {
      const openness = side === 'R' ? wave : 0;
      const palm = bones.get(`J_Bip_${side}_Hand`)?.bone;
      const palmRotation = palm?.getWorldQuaternion(new THREE.Quaternion()) ?? model.getWorldQuaternion(new THREE.Quaternion());
      const inverseRoot = model.getWorldQuaternion(new THREE.Quaternion()).invert();
      // The retained fingers lie in local X/Z. Flex around their across-palm
      // Z axis; rotating about Y spread them sideways instead of curling.
      const curlAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(palmRotation).applyQuaternion(inverseRoot);
      for (const joint of [1, 2, 3]) {
        const relaxed = (-.16 - index * .018 - (joint - 1) * .06) * (1 - openness * .7);
        const grip = side === 'L' ? [-.02, -.04, -.02][joint - 1] : index >= 2 ? [-.60, -1.05, -.80][joint - 1] : -.62 - (joint - 1) * .12;
        const held = THREE.MathUtils.lerp(relaxed, [-.30, -.30, -.18][joint - 1], listen);
        const amount = THREE.MathUtils.lerp(held, grip, record) * (side === 'L' ? 1 : -1);
        rotate(`J_Bip_${side}_${finger}${joint}`, curlAxis, amount);
      }
    }
    // Oppose each thumb toward the book edge / pen shaft. A thumb curled
    // about the old global axis pointed away from both actual props.
    if (record > .0001) {
      pinchFinger('L', 'Thumb', notebookThumbGrip);
      pinchFinger('R', 'Thumb', writingGrip.clone().add(new THREE.Vector3(.002, .004, .004)));
      pinchFinger('R', 'Index', writingGrip.clone().add(new THREE.Vector3(0, -.004, .004)));
      pinchFinger('R', 'Middle', writingGrip.clone().add(new THREE.Vector3(-.003, -.006, -.006)));
      model.updateMatrixWorld(true);
    }
    model.userData.studentRecordingProps = recordingProps.length;
    model.userData.studentRecordingVisible = recordingProps.filter(prop => prop.visible).length;
    for (const mesh of morphs) {
      const dictionary = mesh.morphTargetDictionary!, values = mesh.morphTargetInfluences!;
      for (const [suffix, value] of [
        ['Fcl_EYE_Close', blink], ['Fcl_MTH_Joy', smile],
        ['Fcl_BRW_Joy', wave * .22], ['Fcl_EYE_Joy', wave * .12 * (1 - blink)],
        ['Fcl_BRW_Fun', listen * .18], ['Fcl_EYE_Surprised', guide * .1],
      ] as const) {
        const key = Object.keys(dictionary).find(name => name.endsWith(suffix));
        if (key !== undefined) values[dictionary[key]] = value;
      }
    }
  };
  apply((previous || 'idle') as AvatarAction, false);
  return {
    snapshot(): CharacterPose {
      return { face: { BlinkLeft: blink, BlinkRight: blink, Smile: smile, GazeLeft: 0, GazeRight: 0, GazeDown: 0 }, elapsed, actionTime, previous, sequence, nextBlink, blinkStart, rotations: {}, breath: 1, studentGesture: { wave, guide, listen, nod, observe, record, turn } };
    },
    update(dt: number, action: AvatarAction, serial: number, reduced: boolean, paused: boolean, pointer: THREE.Vector2, engaged: boolean) {
      if (previous !== action || sequence !== serial) { actionTime = 0; previous = action; sequence = serial; }
      if (!paused) {
        const delta = Math.min(dt, .05); elapsed += delta; actionTime += delta;
        const follow = engaged && !reduced && action === 'idle';
        gazeX = THREE.MathUtils.damp(gazeX, follow ? THREE.MathUtils.clamp(pointer.x, -1, 1) * .08 : 0, 3, delta);
        gazeY = THREE.MathUtils.damp(gazeY, follow ? THREE.MathUtils.clamp(-pointer.y, -1, 1) * .04 : 0, 3, delta);
        const blend = (current: number, selected: boolean) => reduced ? Number(selected) : THREE.MathUtils.damp(current, Number(selected), 6, delta);
        wave = blend(wave, action === 'greeting'); guide = blend(guide, action === 'guide');
        listen = blend(listen, action === 'listening'); nod = blend(nod, action === 'nod');
        observe = blend(observe, action === 'observing'); record = blend(record, action === 'recording'); turn = blend(turn, action === 'turning');
        if (!reduced && elapsed > nextBlink) { blinkStart = elapsed; nextBlink = elapsed + 4.5; }
        const blinkTime = action === 'blink' && actionTime < .4 ? actionTime : elapsed - blinkStart;
        blink = reduced ? (action === 'blink' ? .85 : 0) : blinkTime >= 0 && blinkTime < .32 ? Math.sin(Math.PI * blinkTime / .32) : 0;
        const targetSmile = action === 'greeting' ? .4 : .12;
        smile = reduced ? targetSmile : THREE.MathUtils.damp(smile, targetSmile, 5, delta);
        apply(action, reduced);
      }
      return { blink, smile, motion: paused ? 'paused' : `student-${action}`, elapsed, morphMeshes: morphs.length };
    },
  };
}
