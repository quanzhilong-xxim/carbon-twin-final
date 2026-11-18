'use client';

import { create } from 'zustand';
import { TRY_ON_GARMENTS } from '@/lib/tryon/garments';

type TryOnSelection = {
  activeGarmentIndex: number;
  source: string;
  selectGarment: (index: number, source?: string) => void;
};

export const useTryOnStore = create<TryOnSelection>((set) => ({
  activeGarmentIndex: 0,
  source: '手动选择',
  selectGarment: (activeGarmentIndex, source = '手动选择') => {
    if (!Number.isInteger(activeGarmentIndex) || !TRY_ON_GARMENTS[activeGarmentIndex]) return;
    set({ activeGarmentIndex, source });
  },
}));
