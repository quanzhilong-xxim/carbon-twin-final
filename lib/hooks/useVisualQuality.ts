'use client';
import { useEffect } from 'react';
import { create } from 'zustand';
import { useUIStore } from '@/lib/stores/UIStore';
type Quality = 'checking' | 'full' | 'lite';
export const useQualityStore = create<{ quality: Quality; reason: string }>(() => ({ quality: 'checking', reason: '' }));
export function lowerVisualQuality(reason: string) { useQualityStore.setState({ quality: 'lite', reason }); }
export function useVisualQuality() {
  const quality = useQualityStore(s => s.quality), reduced = useUIStore(s => s.reduced);
  useEffect(() => {
    if (useQualityStore.getState().quality !== 'checking') return;
    const compact = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    const weak = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency < 4;
    useQualityStore.setState({ quality: compact || weak ? 'lite' : 'full', reason: compact ? '移动设备优先保留计算与对话' : weak ? '设备采用轻量渲染' : '' });
  }, []);
  return { quality, reduced, webgl: quality === 'full' && !reduced };
}
