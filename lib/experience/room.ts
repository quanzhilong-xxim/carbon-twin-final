import { FACTORS } from '@/lib/emissions';
export interface RoomEnergy { power: number; hours: number; lighting: number; embodied: number | null; enabled:boolean; temperature:number; grade:1|3 }
export const defaultRoomEnergy: RoomEnergy={power:1500,hours:8,lighting:5,embodied:null,enabled:true,temperature:26,grade:1};
/** Explicit teaching scenario, not a certified APF/SEER or thermal simulation. */
export function effectivePower(input:RoomEnergy):number{return input.enabled?input.power*(input.grade===3?1.18:1)*Math.max(.75,1+(26-input.temperature)*.035):0;}
export function calculateRoom(input: RoomEnergy) {
  const watts=effectivePower(input),daily=(watts*input.hours+10*input.lighting)/1000;
  return {daily,watts,monthly:daily*30,scope2Daily:daily*FACTORS.electricity.value,acDaily:watts*input.hours/1000*FACTORS.electricity.value,scope3:input.embodied};
}
export interface FurniturePose {x:number;z:number;rotation:number}
export interface RoomLayout {sofa:FurniturePose;table:FurniturePose}
export type FurnitureId=keyof RoomLayout;
export const defaultLayout:RoomLayout={sofa:{x:-1.5,z:-1.5,rotation:0},table:{x:-1.5,z:.25,rotation:Math.PI/2}};
const dimensions:Record<FurnitureId,[number,number]>={sofa:[2.8,1.18],table:[.9,1.8]};
function extent(id:FurnitureId,p:FurniturePose):[number,number]{const [w,d]=dimensions[id],c=Math.abs(Math.cos(p.rotation)),s=Math.abs(Math.sin(p.rotation));return [c*w+s*d,s*w+c*d];}
/** Conservative rotated AABB: rejects collisions, snaps 25cm and clamps to the room. */
export function constrainFurniture(id:FurnitureId,candidate:FurniturePose,layout:RoomLayout):FurniturePose {
  const rotation=Math.round(candidate.rotation/(Math.PI/12))*Math.PI/12;
  const [w,d]=extent(id,{...candidate,rotation});
  const x=Math.max(-3.7+w/2,Math.min(3.7-w/2,Math.round(candidate.x*4)/4));
  const z=Math.max(-3.05+d/2,Math.min(2.8-d/2,Math.round(candidate.z*4)/4));
  const otherId=id==='sofa'?'table':'sofa',other=layout[otherId],[ow,od]=extent(otherId,other);
  if(Math.abs(x-other.x)<(w+ow)/2+.12&&Math.abs(z-other.z)<(d+od)/2+.12)return layout[id];
  // Reserve the service balcony, plant and television corner.
  if(x+w/2>2.2&&z-d/2<-.8)return layout[id];
  return {x,z,rotation};
}
export function readLayout(value:unknown):RoomLayout|null {
  if(!value||typeof value!=='object')return null;
  const result:RoomLayout=structuredClone(defaultLayout);
  for(const id of ['sofa','table'] as const){const v=(value as Record<string,unknown>)[id];if(!v||typeof v!=='object')return null;const p=v as Record<string,unknown>;if(!['x','z','rotation'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k])))return null;result[id]={x:p.x as number,z:p.z as number,rotation:p.rotation as number};}
  const a=result.sofa,b=result.table,[aw,ad]=extent('sofa',a),[bw,bd]=extent('table',b);
  if(Math.abs(a.x-b.x)<(aw+bw)/2+.12&&Math.abs(a.z-b.z)<(ad+bd)/2+.12)return null;
  for(const id of ['sofa','table'] as const){const p=result[id],[w,d]=extent(id,p);if(p.x-w/2< -3.7||p.x+w/2>3.7||p.z-d/2< -3.05||p.z+d/2>2.8||p.x+w/2>2.2&&p.z-d/2<-.8)return null;}
  // Validate the complete persisted arrangement, not only each coordinate.
  for(const id of ['sofa','table'] as const){const p=constrainFurniture(id,result[id],result);if(Math.abs(p.x-result[id].x)>.001||Math.abs(p.z-result[id].z)>.001||Math.abs(p.rotation-result[id].rotation)>.001)return null;}
  return result;
}
