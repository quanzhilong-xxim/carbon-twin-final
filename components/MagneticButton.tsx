'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useUIStore } from '@/lib/stores/UIStore';
export default function MagneticButton({ children, href, onClick }: { children: ReactNode; href: string; onClick?: () => void }) {
  const ref = useRef<HTMLAnchorElement>(null), reduced = useUIStore(s => s.reduced);
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20 }), sy = useSpring(y, { stiffness: 300, damping: 20 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!ref.current || reduced || e.pointerType === 'touch') { x.set(0); y.set(0); return; }
      const r = ref.current.getBoundingClientRect();
      const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
      const distance = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
      const near = distance < Math.max(r.width / 2, r.height / 2) + 60;
      const pull = near ? Math.min(18, distance * .14) : 0;
      x.set(Math.cos(angle) * pull); y.set(Math.sin(angle) * pull);
    }; const reset = () => { x.set(0); y.set(0); }; window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', reset); document.documentElement.addEventListener('pointerleave', reset);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('blur', reset); document.documentElement.removeEventListener('pointerleave', reset); };
  }, [reduced, x, y]);
  return <motion.a ref={ref} href={href} onClick={onClick} className="primary-button magnetic-button" style={{ x: sx, y: sy }}>{children}</motion.a>;
}
