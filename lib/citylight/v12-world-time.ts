/** Artistic solar study for this building, not an astronomical/site simulation.
 * Keep the established sunset (.35), blue hour (.65), and night (1) controls.
 * The same continuous lighting state drives the sky, facade and room lighting.
 */
export const V12_TIME_PRESETS = [
  {label:'清晨',time:0}, {label:'正午',time:.15},
  {label:'下午',time:.25}, {label:'夕阳',time:.35},
  {label:'蓝调',time:.65}, {label:'深夜',time:1},
] as const;

const KEYS = [
  {time:0, elevation:6, azimuth:-110, night:0, sun:2.1, exposure:1.05, kelvin:3800,skyEnergy:.75},
  {time:.15, elevation:67, azimuth:0, night:0, sun:3.4, exposure:.95, kelvin:5800,skyEnergy:.08},
  {time:.25, elevation:32, azimuth:45, night:0, sun:3.1, exposure:1, kelvin:5000,skyEnergy:.18},
  {time:.35, elevation:4.4, azimuth:100, night:0, sun:2.2, exposure:1.05, kelvin:3100,skyEnergy:1},
  {time:.65, elevation:-6, azimuth:112, night:.85, sun:0, exposure:1.1, kelvin:3100,skyEnergy:1},
  {time:1, elevation:-18, azimuth:150, night:1, sun:0, exposure:1.05, kelvin:3100,skyEnergy:1},
] as const;

export function v12WorldTime(value:number){
  const time=Math.max(0,Math.min(1,Number.isFinite(value)?value:.35));
  const i=Math.max(0,KEYS.findIndex((key,index)=>index<KEYS.length-1&&time<=KEYS[index+1].time));
  const a=KEYS[i],b=KEYS[i+1];
  const x=(time-a.time)/(b.time-a.time),t=x*x*(3-2*x);
  const mix=(from:number,to:number)=>from+(to-from)*t;
  return {time,elevation:mix(a.elevation,b.elevation),azimuth:mix(a.azimuth,b.azimuth),
    night:mix(a.night,b.night),sun:mix(a.sun,b.sun),exposure:mix(a.exposure,b.exposure),
    kelvin:mix(a.kelvin,b.kelvin),skyEnergy:mix(a.skyEnergy,b.skyEnergy)};
}
