import {test,expect} from '@playwright/test';
import * as THREE from 'three';
import {experienceMachine,initialExperience} from '@/lib/experience/ExperienceMachine';
import {SPACES,calculateSpace,defaultDevices} from '@/lib/experience/spaces';
import {defaultRoomEnergy} from '@/lib/experience/room';
import {storyLighting,type StoryTime} from '@/lib/visuals/storyLighting';
import {makeWaterfrontLandscape} from '@/lib/visuals/waterfrontLandscape';
import {makeFinancialSkyline} from '@/lib/visuals/financialSkyline';

test('GPU fallback can reach all operating ledgers without a camera completion',()=>{
  let state=experienceMachine(initialExperience,{type:'FAIL'});
  for(const space of Object.values(SPACES)) {
    state=experienceMachine(state,{type:'FALLBACK_SPACE',building:space.building});
    expect(state.state).toBe('fallback');expect(state.building).toBe(space.building);
    state=experienceMachine(state,{type:'SELECT',object:space.objects[0]});
    expect(state.selected).toBe(space.objects[0]);
    expect(experienceMachine(state,{type:'CAMERA_DONE'})).toBe(state);
  }
  expect(experienceMachine(state,{type:'FALLBACK_SPACE',building:24})).toBe(state);
  expect(experienceMachine(initialExperience,{type:'FALLBACK_SPACE',building:4})).toBe(initialExperience);
});

test('fallback switching preserves device settings and separates commercial electricity',()=>{
  const devices={...defaultDevices},before=JSON.stringify({energy:defaultRoomEnergy,devices});
  const office=calculateSpace('office',defaultRoomEnergy,devices),cafe=calculateSpace('cafe',defaultRoomEnergy,devices);
  expect(office.daily).toBeCloseTo(56.32,8);expect(cafe.daily).toBeCloseTo(3.083,8);
  const off=calculateSpace('office',defaultRoomEnergy,{...devices,server:false});
  expect(office.daily-off.daily).toBeCloseTo(36,8);
  expect(calculateSpace('cafe',defaultRoomEnergy,{...devices,server:false})).toEqual(cafe);
  expect(JSON.stringify({energy:defaultRoomEnergy,devices})).toBe(before);
});

test('four artistic times remain independent from electricity and weather axes',()=>{
  const expected=calculateSpace('home',defaultRoomEnergy,defaultDevices);
  for(const time of ['morning','evening','bluehour','night'] as StoryTime[]) {
    const light=storyLighting(time),rain=storyLighting(time,'rain');
    expect(rain.sunPower).toBeLessThan(light.sunPower);
    expect(calculateSpace('home',defaultRoomEnergy,defaultDevices)).toEqual(expected);
    // A caller cannot mutate the retained preset through a returned vector.
    light.sun[0]=1000;expect(storyLighting(time).sun[0]).not.toBe(1000);
  }
  expect(storyLighting('bluehour').sun[1]).toBeLessThan(0);
  expect(storyLighting('bluehour').windows).toBeGreaterThan(storyLighting('evening').windows);
  expect(storyLighting('bluehour').windows).toBeLessThan(storyLighting('night').windows);
});

function kit(){const group=new THREE.Group(),material=new THREE.MeshPhysicalMaterial({color:'#6f8781',transmission:.8});material.name='v12-glass';const mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);mesh.position.set(3,2,1);group.add(mesh);return {group,material,mesh};}
function inspect(group:THREE.Group,budget:number) {
  let triangles=0,draws=0;
  group.traverse(o=>{if(o instanceof THREE.Mesh){draws++;const positions=o.geometry.getAttribute('position');triangles+=(o.geometry.index?.count??positions.count)/3;expect([...positions.array].every(Number.isFinite)).toBe(true);}});
  expect(triangles).toBeGreaterThan(0);expect(triangles).toBeLessThan(budget);expect(draws).toBeLessThanOrEqual(8);
  return {triangles,draws};
}
test('landscape has bounded merged geometry and never mutates or disposes retained assets',()=>{
  const source=kit(),before=source.material.toJSON(),position=source.mesh.position.clone();let sourceDisposed=false;
  source.material.addEventListener('dispose',()=>{sourceDisposed=true;});
  const result=makeWaterfrontLandscape(source.group),stats=inspect(result.group,16000);
  expect(new THREE.Box3().setFromObject(result.group).max.y).toBeLessThan(3.5);
  result.dispose();expect(sourceDisposed).toBe(false);expect(source.material.toJSON()).toEqual(before);expect(source.mesh.position.equals(position)).toBe(true);
  console.log('LANDSCAPE_BUDGET',JSON.stringify(stats));source.mesh.geometry.dispose();source.material.dispose();
});
test('skyline retains source glass and releases both owned facade maps',()=>{
  const source=kit(),result=makeFinancialSkyline(source.group);inspect(result.group,130000);
  expect(source.material.transmission).toBe(.8);
  const glass=result.materials[0] as THREE.MeshStandardMaterial;let released=0;
  glass.map!.addEventListener('dispose',()=>{released++;});glass.roughnessMap!.addEventListener('dispose',()=>{released++;});
  result.disposeSurfaces();expect(released).toBe(2);
  result.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});result.materials.forEach(m=>m.dispose());source.mesh.geometry.dispose();source.material.dispose();
});
