'use client';
import { create } from 'zustand';
export type Identity = 'student' | 'business' | 'city';
export const THEMES = {
  student: { label: '学生', english: 'THE EXPLORER', orb: '#187E65', secondary: '#297DCD', accent: '#B6F98A', word: 'Curiosity.', focus: '从一段通勤，读懂一座城市。', description: '认识日常选择背后的碳足迹，让好奇心成为改变的起点。', number: '01', tags: ['日常碳足迹', '气候素养', '校园行动'] },
  business: { label: '企业主', english: 'THE BUILDER', orb: '#A37B22', secondary: '#735D36', accent: '#E2C16F', word: 'Responsibility.', focus: '从一条产线，理解整个价值链。', description: '建立核算边界，认识 Scope 1 / 2 / 3，让责任成为决策的一部分。', number: '02', tags: ['企业盘查', '能源效率', '价值链'] },
  city: { label: '城市管理者', english: 'THE PLANNER', orb: '#738F9F', secondary: '#3C627D', accent: '#C0D9E3', word: 'Possibility.', focus: '从一个街区，看见系统的联系。', description: '连接交通、建筑与能源，以系统视角理解城市减碳。', number: '03', tags: ['城市系统', '公共交通', '协同行动'] },
} as const;
export function applyIdentityTheme(identity: Identity) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement, theme = THEMES[identity];
  root.dataset.identity = identity;
  root.style.setProperty('--current-bg-orb', theme.orb);
  root.style.setProperty('--current-bg-secondary', theme.secondary);
  root.style.setProperty('--current-accent', theme.accent);
}
type CarbonState = {
  activeIdentity: Identity; activeSection: string; distance: number; plantDays: number; electricity: number;
  expandedKnowledge: string | null; chatOpen: boolean; draft: string; previewQuestion: string;
  setIdentity: (identity: Identity) => void; setSection: (section: string) => void;
  setSlider: (key: 'distance' | 'plantDays' | 'electricity', value: number) => void;
  setKnowledge: (id: string | null) => void; setChatOpen: (open: boolean) => void;
  setDraft: (value: string) => void; previewAnswer: () => void;
};
export const useCarbonStore = create<CarbonState>((set, get) => ({
  activeIdentity: 'student', activeSection: 'home', distance: 12, plantDays: 3, electricity: 6,
  expandedKnowledge: null, chatOpen: false, draft: '', previewQuestion: '',
  setIdentity: (identity) => { applyIdentityTheme(identity); set({ activeIdentity: identity }); },
  setSection: (activeSection) => set({ activeSection }), setSlider: (key, value) => set({ [key]: value }),
  setKnowledge: (expandedKnowledge) => set({ expandedKnowledge }), setChatOpen: (chatOpen) => set({ chatOpen }),
  setDraft: (draft) => set({ draft }), previewAnswer: () => { if (get().draft.trim()) set({ previewQuestion: get().draft.trim(), draft: '' }); },
}));
