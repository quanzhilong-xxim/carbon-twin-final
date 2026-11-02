'use client';
import { useEffect, useRef } from 'react';
import { useVisualQuality } from '@/lib/hooks/useVisualQuality';
const hash = (n: number) => { const s = Math.sin(n * 127.13 + 49.71) * 43758.54; return s - Math.floor(s); };
/** Original deterministic vector botany, rendered with the Canvas API. */
export default function BotanicalCanvas({ vitality, compact = false, active = true }: { vitality: number; compact?: boolean; active?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), target = useRef(vitality);
  const { quality, reduced } = useVisualQuality();
  target.current = vitality;
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    let frame = 0, time = 0, last = 0, visible = true, live = vitality;
    let width = 600, height = 480; const pointer = { x: 0, y: 0 };
    const resize = () => { const r = canvas.getBoundingClientRect(); width = r.width; height = r.height; const dpr = Math.min(devicePixelRatio, quality === 'lite' ? 1 : 1.5); canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const size = new ResizeObserver(resize); size.observe(canvas); resize();
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); observer.observe(canvas);
    const move = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); pointer.x = (e.clientX - r.left) / r.width - .5; pointer.y = (e.clientY - r.top) / r.height - .5; };
    canvas.addEventListener('pointermove', move, { passive: true });
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden || (last && now-last < (quality === 'lite' ? 65 : 30))) return;
      const dt = Math.min(.08, (now-last)/1000 || .016); last = now; if (!reduced && active) time += dt;
      live += (target.current-live) * (reduced ? 1 : .065);
      canvas.dataset.vitality = live.toFixed(2);
      ctx.clearRect(0,0,width,height);
      const scale = Math.min(width/600,height/480), cx = width*.5, floor = height*.87;
      const glow = ctx.createRadialGradient(cx,height*.45,0,cx,height*.45,width*.55);
      glow.addColorStop(0, `rgba(${live < .2 ? '170,62,46' : '81,195,126'},${compact ? .15 : .12})`); glow.addColorStop(1,'rgba(5,11,20,0)');
      ctx.fillStyle=glow; ctx.fillRect(0,0,width,height);
      ctx.save(); ctx.translate(cx,floor); ctx.scale(scale,scale);
      ctx.strokeStyle='#779c86'; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(0,6,170,18,0,0,Math.PI*2); ctx.stroke();
      const branch = (x: number,y: number,length: number,angle: number,depth: number,seed: number) => {
        const sway = Math.sin(time*.8+depth+seed)*(.018+(1-live)*.025)+pointer.x*.04;
        const a = angle+sway, ex=x+Math.cos(a)*length, ey=y+Math.sin(a)*length;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+Math.cos(a+.12)*length*.55,y+Math.sin(a+.12)*length*.55,ex,ey);
        ctx.strokeStyle=depth>3?'#6b735b':'#b5bd89'; ctx.lineWidth=Math.max(1,depth*1.1); ctx.lineCap='round'; ctx.stroke();
        if (depth>0) { branch(ex,ey,length*.73,a-.45,depth-1,seed+1); branch(ex,ey,length*.72,a+.48,depth-1,seed+7); }
        if (depth<=2) {
          const growth = Math.max(0,Math.min(1,(live-hash(seed)*.38)*2));
          const leafX=ex, leafY=ey;
          if (growth>.02) {
            ctx.save(); ctx.translate(leafX,leafY); ctx.rotate(a+.6+Math.sin(time+seed)*.12);
            ctx.fillStyle=live<.22?'#9c5c35':hash(seed)>.5?'#9ada88':'#47b58c';
            ctx.beginPath(); ctx.ellipse(0,-6*growth,4.5*growth,11*growth,0,0,Math.PI*2); ctx.fill(); ctx.restore();
          }
          if (live>.65 && hash(seed)>.56) {
            const bloom=Math.min(1,(live-.65)*3); ctx.save(); ctx.translate(ex,ey); ctx.fillStyle='#efdda3'; ctx.shadowColor='#f5da87';ctx.shadowBlur=5;
            for(let p=0;p<5;p++){ctx.beginPath();ctx.ellipse(Math.cos(p*1.256)*4*bloom,Math.sin(p*1.256)*4*bloom,3*bloom,3*bloom,0,0,Math.PI*2);ctx.fill();}ctx.restore();
          }
        }
      };
      branch(0,0,90,-Math.PI/2,5,3);
      for(let i=0;i<(quality==='lite'?20:65);i++) {
        const phase=(time*(live<.25?.1:.035)+hash(i+80))%1;
        const x=(hash(i+12)-.5)*430+Math.sin(time+i)*12;
        const y=live<.25?-340+phase*355:-phase*340;
        ctx.save();ctx.translate(x,y);ctx.rotate(time*.5+i);
        ctx.fillStyle=live<.25?'#b18346':`rgba(168,234,151,${.15+Math.sin(phase*Math.PI)*.6})`;
        ctx.beginPath();ctx.ellipse(0,0,live<.25?3:1.6,live<.25?6:1.6,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      ctx.restore();
    };
    frame=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frame);size.disconnect();observer.disconnect();canvas.removeEventListener('pointermove',move);};
    // The animation reads new vitality through a ref; no new loop per slider update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact,active,quality,reduced]);
  return <canvas ref={ref} className={`botanical-canvas ${compact?'compact':''}`} role="img" aria-label={vitality>.65?'复苏的数字植物，绿叶与花朵':'生态压力下的数字植物，教学隐喻'} />;
}
