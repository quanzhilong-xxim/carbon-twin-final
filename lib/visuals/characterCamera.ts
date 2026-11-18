import type { Identity } from '@/lib/store';

export type AvatarView = 'front' | 'left' | 'right' | 'threequarter' | 'back' | 'detail' | 'eyes' | 'hair' | 'outfit' | 'hands' | 'prop';
export function characterCamera(id: Identity, view: AvatarView, recording = false, standing = false, greeting = false) {
  const face = id === 'student' ? 1.47 : id === 'business' ? 1.20 : 1.59;
  const position: [number, number, number] = view === 'detail' ? [0, face + .025, .75] : view === 'outfit' ? [0, 1.13, 1.4] : view === 'hands' ? id === 'city' ? [.35, 1.04, .70] : [-.29, .80, .55] : view === 'prop' ? id === 'student' ? [0, 1.06, .82] : id === 'city' ? [.35, 1.16, 1.05] : [-.29, .92, .55] : [0, 1.02, 3.25];
  const target: [number, number, number] = view === 'detail' ? [0, face, 0] : view === 'outfit' ? [0, 1.08, 0] : view === 'hands' ? id === 'city' ? [.35, .99, .12] : [-.29, .80, 0] : view === 'prop' ? id === 'student' ? [0, 1.035, .17] : id === 'city' ? [.35, 1.10, .15] : [-.29, .90, .04] : [0, .91, 0];
  const rise = id === 'business' && standing ? .345 : 0;
  const advance = rise ? .28 : 0;
  if (view === 'eyes') return {position:[0,face+.015+rise,.42+advance] as [number,number,number],target:[0,face+rise,advance] as [number,number,number],rotation:0};
  if (view === 'hair') return {position:[.34,face+.18+rise,.68+advance] as [number,number,number],target:[0,face+.1+rise,advance] as [number,number,number],rotation:-.18};
  if (id === 'student' && view === 'hands') { position.splice(0,3,-.58,.94,.54); target.splice(0,3,-.31,.82,.01); }
  if (id === 'student' && view === 'hands' && recording) { position.splice(0,3,.38,1.32,.86); target.splice(0,3,.075,1.06,.25); }
  if (id === 'student' && view === 'hands' && greeting) { position.splice(0,3,-.52,1.52,.76); target.splice(0,3,-.28,1.44,.06); }
  if (id === 'business' && view !== 'detail') {
    if (view === 'hands' || view === 'prop') { position[1] = .72; position[2] = 1.05; target[1] = .66; target[2] = .26; }
    else if (view === 'outfit') { position[1] = .88; position[2] = 1.85; target[1] = .70; }
    else { position[1] = .86; position[2] = 2.9; target[1] = .70; }
  }
  if (id === 'business' && standing) {
    if (['detail', 'hands', 'prop', 'outfit'].includes(view)) { position[1] += .345; target[1] += .345; position[2] += .28; target[2] += .28; }
    else { position.splice(0,3,0,1.05,3.6); target.splice(0,3,0,.98,.18); }
  }
  return { position, target, rotation: view === 'left' ? -Math.PI / 2 : view === 'right' ? Math.PI / 2 : view === 'threequarter' ? -Math.PI / 4 : view === 'back' ? Math.PI : 0 };
}
