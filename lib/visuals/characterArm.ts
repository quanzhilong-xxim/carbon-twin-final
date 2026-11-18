import * as THREE from 'three';
import type { Identity } from '@/lib/store';

/** Add a continuous elbow joint to the retained, fitted sleeve and hand.
 * The GLTF cache keeps its original buffers; this instance owns only its rig
 * geometry and skeleton. No identity, action or persistence logic lives here.
 */
export function articulatedCharacter(source: THREE.Group, id: Identity) {
  const model = source.clone(true);
  const owned: THREE.BufferGeometry[] = [];
  const elbows: Partial<Record<'right' | 'left', THREE.Bone>> = {};
  const wrists: Partial<Record<'right' | 'left', THREE.Bone>> = {};
  const skeletons: THREE.Skeleton[] = [];
  for (const side of ['right', 'left'] as const) {
    const arm = model.getObjectByName(side === 'right' ? 'ArmRight' : 'ArmLeft');
    if (!arm) continue;
    model.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    arm.traverse(o => { if (o instanceof THREE.Mesh) meshes.push(o); });
    const transforms = meshes.map(mesh => mesh.matrixWorld.clone());
    const sourceName = (mesh: THREE.Object3D) => String(mesh.userData.name || mesh.name).replace(/_/g, ' ');
    const shoulder = meshes.find(mesh => sourceName(mesh).startsWith('V3 rounded sleeve shoulder'));
    const cuff = meshes.find(mesh => sourceName(mesh).startsWith('V3 fitted cuff'));
    const cuffCenter = cuff ? new THREE.Box3().setFromObject(cuff).getCenter(new THREE.Vector3()) : undefined;
    // Rotate around the fitted shoulder, rather than the original loose pivot.
    if (shoulder) arm.position.add(shoulder.position);
    model.updateMatrixWorld(true);
    const inverse = arm.matrixWorld.clone().invert();
    const upper = new THREE.Bone(); upper.name = side === 'right' ? 'ShoulderRight' : 'ShoulderLeft';
    const elbow = new THREE.Bone(); elbow.name = side === 'right' ? 'ElbowRight' : 'ElbowLeft';
    elbow.position.set((id === 'business' ? .06 : .045) * (side === 'right' ? -1 : 1), id === 'student' ? -.22 : -.25, 0);
    elbows[side] = elbow;
    upper.add(elbow); arm.add(upper); model.updateMatrixWorld(true);
    const wrist = new THREE.Bone(); wrist.name = side === 'right' ? 'WristRight' : 'WristLeft';
    wrist.position.copy(cuffCenter ? arm.worldToLocal(cuffCenter.clone()).sub(elbow.position) : new THREE.Vector3(0, -.23, 0));
    elbow.add(wrist); wrists[side] = wrist;
    const skeleton = new THREE.Skeleton([upper, elbow, wrist]); skeletons.push(skeleton);
    const joint = elbow.position.y;
    const replacements = meshes.map((mesh, index) => {
      const geometry = mesh.geometry.clone().applyMatrix4(inverse.clone().multiply(transforms[index]));
      owned.push(geometry);
      const position = geometry.getAttribute('position'), indices = [], weights = [];
      for (let i = 0; i < position.count; i++) {
        const t = THREE.MathUtils.clamp((joint + .075 - position.getY(i)) / .15, 0, 1);
        const weight = t * t * (3 - 2 * t);
        if (sourceName(mesh).startsWith('Source skin')) {
          indices.push(2, 0, 0, 0); weights.push(1, 0, 0, 0);
        } else { indices.push(0, 1, 0, 0); weights.push(1 - weight, weight, 0, 0); }
      }
      geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
      geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
      const replacement = new THREE.SkinnedMesh(geometry, mesh.material);
      replacement.name = mesh.name; replacement.userData = { ...mesh.userData }; replacement.frustumCulled = false; replacement.castShadow = true;
      mesh.removeFromParent(); arm.add(replacement);
      return replacement;
    });
    model.updateMatrixWorld(true);
    replacements.forEach(mesh => mesh.bind(skeleton!));
    const hand = replacements.find(mesh => sourceName(mesh).startsWith('Source skin'));
    if(hand){
      const position=hand.geometry.getAttribute('position');let minimum=Infinity;
      for(let i=0;i<position.count;i++)minimum=Math.min(minimum,position.getY(i));
      const tip=new THREE.Vector3();let samples=0;
      for(let i=0;i<position.count;i++)if(position.getY(i)<minimum+.008){tip.add(new THREE.Vector3().fromBufferAttribute(position,i));samples++;}
      if(samples)wrist.userData.handTipLocal=tip.multiplyScalar(1/samples).sub(elbow.position).sub(wrist.position).toArray();
      // The retained source was cut off below a generous cloth cuff. Fill
      // that real wrist interval with a short weighted anatomical bridge so
      // rotating a palm does not expose an empty sleeve opening.
      const center=elbow.position.clone().add(wrist.position),palm=new THREE.Vector3();
      for(let i=0;i<position.count;i++)palm.add(new THREE.Vector3().fromBufferAttribute(position,i));
      const direction=palm.multiplyScalar(1/position.count).sub(center).normalize();
      const bridgeGeometry=new THREE.CylinderGeometry(.024,.026,.055,20,7).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction)).translate(...center.clone().addScaledVector(direction,.015).toArray() as [number,number,number]);
      const bridgePositions=bridgeGeometry.getAttribute('position'),bridgeIndices:number[]=[],bridgeWeights:number[]=[];
      for(let i=0;i<bridgePositions.count;i++){
        const point=new THREE.Vector3().fromBufferAttribute(bridgePositions,i),t=THREE.MathUtils.clamp((point.sub(center).dot(direction)+.0125)/.055,0,1);
        bridgeIndices.push(1,2,0,0);bridgeWeights.push(1-t,t,0,0);
      }
      bridgeGeometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(bridgeIndices,4));bridgeGeometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(bridgeWeights,4));owned.push(bridgeGeometry);
      const bridge=new THREE.SkinnedMesh(bridgeGeometry,hand.material);bridge.name='ContinuousWrist'+(side==='right'?'Right':'Left');bridge.castShadow=true;bridge.frustumCulled=false;arm.add(bridge);model.updateMatrixWorld(true);bridge.bind(skeleton);
    }
  }
  if (id === 'city' && wrists.left) {
    // The tablet belongs to the holding forearm, rather than floating on the
    // torso while that arm moves. Preserve its retained appearance and scale.
    model.updateMatrixWorld(true);
    const held = model.getObjectByName('HeldTablet');
    const frame = model.getObjectByName('Tablet_graphite_frame') ?? model.getObjectByName('Tablet graphite frame');
    if (held) wrists.left.attach(held);
    else if (frame) {
      const tablet = new THREE.Group(); tablet.name = 'HeldTablet';
      const pieces: THREE.Object3D[] = [];
      model.traverse(o => { if (/^Tablet[_ ]/.test(o.name)) pieces.push(o); });
      const center = new THREE.Box3().setFromObject(frame).getCenter(new THREE.Vector3());
      model.add(tablet); tablet.position.copy(center); model.updateMatrixWorld(true);
      for (const piece of pieces) tablet.attach(piece);
      wrists.left.attach(tablet);
    }
  }
  model.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    o.castShadow = true;
    // Millimetre-scale facial surfaces cannot resolve the scene's shadow
    // texels. Keep their physical lighting and the silhouette cast onto the
    // surroundings without projecting stair-step self-shadow bands on skin.
    o.receiveShadow = !/(_head|_eyes|_eyebrows|_eyelashes)$|anime face|hair|groom|fringe/i.test(o.name);
  });
  return { model, elbow: elbows.right, elbows, wrists, dispose: () => { owned.forEach(g => g.dispose()); skeletons.forEach(s => s.dispose()); } };
}

/** Solve the actual runtime shoulder/elbow/wrist chain. Targets are supplied
 * in character coordinates so orbiting the model does not break contact. */
export function reachArticulatedHand(model: THREE.Group, side: 'Right' | 'Left', point: THREE.Vector3, pole: THREE.Vector3, orientation: THREE.Quaternion, weight: number) {
  const upper=model.getObjectByName('Shoulder'+side), lower=model.getObjectByName('Elbow'+side), wrist=model.getObjectByName('Wrist'+side);
  if(!upper||!lower||!wrist||weight<.0001)return;
  model.updateMatrixWorld(true);
  const target=model.localToWorld(point.clone()), bend=model.localToWorld(pole.clone());
  const a=upper.getWorldPosition(new THREE.Vector3()), b=lower.getWorldPosition(new THREE.Vector3()), c=wrist.getWorldPosition(new THREE.Vector3());
  const la=a.distanceTo(b),lb=b.distanceTo(c);if(Math.min(la,lb)<.0001)return;
  const direction=target.clone().sub(a).normalize(),distance=THREE.MathUtils.clamp(a.distanceTo(target),Math.abs(la-lb)+.0001,la+lb-.0001);
  const along=(la*la+distance*distance-lb*lb)/(2*distance),height=Math.sqrt(Math.max(0,la*la-along*along));
  const normal=bend.sub(a).addScaledVector(direction,-bend.dot(direction)).normalize();
  const elbow=a.clone().addScaledVector(direction,along).addScaledVector(normal,height);
  const beforeU=upper.getWorldQuaternion(new THREE.Quaternion()),beforeL=lower.getWorldQuaternion(new THREE.Quaternion()),beforeW=wrist.getWorldQuaternion(new THREE.Quaternion());
  const set=(bone:THREE.Object3D,world:THREE.Quaternion)=>{bone.quaternion.copy((bone.parent?.getWorldQuaternion(new THREE.Quaternion())??new THREE.Quaternion()).invert().multiply(world));model.updateMatrixWorld(true);};
  const solvedU=new THREE.Quaternion().setFromUnitVectors(b.sub(a).normalize(),elbow.clone().sub(a).normalize()).multiply(beforeU);set(upper,solvedU);
  const eb=lower.getWorldPosition(new THREE.Vector3()),wc=wrist.getWorldPosition(new THREE.Vector3());
  const solvedL=new THREE.Quaternion().setFromUnitVectors(wc.sub(eb).normalize(),target.clone().sub(eb).normalize()).multiply(lower.getWorldQuaternion(new THREE.Quaternion()));set(lower,solvedL);
  set(upper,beforeU.slerp(solvedU,weight));set(lower,beforeL.slerp(solvedL,weight));
  set(wrist,beforeW.slerp(model.getWorldQuaternion(new THREE.Quaternion()).multiply(orientation),weight));
}
