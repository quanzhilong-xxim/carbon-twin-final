'use client';

import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { useUIStore } from '@/lib/stores/UIStore';

type Props = { children: ReactNode; className?: string; contentClassName?: string; tilt?: boolean; display?: 'block' | 'grid' };

/** Three optical layers keep displacement filters off the readable content. */
export default function GlassSurface({ children, className = '', contentClassName = '', tilt = true, display = 'block' }: Props) {
  const root = useRef<HTMLDivElement>(null), frame = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const systemReduced = useReducedMotion();
  const reduced = useUIStore(s => s.reduced) || systemReduced;
  const rx = useMotionValue(0), ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 300, damping: 30 });
  const rotateY = useSpring(ry, { stiffness: 300, damping: 30 });
  useEffect(() => { if (reduced) { rx.jump(0); ry.jump(0); rotateX.jump(0); rotateY.jump(0); } }, [reduced, rx, ry, rotateX, rotateY]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const update = () => {
    frame.current = 0;
    const element = root.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(bounds.width, pointer.current.x - bounds.left));
    const y = Math.max(0, Math.min(bounds.height, pointer.current.y - bounds.top));
    element.style.setProperty('--x', `${x}px`);
    element.style.setProperty('--y', `${y}px`);
    element.style.setProperty('--mouse-x', `${x}px`);
    element.style.setProperty('--mouse-y', `${y}px`);
    element.style.setProperty('--shadow-x', `${(0.5 - x / bounds.width) * 18}px`);
    element.style.setProperty('--shadow-y', `${(0.5 - y / bounds.height) * 18 + 12}px`);
    if (tilt && !reduced) { rx.set((.5 - y / bounds.height) * 10); ry.set((x / bounds.width - .5) * 10); }
  };
  return (
    <motion.div ref={root} className={`glass-surface ${className}`}
      style={tilt ? { rotateX, rotateY, transformPerspective: 1200 } : undefined}
      onPointerMove={event => {
        if (event.pointerType === 'touch') return;
        pointer.current = { x: event.clientX, y: event.clientY };
        if (!frame.current) frame.current = requestAnimationFrame(update);
      }}
      onPointerLeave={() => { cancelAnimationFrame(frame.current); frame.current = 0; rx.set(0); ry.set(0); }}>
      <div className="glass-blur" aria-hidden="true" />
      <div className="glass-optical-layer" aria-hidden="true">
        {/* Keep optical decoration independent of measured, transformed bounds.
            A resize-driven lens here fed WebKit's layout observer during tilt. */}
        <div className="glass-refraction" />
      </div>
      <div className={`glass-content ${contentClassName}`} style={{ display }}>{children}</div>
    </motion.div>
  );
}
