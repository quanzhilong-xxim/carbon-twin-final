'use client';
import { useEffect, useMemo, useRef } from 'react';
import { createDustData, smooth, storyTarget, type DustBlock } from '@/lib/visuals/cityDust';
import { visualDynamics } from '@/lib/visualDynamics';
import { useUIStore } from '@/lib/stores/UIStore';

/** An explicitly labelled 2D fallback, sharing the particle targets with the real WebGL scene. */
export default function CityDustFallback({ blocks, manual, progress, onProgress, time }: {
  blocks: readonly DustBlock[]; manual: boolean; progress: number; onProgress: (p: number) => void; time: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null), state = useRef({ manual, progress, time, onProgress });
  state.current = { manual, progress, time, onProgress };
  const reduced = useUIStore(s => s.reduced), data = useMemo(() => createDustData(blocks), [blocks]);
  const current = useRef(0), redraw = useRef<() => void>();
  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.p[2] - b.p[2]), [blocks]);
  useEffect(() => {
    const el = canvas.current, context = el?.getContext('2d');
    if (!el || !context) return;
    let frame = 0, visible = true, last = 0, elapsed = 0, reported = -1, frames = 0;
    const render = (now: number) => {
      frame = 0;
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      if (document.hidden || !visible) return;
      const { manual, progress, time, onProgress } = state.current;
      const target = storyTarget(manual, progress, reduced, visualDynamics.scroll);
      current.current = reduced ? target : current.current + (target - current.current) * (1 - Math.exp(-7 * dt));
      if (Math.abs(current.current - target) < .0005) current.current = target;
      const p = current.current; elapsed += reduced ? 0 : dt;
      const w = el.clientWidth, h = el.clientHeight, dpr = Math.min(1.5, devicePixelRatio || 1);
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
      context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, w, h);
      const scale = Math.min(w / 170, h / 110);
      const project = (x: number, y: number, z: number) => [w * .5 + (x * .86 - z * .45 - 12) * scale, h * .62 + (x * .21 + z * .26 - y * .94 + 10) * scale];
      const stream = smooth(.06, .36, p), gather = smooth(.32, .69, p);
      context.globalAlpha = 1 - smooth(.74, .98, p);
      for (let i = 0; p < .98 && i < Math.min(data.count, 1050); i++) {
        const seed = data.seeds[i]; if (seed > .5 + p * .7) continue;
        const point: number[] = [];
        for (let axis = 0; axis < 3; axis++) { const j = i * 3 + axis, drift = Math.sin(elapsed * .18 + seed * 19 + axis) * 1.3;
          const source = data.dust[j] + drift, flow = source + (data.flow[j] - source) * stream;
          point.push(flow + (data.target[j] - flow) * gather);
        }
        const [x, y] = project(point[0], point[1], point[2]);
        context.fillStyle = seed > .87 ? '#d4bc87' : '#9bd5b2'; context.fillRect(x, y, 1 + seed, 1 + seed);
      }
      const palette = time === 'morning' ? ['#658473','#486c5b','#b3bc95'] : time === 'day' ? ['#75998b','#4e7c6d','#a1c4af'] : time === 'dusk' ? ['#9a8565','#66705a','#d8ba86'] : ['#244539','#183b33','#65888e'];
      context.globalAlpha = smooth(.55, .92, p);
      for (const b of sortedBlocks) {
        const [x, , z] = b.p, [bw, bh, bd] = b.s, height = bh * smooth(.5, .94, p);
        const corners = [[x-bw/2, z-bd/2], [x+bw/2, z-bd/2], [x+bw/2, z+bd/2], [x-bw/2, z+bd/2]];
        const bottom = corners.map(([a, c]) => project(a, 0, c)), top = corners.map(([a, c]) => project(a, height, c));
        const face = (points: number[][], color: string) => { context.beginPath(); points.forEach(([a, c], i) => i ? context.lineTo(a, c) : context.moveTo(a, c)); context.closePath(); context.fillStyle = color; context.fill(); context.strokeStyle = '#b6d7ba30'; context.stroke(); };
        face([bottom[1], bottom[2], top[2], top[1]], palette[0]);
        face([bottom[2], bottom[3], top[3], top[2]], palette[1]);
        face(top, palette[2]);
      }
      context.globalAlpha = 1;
      el.dataset.cityProgress = p.toFixed(3); el.dataset.cityPointCount = String(Math.min(data.count, 1050));
      el.dataset.rendered = 'true'; el.dataset.renderer = 'Canvas2D / labelled fallback'; el.dataset.cityFrame = String(++frames); el.dataset.cityTime = time;
      const rounded = Math.round(p * 100) / 100; if (rounded !== reported) { reported = rounded; onProgress(rounded); }
      // A manually completed 2D scene contains no moving objects; sleep until a control changes.
      if (!reduced && !(manual && p === 1 && target === 1)) frame = requestAnimationFrame(render);
    };
    const wake = () => { cancelAnimationFrame(frame); last = 0; if (!document.hidden && visible) frame = requestAnimationFrame(render); };
    redraw.current = wake;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); }); observer.observe(el);
    const resize = new ResizeObserver(wake); resize.observe(el);
    document.addEventListener('visibilitychange', wake); wake();
    return () => { redraw.current = undefined; cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); document.removeEventListener('visibilitychange', wake); };
  }, [sortedBlocks, data, reduced]);
  // Controls also wake the idle, completed fallback without a permanent polling loop.
  useEffect(() => { redraw.current?.(); }, [manual, progress, time, reduced]);
  return <div className="dust-lite"><canvas ref={canvas} role="img" aria-label="粒子汇聚成街区的二维轻量示意" /><span>{reduced ? '减少动态效果 · 静态二维示意' : '轻量二维示意 · 非实时三维'}</span></div>;
}
