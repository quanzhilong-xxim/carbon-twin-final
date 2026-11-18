/** Artistic lighting presets only. They never supply or modify emission factors. */
export type StoryTime = 'morning' | 'evening' | 'bluehour' | 'night';
export type StoryWeather = 'clear' | 'breeze' | 'rain';

type Lighting = {
  sun: [number, number, number];
  sunColor: string; sunPower: number; fill: number;
  zenith: string; horizon: string; glow: string; halo: number;
  fog: string; windows: number; environment: number; interior: number;
};

const PRESETS: Record<StoryTime, Lighting> = {
  morning: {sun: [-3, 7, 4], sunColor: '#fff1db', sunPower: 2.4, fill: 1.05, zenith: '#456f91', horizon: '#c4d3cf', glow: '#f4d4ac', halo: .35, fog: '#b4cbd0', windows: .035, environment: .8, interior: 4},
  evening: {sun: [-7, 1.4, -5], sunColor: '#ffd0a0', sunPower: 2.15, fill: .85, zenith: '#354b70', horizon: '#d39e7e', glow: '#f4bc8f', halo: .8, fog: '#c8a992', windows: .18, environment: .7, interior: 2},
  bluehour: {sun: [-7, -.7, -5], sunColor: '#a9c6ed', sunPower: .14, fill: .7, zenith: '#152e55', horizon: '#637a9d', glow: '#d4acc1', halo: .12, fog: '#536e88', windows: .8, environment: .38, interior: .8},
  night: {sun: [-6, -2, -8], sunColor: '#b9d5f0', sunPower: .25, fill: .6, zenith: '#071421', horizon: '#213e50', glow: '#7da7bf', halo: .05, fog: '#243e51', windows: 1.3, environment: .65, interior: .25},
};

export function storyLighting(time: StoryTime, weather: StoryWeather = 'clear'): Lighting {
  const preset = PRESETS[time];
  if (weather !== 'rain') return {...preset, sun: [...preset.sun]};
  const dark = time === 'night' || time === 'bluehour';
  return {...preset, sun: [...preset.sun], sunPower: preset.sunPower * .34,
    zenith: dark ? preset.zenith : '#536a76', horizon: dark ? preset.horizon : '#b3c0be',
    fog: dark ? preset.fog : '#91a6aa', halo: preset.halo * .2, interior: preset.interior * .55};
}
