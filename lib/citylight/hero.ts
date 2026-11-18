export type HeroView = 'front'|'rear'|'left'|'right'|'roof'|'entry'|'night'|'window';
export type Pose = {position:[number,number,number];target:[number,number,number]};
export const LIGHT_TOWER = {
  id:'CL-T01',name:'光之塔',uri:'/models/citylight/light-tower-v2.glb',
  position:[0,0,0] as const,sizeMeters:[46,133.8,37] as const,status:'candidate-unapproved',
  source:'scripts/build-citylight.py',storyIds:['light-falls','window-stories'],
};
export const HERO_VIEWS:Record<HeroView,{label:string;pose:Pose}> = {
  front:{label:'正面 45°',pose:{position:[108,82,174],target:[0,65,0]}},
  rear:{label:'背面 45°',pose:{position:[-108,82,-174],target:[0,65,0]}},
  left:{label:'左侧',pose:{position:[-195,76,5],target:[0,65,0]}},
  right:{label:'右侧',pose:{position:[195,76,5],target:[0,65,0]}},
  roof:{label:'屋顶斜俯视',pose:{position:[37,156,54],target:[0,122,0]}},
  entry:{label:'人眼入口',pose:{position:[7,1.7,30],target:[0,3.2,11]}},
  night:{label:'夜景中距离',pose:{position:[90,73,156],target:[0,65,0]}},
  window:{label:'窗内空间',pose:{position:[5,20,20],target:[0,19.8,5]}},
};
export function clampWorldTime(time:number){return Number.isFinite(time)?Math.max(0,Math.min(1,time)):.55;}
