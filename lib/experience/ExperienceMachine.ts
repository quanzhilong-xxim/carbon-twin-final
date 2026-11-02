/** Pure scene reducer. Camera completion events, rather than timers, unlock controls. */
export type ExperienceState = 'loading' | 'reveal' | 'approach' | 'orbit' | 'focusing' | 'focused' | 'entering' | 'room' | 'inspecting' | 'layout' | 'returning' | 'scrolling' | 'fallback' | 'viewing';
import {LANDMARKS,SPACES,spaceForBuilding,type SpaceObject} from './spaces';
export type RoomObject = SpaceObject;
export interface Experience { state: ExperienceState; building: number; selected: RoomObject | null; revision: number; view:'orbit'|'walk' }
export type ExperienceEvent = { type: 'READY' | 'REVEALED' | 'CAMERA_DONE' | 'ENTER' | 'CLEAR' | 'EDIT' | 'FINISH_EDIT' | 'RETURN' | 'SCROLL' | 'SCROLL_DONE' | 'FAIL' | 'RETRY' } | { type: 'FOCUS'; building: number } | { type: 'SELECT'; object: RoomObject } | {type:'VIEW';view:'orbit'|'walk'};
interface Capability { orbit: boolean; pickBuilding: boolean; enter: boolean; inspect: boolean; layout: boolean; navigation: boolean }
const caps = (orbit=false,pickBuilding=false,enter=false,inspect=false,layout=false,navigation=false): Capability => ({orbit,pickBuilding,enter,inspect,layout,navigation});
export const CAPABILITIES: Readonly<Record<ExperienceState, Capability>> = {
  viewing:caps(),loading:caps(),reveal:caps(),approach:caps(),orbit:caps(true,true,false,false,false,true),focusing:caps(),focused:caps(true,true,true,false,false,true),entering:caps(),room:caps(true,false,false,true,false,true),inspecting:caps(true,false,false,true,false,true),layout:caps(false,false,false,true,true,true),returning:caps(),scrolling:caps(),fallback:caps(false,false,false,true,true,true),
};
export const initialExperience: Experience = {state:'loading',building:0,selected:null,revision:0,view:'orbit'};
export function experienceMachine(current: Experience, event: ExperienceEvent): Experience {
  const transition=(state: ExperienceState,extra: Partial<Experience>={}): Experience=>({...current,...extra,state,revision:current.revision+1});
  if(event.type==='FAIL')return transition('fallback',{selected:null});
  if(event.type==='RETRY'&&current.state==='fallback')return transition('loading');
  if(event.type==='READY'&&current.state==='loading')return transition('reveal');
  if(event.type==='REVEALED'&&current.state==='reveal')return transition('approach');
  if(event.type==='CAMERA_DONE') {
    const next:Partial<Record<ExperienceState,ExperienceState>>={approach:'orbit',focusing:'focused',entering:'room',returning:'orbit',viewing:'room'};
    if(next[current.state])return transition(next[current.state] as ExperienceState);
  }
  if(event.type==='FOCUS'&&CAPABILITIES[current.state].pickBuilding&&LANDMARKS.some(id=>id===event.building))return transition('focusing',{building:event.building,selected:null});
  if(event.type==='ENTER'&&CAPABILITIES[current.state].enter)return transition('entering',{view:'orbit'});
  if(event.type==='VIEW'&&['room','inspecting'].includes(current.state)&&event.view!==current.view)return transition('viewing',{view:event.view,selected:null});
  if(event.type==='SELECT'&&CAPABILITIES[current.state].inspect&&SPACES[spaceForBuilding(current.building)].objects.includes(event.object))return transition(current.state==='layout'?'layout':current.state==='fallback'?'fallback':'inspecting',{selected:event.object});
  if(event.type==='CLEAR'&&CAPABILITIES[current.state].inspect)return transition(current.state==='layout'?'layout':current.state==='fallback'?'fallback':'room',{selected:null});
  if(event.type==='EDIT'&&current.view==='orbit'&&current.building===0&&['room','inspecting'].includes(current.state))return transition('layout',{selected:'sofa'});
  if(event.type==='FINISH_EDIT'&&current.state==='layout')return transition('room',{selected:null});
  if(event.type==='RETURN'&&CAPABILITIES[current.state].navigation&&current.state!=='fallback')return transition('returning',{selected:null});
  if(event.type==='SCROLL'&&current.state==='orbit')return transition('scrolling',{building:0,selected:null});
  if(event.type==='SCROLL_DONE'&&current.state==='scrolling')return transition('room');
  return current;
}
