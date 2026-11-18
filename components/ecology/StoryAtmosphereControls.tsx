'use client';
import { useStoryAtmosphere } from '@/lib/stores/StoryAtmosphere';
export default function StoryAtmosphereControls() {
  const { weather, time, setWeather, setTime } = useStoryAtmosphere();
  return <div className="behaviour-weather">
    <fieldset><legend>天气 · 全故事同步</legend>{([['clear', '晴天'], ['breeze', '微风'], ['rain', '小雨']] as const).map(([id, label]) => <button key={id} aria-pressed={weather === id} onClick={() => setWeather(id)}>{label}</button>)}</fieldset>
    <fieldset><legend>时间 · 不改变季节</legend>{([['morning', '清晨'], ['evening', '日落'], ['bluehour', '蓝调时刻'], ['night', '夜晚']] as const).map(([id, label]) => <button key={id} aria-pressed={time === id} onClick={() => setTime(id)}>{label}</button>)}</fieldset>
  </div>;
}
