'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useUIStore } from '@/lib/stores/UIStore';
export default function AnimatedNumber({ value, digits = 2 }: { value: number; digits?: number }) {
  const element = useRef<HTMLSpanElement>(null), current = useRef({ value });
  const reduced = useUIStore(s => s.reduced);
  useEffect(() => {
    const animation = gsap.to(current.current, { value, duration: reduced ? 0 : .8, ease: 'power3.out', onUpdate: () => { if (element.current) element.current.textContent = current.current.value.toFixed(digits); } });
    return () => { animation.kill(); };
  }, [value, digits, reduced]);
  return <span ref={element} className="shiny-number">{value.toFixed(digits)}</span>;
}
