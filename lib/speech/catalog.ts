export const TTS_VOICES = [
  { id: 'zh_female_vv_uranus_bigtts', name: 'Vivi 2.0 · 日常交流' },
  { id: 'zh_female_xiaohe_uranus_bigtts', name: '小何 2.0 · 清晰女声' },
  { id: 'zh_male_m191_uranus_bigtts', name: '云舟 2.0 · 沉稳男声' },
] as const;
export const TTS_MAX_TEXT = 2500;
export const TTS_SAMPLE_RATE = 24000;
export type SpeechMode = 'auto' | 'doubao' | 'browser';
