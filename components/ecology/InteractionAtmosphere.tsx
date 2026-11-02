'use client';
import { useEffect, useRef } from 'react';
import { useUIStore } from '@/lib/stores/UIStore';
import { visualDynamics } from '@/lib/visualDynamics';
/** Velocity is a visual cue, never a carbon measurement. */
export default function InteractionAtmosphere() {
  const ref = useRef<HTMLDivElement>(null), reduced = useUIStore(s => s.reduced);
  useEffect(() => {
    if (reduced) return;
    let frame = 0, previous = { x: 0, y: 0, time: 0 }, lastInput = 0;
    const move = (e: PointerEvent) => { const time = performance.now(), dt = time - previous.time;
      if (dt > 0 && dt < 160) visualDynamics.velocity = Math.min(1, Math.hypot(e.clientX - previous.x,e.clientY - previous.y) / dt / 3);
      previous = { x: e.clientX, y: e.clientY, time };
    };
    const input = (e: Event) => { if (!(e.target instanceof HTMLInputElement) || e.target.type !== 'range') return;
      const now = performance.now(); visualDynamics.impulse = Math.min(1, .25 + 150 / Math.max(40, now - lastInput)); lastInput = now;
    };
    const loop = () => { visualDynamics.velocity *= .94; visualDynamics.impulse *= .965;
      const energy = Math.max(visualDynamics.velocity,visualDynamics.impulse);
      if (ref.current) { ref.current.style.setProperty('--speed', energy.toFixed(3)); ref.current.dataset.speed=energy.toFixed(2); }
      frame = requestAnimationFrame(loop);
    }; loop(); window.addEventListener('pointermove',move,{passive:true});document.addEventListener('input',input,{passive:true});
    return () => { cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);document.removeEventListener('input',input); };
  }, [reduced]);
  return <div ref={ref} className="interaction-atmosphere" aria-hidden="true"><i/><i/><i/></div>;
}
