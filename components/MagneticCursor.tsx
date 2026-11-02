'use client';
import { useEffect, useRef } from 'react';
import { useUIStore } from '@/lib/stores/UIStore';
export default function MagneticCursor() {
  const dot = useRef<HTMLDivElement>(null), ring = useRef<HTMLDivElement>(null);
  const reduced = useUIStore(s => s.reduced);
  useEffect(() => {
    const media = matchMedia('(pointer: fine)'); let frame = 0;
    const point = { x: -100, y: -100, rx: -100, ry: -100, hovered: false };
    const sync = () => { document.body.classList.toggle('custom-cursor', media.matches && !reduced); };
    const animate = () => {
      point.rx += (point.x - point.rx) * .15; point.ry += (point.y - point.ry) * .15;
      if (ring.current) ring.current.style.transform = `translate3d(${point.rx - 16}px,${point.ry - 16}px,0) scale(${point.hovered ? 1.5 : 1})`;
      frame = requestAnimationFrame(animate);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !media.matches || reduced) return;
      point.x = event.clientX; point.y = event.clientY;
      point.hovered = event.target instanceof Element && !!event.target.closest('button,a,input,[role="button"],.city-stat');
      if (dot.current) { dot.current.style.transform = `translate3d(${point.x - 4}px,${point.y - 4}px,0)`; dot.current.style.opacity = '1'; }
      if (ring.current) { ring.current.style.opacity = '1'; ring.current.classList.toggle('is-hovered', point.hovered); }
      if (!frame) frame = requestAnimationFrame(animate);
    };
    const leave = () => { cancelAnimationFrame(frame); frame = 0; if (dot.current) dot.current.style.opacity = '0'; if (ring.current) ring.current.style.opacity = '0'; };
    sync(); media.addEventListener('change', sync); window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave); window.addEventListener('blur', leave);
    return () => { leave(); media.removeEventListener('change', sync); window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', leave); window.removeEventListener('blur', leave); document.body.classList.remove('custom-cursor'); };
  }, [reduced]);
  return <><div ref={ring} className="cursor-ring" aria-hidden="true" /><div ref={dot} className="cursor-dot" aria-hidden="true" /></>;
}
