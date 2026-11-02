'use client';
import { useEffect } from 'react';
import { useCarbonStore, THEMES } from '@/lib/store';
import { useUIStore } from '@/lib/stores/UIStore';

export default function ThemeBridge() {
  const identity = useCarbonStore(s => s.activeIdentity);
  const preference = useUIStore(s => s.motionPreference);
  const emotion = useUIStore(s => s.emotion);
  useEffect(() => {
    try {
    const stored = localStorage.getItem('carbontwin-identity');
    if (stored === 'student' || stored === 'business' || stored === 'city') useCarbonStore.getState().setIdentity(stored);
    const motion = localStorage.getItem('carbontwin-motion');
    if (motion === 'reduce' || motion === 'full') useUIStore.setState({ motionPreference: motion });
    } catch { /* Optional storage must not prevent the experience from mounting. */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem('carbontwin-identity', identity); } catch { /* Optional persistence. */ }
    const theme = THEMES[identity], root = document.documentElement;
    const danger = emotion === 'danger';
    root.style.setProperty('--current-bg-orb', danger ? '#9F243E' : emotion === 'safe' ? '#167E69' : theme.orb);
    root.style.setProperty('--current-bg-secondary', danger ? '#6D1839' : theme.secondary);
    const accent = danger ? '#FF869C' : emotion === 'safe' ? '#9BF3C1' : theme.accent;
    root.style.setProperty('--current-accent', accent);
    root.style.setProperty('--theme-accent', accent);
    root.dataset.danger = String(danger);
    root.dataset.identity = identity;
  }, [identity, emotion]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { const reduced = preference === 'reduce' || (preference === 'system' && media.matches); useUIStore.setState({ reduced }); document.documentElement.dataset.reducedMotion = String(reduced); };
    sync(); media.addEventListener('change', sync);
    try { localStorage.setItem('carbontwin-motion', preference); } catch { /* Optional persistence. */ }
    return () => media.removeEventListener('change', sync);
  }, [preference]);
  return null;
}
