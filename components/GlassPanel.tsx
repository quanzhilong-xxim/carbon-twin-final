'use client';
import type { ReactNode } from 'react';
import GlassSurface from './GlassSurface';
export default function GlassPanel({ children, className = '', display = 'block' }: { children: ReactNode; className?: string; display?: 'block' | 'grid' }) {
  return <GlassSurface className={className} display={display} tilt={false}>{children}</GlassSurface>;
}
