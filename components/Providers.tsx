'use client';
import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { SimulatorProvider } from '@/lib/core/SimulatorEngine';
import { useUIStore } from '@/lib/stores/UIStore';
import ThemeBridge from './ThemeBridge';
function MotionBoundary({ children }: { children: ReactNode }) {
  const reduced = useUIStore(s => s.reduced);
  useEffect(() => { document.documentElement.dataset.motionReady = 'true'; }, []);
  return <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionConfig>;
}
export default function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider session={null} refetchOnWindowFocus={false}><SimulatorProvider><ThemeBridge /><MotionBoundary>{children}</MotionBoundary></SimulatorProvider></SessionProvider>;
}
