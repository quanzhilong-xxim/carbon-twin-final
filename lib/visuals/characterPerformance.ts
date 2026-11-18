import * as THREE from 'three';
import type { Identity } from '@/lib/store';
import type { AvatarAction } from '@/components/3d/IdentityAvatar';
import { reachArticulatedHand } from './characterArm';

type Face = { BlinkLeft: number; BlinkRight: number; Smile: number; GazeLeft: number; GazeRight: number; GazeDown: number };
export type CharacterPose = {
  face: Face; elapsed: number; actionTime: number; previous: string; sequence: number; nextBlink: number; blinkStart: number;
  rotations: Record<string, [number, number, number]>; breath: number;
  studentGesture?: { wave: number; guide: number; listen: number; nod: number; observe?: number; record?: number; turn?: number };
  adultGesture?: { read: number; think: number; guide: number };
  nativeGesture?: { blend: Record<'greeting' | 'guide' | 'thinking' | 'listening' | 'stand' | 'walk' | 'turning', number>; actionTime: number; previous: string; sequence: number; pointer: [number, number]; engaged: boolean };
};

/** Instance-local facial morphs and bounded gestures. The original Rain/Snow
 * eyelid deformations were baked in Blender; eyeballs are never squashed.
 */
export function characterPerformance(model: THREE.Group, id: Identity, elbows: Partial<Record<'right' | 'left', THREE.Bone>>, retained?: CharacterPose) {
  const head = model.getObjectByName('Head'), body = model.getObjectByName('Breath');
  const right = model.getObjectByName('ArmRight'), left = model.getObjectByName('ArmLeft');
  const wristRight=model.getObjectByName('WristRight'),wristLeft=model.getObjectByName('WristLeft');
  const shoulders=[model.getObjectByName('ShoulderRight'),model.getObjectByName('ShoulderLeft')];
  const base = new Map([head, right, left].filter((o): o is THREE.Object3D => Boolean(o)).map(o => [o, o.rotation.clone()]));
  const morphs: THREE.Mesh[] = [];
  model.traverse(o => { if (o instanceof THREE.Mesh && o.morphTargetDictionary && o.morphTargetInfluences) morphs.push(o); });
  const phase = id === 'student' ? .7 : id === 'business' ? 2.1 : 3.4;
  let elapsed = retained?.elapsed ?? phase, actionTime = retained?.actionTime ?? 0, previous = retained?.previous ?? '', sequence = retained?.sequence ?? -1, nextBlink = retained?.nextBlink ?? 2.5 + phase, blinkStart = retained?.blinkStart ?? -10;
  const face: Face = { BlinkLeft: .08, BlinkRight: .08, Smile: .2, GazeLeft: 0, GazeRight: 0, GazeDown: 0, ...retained?.face };
  const articulated = [head, right, left, elbows.right, elbows.left, wristRight, wristLeft, ...shoulders].filter((o): o is THREE.Object3D => Boolean(o));
  let read=retained?.adultGesture?.read??0,think=retained?.adultGesture?.think??0,guide=retained?.adultGesture?.guide??0;
  if (retained) {
    for (const o of articulated) { const rotation = retained.rotations[o.name]; if (rotation) o.rotation.set(...rotation); }
    if (body) body.scale.y = retained.breath;
  }
  const applyFace = () => {
    for (const mesh of morphs) for (const [name, value] of Object.entries(face)) {
      const i = mesh.morphTargetDictionary![name]; if (i !== undefined) mesh.morphTargetInfluences![i] = value;
    }
  };
  // A paused portrait must initialize its expression before its first frame.
  applyFace();
  const move = (o: THREE.Object3D | undefined, target: THREE.Euler, rate: number, dt: number, reduced: boolean) => {
    if (!o) return;
    for (const k of ['x', 'y', 'z'] as const) o.rotation[k] = reduced ? target[k] : THREE.MathUtils.damp(o.rotation[k], target[k], rate, dt);
  };
  return {
    snapshot(): CharacterPose {
      return { face: { ...face }, elapsed, actionTime, previous, sequence, nextBlink, blinkStart,
        rotations: Object.fromEntries(articulated.map(o => [o.name, [o.rotation.x, o.rotation.y, o.rotation.z] as [number, number, number]])), breath: body?.scale.y ?? 1, adultGesture:{read,think,guide} };
    },
    update(dt: number, action: AvatarAction, serial: number, reduced: boolean, paused: boolean, pointer: THREE.Vector2, engaged: boolean) {
      if (previous !== action || sequence !== serial) { actionTime = 0; previous = action; sequence = serial; }
      if (paused) return { blink: face.BlinkLeft, smile: face.Smile, motion: 'paused', elapsed, morphMeshes: morphs.length };
      const delta = Math.min(dt, .05); elapsed += delta; actionTime += delta;
      const blend=(value:number,selected:boolean)=>reduced?Number(selected):THREE.MathUtils.damp(value,Number(selected),6,delta);
      read=blend(read,action==='listening');think=blend(think,action==='thinking');guide=blend(guide,action==='guide');
      for(const shoulder of shoulders)shoulder?.quaternion.identity();
      wristRight?.quaternion.identity();wristLeft?.quaternion.identity();
      const t = elapsed, a = actionTime, student = id === 'student', business = id === 'business';
      if (!reduced && t > nextBlink) { blinkStart = t; nextBlink = t + 3.6 + (Math.sin(t * 7.31) + 1) * 1.7; }
      const blinkT = action === 'blink' && a < .38 ? a : t - blinkStart;
      const blink = !reduced && blinkT >= 0 && blinkT < .32 ? Math.sin(Math.PI * blinkT / .32) ** 1.3 : 0;
      const close = .08 + blink * .92;
      const targets = {
        BlinkLeft: close, BlinkRight: .08 + (blinkT > .018 ? blink * .92 : 0),
        Smile: action === 'greeting' ? student ? .85 : .5 : action === 'guide' ? .46 : .2,
        GazeLeft: engaged ? Math.max(0, -pointer.x) * .65 : Math.max(0, Math.sin(t * .33 + phase)) * .16,
        GazeRight: engaged ? Math.max(0, pointer.x) * .65 : Math.max(0, -Math.sin(t * .33 + phase)) * .16,
        GazeDown: action === 'listening' ? .8 : action === 'thinking' ? .35 : 0,
      };
      for (const key of Object.keys(face) as (keyof typeof face)[]) face[key] = reduced ? targets[key] : THREE.MathUtils.damp(face[key], targets[key], key.startsWith('Blink') ? 45 : 13, delta);
      applyFace();
      if (body) body.scale.y = reduced ? 1 : 1 + Math.sin(t * (student ? 1.6 : 1.25)) * .0025;
      const hb = head ? base.get(head)! : new THREE.Euler();
      move(head, new THREE.Euler(hb.x + (action === 'listening' ? .15 : action === 'thinking' ? .055 : action === 'observing' ? -.055 : action === 'nod' ? (reduced ? .08 : Math.sin(a * 5.8) * .07) : 0), hb.y + (action === 'observing' ? -.21 : action === 'thinking' ? .08 : engaged ? -pointer.x * .065 : reduced ? 0 : Math.sin(t * .33 + phase) * .022), hb.z + (action === 'thinking' ? .045 : student && action === 'greeting' ? -.035 : 0)), 3, delta, reduced);
      const rb = right ? base.get(right)! : new THREE.Euler(), lb = left ? base.get(left)! : new THREE.Euler();
      // Student waves; the builder acknowledges then considers data; the
      // steward offers a restrained guiding gesture and reads a held tablet.
      const rz = action === 'greeting' ? student ? -.62 : business ? -.19 : -.32 : action === 'guide' ? -.42 : action === 'listening' ? student ? .08 : business ? .04 : .10 : -.025;
      const rx = action === 'listening' ? student ? -.75 : business ? -.35 : -.48 : action === 'guide' ? -.26 : business ? -.24 : 0;
      const ez = action === 'greeting' ? student ? -1.95 + (reduced ? 0 : Math.sin(a * 7) * .14) : business ? -.90 : -1.20 : action === 'guide' ? student ? -.82 : -1.05 : action === 'listening' ? student ? .95 : business ? .8 : 1.05 : -.10;
      move(right, new THREE.Euler(rb.x + rx, rb.y, rb.z + rz), 7, delta, reduced);
      move(elbows.right, new THREE.Euler(business ? action === 'greeting' ? -.5 : -1.05 : action === 'listening' ? -.3 : 0, 0, ez), 7, delta, reduced);
      move(left, new THREE.Euler(lb.x + (id === 'city' ? -.10 : 0), lb.y, lb.z + (id === 'city' ? -.05 : .015)), 5, delta, reduced);
      move(elbows.left, new THREE.Euler(id === 'city' ? -.65-.10*read : business ? -.95 : 0, 0, id === 'city' ? -.1 : .10), 5, delta, reduced);
      if(wristLeft&&id==='city')wristLeft.rotation.set(-.06*read,0,.04*read);
      model.updateMatrixWorld(true);
      if(wristRight){
        const sourceTip=new THREE.Vector3().fromArray(wristRight.userData.handTipLocal??[0,-.16,.015]);
        if(read>.0001){
          if(id==='city'){
            const screen=model.getObjectByName('Tablet_glass_screen')??model.getObjectByName('Tablet glass screen');
            if(screen){
              const point=model.worldToLocal(new THREE.Box3().setFromObject(screen).getCenter(new THREE.Vector3()));point.x-=.065;point.y-=.035;point.z+=.018;
              const orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.6,0,1.0));
              const wrist=point.clone().sub(sourceTip.clone().applyQuaternion(orientation));
              reachArticulatedHand(model,'Right',wrist,new THREE.Vector3(-.32,1.10,.10),orientation,read);
            }
          }else reachArticulatedHand(model,'Right',new THREE.Vector3(-.09,.77,.30),new THREE.Vector3(-.34,.77,.08),new THREE.Quaternion().setFromEuler(new THREE.Euler(-.65,0,-.25)),read);
        }
        if(think>.0001){
          const chin=business?1.085:1.475;
          const orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.1,0,Math.PI));
          const target=new THREE.Vector3(-.055,chin-.012,.17).sub(sourceTip.clone().applyQuaternion(orientation));
          reachArticulatedHand(model,'Right',target,new THREE.Vector3(-.30,chin-.20,.10),orientation,think);
        }
        if(guide>.0001){
          const orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.12,.1,-1.3));
          const target=new THREE.Vector3(business?-.46:-.49,business?.86:1.10,.28).sub(sourceTip.clone().applyQuaternion(orientation));
          reachArticulatedHand(model,'Right',target,new THREE.Vector3(-.32,business?.8:1.12,.06),orientation,guide);
        }
        model.userData.adultArticulation={runtimeBones:6,wristWeighted:true,tabletAttachedToWrist:id==='city'};
      }
      return { blink: face.BlinkLeft, smile: face.Smile, motion: id + '-' + action, elapsed, morphMeshes: morphs.length };
    },
  };
}
