const fs=require('node:fs'),path=require('node:path');
const edit=(file,from,to)=>{const p=path.join(__dirname,'..',file),s=fs.readFileSync(p,'utf8');if(!s.includes(from))throw Error('Expected source missing: '+file);fs.writeFileSync(p,s.replaceAll(from,to));};
edit('components/3d/CityLife.tsx','i<57','i<CITY_BUILDING_COUNT');
edit('components/3d/CityLife.tsx','row=i%7','row=i%3');
edit('components/3d/TwinAssets.tsx','export function CityBuildings({preview=false}:{preview?:boolean})','export function CityBuildings(_props:{preview?:boolean})');
edit('components/3d/TwinAssets.tsx','i<96','i<48');
edit('components/3d/TwinAssets.tsx','undefined,undefined,96','undefined,undefined,48');
