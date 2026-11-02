import type {RoomLayout} from './room';
import type {SpaceKind} from './spaces';
interface Obstacle {x:number;z:number;w:number;d:number}
function obstacles(kind:SpaceKind,layout:RoomLayout):Obstacle[]{
 if(kind==='home')return [
  ...(['sofa','table'] as const).map(id=>{const p=layout[id],[w,d]=id==='sofa'?[2.8,1.18]:[.9,1.8],c=Math.abs(Math.cos(p.rotation)),s=Math.abs(Math.sin(p.rotation));return {x:p.x,z:p.z,w:c*w+s*d,d:s*w+c*d};}),
  {x:-1.5,z:2.95,w:2.7,d:.65},{x:1.9,z:1.7,w:1.3,d:1.4},{x:-3.1,z:-.4,w:.65,d:.7}
 ];
 if(kind==='office')return [{x:-1.5,z:-1.2,w:1.76,d:.84},{x:-1.5,z:1.05,w:1.76,d:.84},{x:2.6,z:-2.2,w:1,d:.9},{x:.55,z:-.5,w:.06,d:4.6},...[-.15,2.1].map(z=>({x:-1.5,z,w:.6,d:.6}))];
 return [{x:-.6,z:-1.9,w:5,d:1.05},{x:2.6,z:-2.35,w:1.05,d:.85},{x:-2.4,z:1.45,w:1.5,d:1.05},...[-1.7,-.3,1.1].map(x=>({x,z:-.55,w:.5,d:.5}))];
}
/** Slide along conservative furniture AABBs; fixed eye height is owned by the camera. */
export function walkStep(kind:SpaceKind,layout:RoomLayout,x:number,z:number,dx:number,dz:number):[number,number]{
 const radius=.2,items=obstacles(kind,layout),clear=(a:number,b:number)=>!items.some(o=>Math.abs(a-o.x)<o.w/2+radius&&Math.abs(b-o.z)<o.d/2+radius);
 const nx=Math.max(-3.65,Math.min(3.65,x+dx)),nz=Math.max(-3.15,Math.min(3.15,z+dz));
 if(clear(nx,z))x=nx;if(clear(x,nz))z=nz;
 return [x,z];
}
