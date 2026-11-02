'use client';
import { motion, useMotionValue, useSpring, useReducedMotion, type MotionStyle, type MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';
export default function TiltCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const x = useMotionValue(0), y = useMotionValue(0), px = useMotionValue('50%'), py = useMotionValue('50%');
  const rotateX = useSpring(x, { stiffness: 220, damping: 24 }), rotateY = useSpring(y, { stiffness: 220, damping: 24 });
  const reduced = useReducedMotion();
  const style: MotionStyle & { '--pointer-x': MotionValue<string>; '--pointer-y': MotionValue<string> } = { rotateX, rotateY, transformPerspective: 900, '--pointer-x': px, '--pointer-y': py };
  return <motion.div className={`tilt-card ${className}`} style={style} onPointerMove={event => { if (reduced || event.pointerType === 'touch') return; const bounds = event.currentTarget.getBoundingClientRect(), dx = (event.clientX - bounds.left) / bounds.width, dy = (event.clientY - bounds.top) / bounds.height; x.set((.5 - dy) * 6); y.set((dx - .5) * 6); px.set(`${dx * 100}%`); py.set(`${dy * 100}%`); }} onPointerLeave={() => { x.set(0); y.set(0); }}>{children}</motion.div>;
}
