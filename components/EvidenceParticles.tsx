'use client';
import { useEffect, useRef } from 'react';
import { useUIStore } from '@/lib/stores/UIStore';

type Particle = { x: number; y: number; fromX: number; fromY: number; depth: number; delay: number; size: number };

/** Decorative particles sample each real concept diagram. They encode no data. */
export default function EvidenceParticles({ id, disabled }: { id: string; disabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), reduced = useUIStore(s => s.reduced);
  useEffect(() => {
    const canvas = ref.current, visual = canvas?.parentElement;
    const card = visual?.closest('.archive-entry'), svg = visual?.querySelector('svg');
    if (!canvas || !visual || !card || !svg) return;
    const compact = matchMedia('(pointer: coarse), (max-width: 760px)');
    const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const weak = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
    let ctx: CanvasRenderingContext2D | null = null, points: Particle[] | undefined;
    let frame = 0, started = 0, last = 0, visible = false, active = false, disposed = false, staticMode = true;

    const stop = () => {
      cancelAnimationFrame(frame); frame = 0;
      if (!active) return;
      active = false; delete visual.dataset.particleActive;
    };
    const refreshMode = () => {
      staticMode = disabled || reduced || systemMotion.matches || compact.matches || weak;
      visual.dataset.particleMode = staticMode ? 'static' : 'interactive';
      if (staticMode) {
        stop();
        // No full-size backing store for paused, compact or reduced-motion cards.
        canvas.width = 0; canvas.height = 0; ctx = null;
      }
    };
    const prepare = () => {
      if (!points) {
        // Offscreen cards use content-visibility. Wait until interaction with a
        // visible card before asking the SVG for its actual geometry matrices.
        const matrix = svg.getCTM();
        if (!matrix || !Number.isFinite(matrix.a) || Math.abs(matrix.a * matrix.d - matrix.b * matrix.c) < 1e-9) return false;
        const inverse = matrix.inverse(), sampled: Particle[] = [];
        let seed = Array.from(id).reduce((s, c) => (Math.imul(s, 31) + c.charCodeAt(0)) >>> 0, 17);
        const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
        for (const element of Array.from(svg.querySelectorAll<SVGGeometryElement>('path,rect,circle,ellipse,line,polyline,polygon'))) {
          const transform = element.getCTM(); if (!transform) continue;
          try {
            const length = element.getTotalLength(), local = inverse.multiply(transform);
            for (let at = 0; at < length && sampled.length < 850; at += 3.2) {
              const p = element.getPointAtLength(at).matrixTransform(local);
              if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
                // Three coherent sheets resolve onto the actual diagram plane.
                // Depth and horizontal position control the reveal; no random cloud.
                const layer = sampled.length % 3, phase = p.x / 320 * Math.PI * 1.4;
                sampled.push({ x: p.x, y: p.y,
                  fromX: 34 + p.x * .72 + layer * 12,
                  fromY: 76 + Math.sin(phase + layer * .65) * 30 + (p.y - 76) * .3,
                  depth: 45 + layer * 62 + rand() * 16,
                  delay: .04 + layer * .055 + p.x / 320 * .15,
                  size: .4 + rand() * .5 });
              }
            }
          } catch { /* Unsupported SVG primitives keep their vector representation. */ }
        }
        if (!sampled.length) return false;
        points = sampled; canvas.dataset.particleCount = String(points.length);
      }
      if (!ctx) {
        const dpr = Math.min(devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(640 * dpr); canvas.height = Math.round(304 * dpr);
        ctx = canvas.getContext('2d');
        if (!ctx) return false;
        ctx.setTransform(canvas.width / 320, 0, 0, canvas.height / 152, 0, 0);
      }
      return true;
    };
    const draw = (progress: number) => {
      if (!ctx || !points) return;
      ctx.clearRect(0, 0, 320, 152);
      for (let i = 0; i < points.length; i++) {
        const p = points[i], t = Math.max(0, Math.min(1, (progress - p.delay) / (1 - p.delay)));
        const eased = 1 - (1 - t) ** 3, depth = p.depth * (1 - eased), perspective = 260 / (260 + depth);
        const planeX = p.fromX + (p.x - p.fromX) * eased, planeY = p.fromY + (p.y - p.fromY) * eased;
        const x = 160 + (planeX - 160) * perspective, y = 76 + (planeY - 76) * perspective;
        ctx.fillStyle = i % 7 === 0 ? '#e6d7ac' : i % 3 === 0 ? '#8ec7bb' : '#c3d9a8';
        ctx.globalAlpha = (.2 + .65 * eased) * perspective;
        if (i % 6 === 0 && t > 0 && t < .9) {
          ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .35;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (p.x - p.fromX) * .035 * (1 - eased), y - (p.y - p.fromY) * .035 * (1 - eased)); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(x, y, p.size * perspective, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; canvas.dataset.particleProgress = progress.toFixed(3);
    };
    const tick = (now: number) => {
      if (disposed || !visible || document.hidden || staticMode) { stop(); return; }
      if (!started) started = now;
      if (now - last >= 40) { last = now; draw(Math.min(1, (now - started) / 2200)); }
      if (now - started < 2200) frame = requestAnimationFrame(tick);
      else { draw(1); stop(); }
    };
    const begin = () => {
      if (staticMode || !visible || document.hidden || !prepare()) return;
      window.dispatchEvent(new CustomEvent('carbon-archive-particles', { detail: id }));
      cancelAnimationFrame(frame); started = 0; last = 0; active = true;
      draw(0); visual.dataset.particleActive = 'true'; frame = requestAnimationFrame(tick);
    };
    const focusedWithin = () => Boolean(document.activeElement && card.contains(document.activeElement));
    const enterFocus = (event: Event) => {
      // Moving between links in the same card does not reset the formation.
      const previous = (event as FocusEvent).relatedTarget;
      if (!(previous instanceof Node && card.contains(previous))) begin();
    };
    const leaveFocus = (event: Event) => {
      const next = (event as FocusEvent).relatedTarget;
      if (!(next instanceof Node && card.contains(next)) && !card.matches(':hover')) stop();
    };
    const leavePointer = () => { if (!focusedWithin()) stop(); };
    const coordinate = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) stop(); };
    const visibility = () => { if (document.hidden) stop(); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) { stop(); canvas.width = 0; canvas.height = 0; ctx = null; }
      else if (focusedWithin() || card.matches(':hover')) begin();
    }, { threshold: .15 });
    refreshMode(); observer.observe(visual);
    compact.addEventListener('change', refreshMode); systemMotion.addEventListener('change', refreshMode);
    card.addEventListener('mouseenter', begin); card.addEventListener('mouseleave', leavePointer);
    card.addEventListener('focusin', enterFocus); card.addEventListener('focusout', leaveFocus);
    window.addEventListener('carbon-archive-particles', coordinate); document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true; stop(); observer.disconnect();
      compact.removeEventListener('change', refreshMode); systemMotion.removeEventListener('change', refreshMode);
      card.removeEventListener('mouseenter', begin); card.removeEventListener('mouseleave', leavePointer);
      card.removeEventListener('focusin', enterFocus); card.removeEventListener('focusout', leaveFocus);
      window.removeEventListener('carbon-archive-particles', coordinate); document.removeEventListener('visibilitychange', visibility);
      delete visual.dataset.particleActive;
    };
  }, [id, disabled, reduced]);
  return <canvas ref={ref} width={0} height={0} className="evidence-particle-field" aria-hidden="true" />;
}
