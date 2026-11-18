'use client';
import {create} from 'zustand';
import {experienceMachine,initialExperience,type Experience,type ExperienceEvent} from './ExperienceMachine';
import {defaultRoomEnergy,type RoomEnergy,defaultLayout,type RoomLayout} from './room';
import {defaultDevices,type DeviceStates,type SpaceObject} from './spaces';
import type {CityShot} from './CameraDirector';
interface TwinState {experience:Experience;cityShot?:CityShot;energy:RoomEnergy;layout:RoomLayout;devices:DeviceStates;hovered:SpaceObject|null;roomReady:boolean;renderFault:boolean;linked:boolean;ghost:boolean;wind:boolean;rain:boolean;audio:boolean;sculpture:boolean;particles:number;quality:'high'|'balanced'|'low'|'static';dispatch:(event:ExperienceEvent)=>void}
export const useTwinStore=create<TwinState>((set)=>({experience:initialExperience,energy:defaultRoomEnergy,layout:defaultLayout,devices:defaultDevices,hovered:null,roomReady:false,renderFault:false,linked:false,ghost:false,wind:true,rain:false,audio:false,sculpture:false,particles:64,quality:'balanced',dispatch:(event)=>set(s=>{const experience=experienceMachine(s.experience,event);return {experience,...(['FOCUS','RETURN'].includes(event.type)?{cityShot:'overview' as const}:{}),...(experience!==s.experience?{hovered:null}:{}),...((experience!==s.experience&&(event.type==='ENTER'||event.type==='RETURN'))?{roomReady:false}:{})};})}));
export const twinClock={scroll:0};
