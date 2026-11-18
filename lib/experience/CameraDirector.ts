import type {Experience} from './ExperienceMachine';
export interface CameraPose {position:[number,number,number];target:[number,number,number]}
export interface CameraSnapshot extends CameraPose {fov:number}
export const ORBIT_POSE:CameraPose={position:[43,32,60],target:[0,9,-28]};
export type CityShot='overview'|'waterfront';
export function cityShotPose(shot:CityShot):CameraPose {
 return shot==='waterfront'?{position:[36,12,30],target:[-6,7,-26]}:ORBIT_POSE;
}
export function buildingPosition(id:number):[number,number,number]{if(id===0)return [0,0,0];const row=Math.floor((id-1)/8),col=(id-1)%8;return [(col-3.5)*13,0,-18-row*13];}
export function cameraCue(experience:Experience):CameraPose|null {
 const [x,,z]=buildingPosition(experience.building);
 if(experience.state==='approach'||experience.state==='returning')return ORBIT_POSE;
 if(experience.state==='focusing')return {position:[x+12,11,z+17],target:[x,7,z]};
 if(experience.state==='entering'||experience.state==='viewing')return experience.view==='walk'?{position:[x+2.9,6.6,z+2.7],target:[x+.2,6.6,z-2.4]}:{position:[x+7.7,12.8,z+10],target:[x-.25,5.6,z-.2]};
 return null;
}
export function scrollPose(progress:number):CameraPose {
 const poses:CameraPose[]=[ORBIT_POSE,{position:[16,14,24],target:[0,7,0]},{position:[5,8,11],target:[0,6,0]},{position:[7.7,12.8,10],target:[-.25,5.6,-.2]}];
 const t=Math.min(.999999,Math.max(0,progress))*3,i=Math.floor(t),f=t-i,s=f*f*(3-2*f);
 return {position:poses[i].position.map((v,j)=>v+(poses[i+1].position[j]-v)*s) as [number,number,number],target:poses[i].target.map((v,j)=>v+(poses[i+1].target[j]-v)*s) as [number,number,number]};
}
