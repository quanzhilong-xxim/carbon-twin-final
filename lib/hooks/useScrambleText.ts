'use client';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/lib/stores/UIStore';
export function useScrambleText(text: string, delay: number) {
  const [output, setOutput] = useState(text), reduced = useUIStore(s => s.reduced);
  useEffect(() => {
    if (reduced) { setOutput(text); return; }
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      const began = performance.now();
      const decode = () => { const progress = Math.min(1, (performance.now() - began) / 800);
        setOutput(text.split('').map((letter, index) => letter === ' ' || index < progress * text.length ? letter : '@#!$%^&*01ABCDEF'[Math.floor(Math.random() * 15)]).join(''));
        if (progress >= 1) clearInterval(timer);
      }; decode(); timer = setInterval(decode, 30);
    }, delay);
    const finish = setTimeout(() => { clearInterval(timer); setOutput(text); }, delay + 800);
    return () => { clearTimeout(start); clearTimeout(finish); clearInterval(timer); };
  }, [text, delay, reduced]); return output;
}
