import { create } from 'zustand';
import type {StoryTime, StoryWeather} from '@/lib/visuals/storyLighting';
export type {StoryTime, StoryWeather} from '@/lib/visuals/storyLighting';

/** Weather, time and botanical season are independent axes. No emissions input
 * is changed by an artistic atmosphere control. Shared by the story views. */
export const useStoryAtmosphere = create<{
  weather: StoryWeather; time: StoryTime;
  setWeather: (weather: StoryWeather) => void;
  setTime: (time: StoryTime) => void;
}>(set => ({ weather: 'breeze', time: 'evening', setWeather: weather => set({ weather }), setTime: time => set({ time }) }));
