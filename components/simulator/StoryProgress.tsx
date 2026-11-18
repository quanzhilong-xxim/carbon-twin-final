'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark } from 'lucide-react';
import { STORY_CHAPTERS } from './StoryChapters';

const KEY = 'carbontwin.behaviour.reading.v108';
/** Reading position is separate from learning records and calculation state. */
export default function StoryProgress() {
  const [current, setCurrent] = useState(0), [saved, setSaved] = useState<number | null>(null);
  const stopJump = useRef<() => void>();
  const jumping = useRef<number | null>(null);
  useEffect(()=>()=>stopJump.current?.(),[]);
  useEffect(() => {
    try {
      const previous = JSON.parse(localStorage.getItem(KEY) || 'null');
      const index = STORY_CHAPTERS.findIndex(([id]) => id === previous?.chapter);
      const reloading = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'reload';
      // A hash left by an earlier jump must not hide a later reading checkpoint
      // when reloading after continuing down the story. New deep links keep
      // their explicit destination; reload offers the actual last position.
      if (index > 0 && (!location.hash || reloading)) setSaved(index);
    } catch { /* Reading works when storage is unavailable. */ }
    let frame = 0, lastWritten = '';
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let active = 0;
        STORY_CHAPTERS.forEach(([id], index) => {
          const section = document.getElementById(id);
          if (section && section.getBoundingClientRect().top <= innerHeight * .38) active = index;
        });
        // Keep an explicit navigation destination stable while the browser
        // scrolls and deferred scenes above it finish their layout.
        if (jumping.current !== null) active = jumping.current;
        setCurrent(active);
        const chapter = STORY_CHAPTERS[active][0];
        if (window.scrollY > 100 && chapter !== lastWritten) try { localStorage.setItem(KEY, JSON.stringify({ chapter, updatedAt: new Date().toISOString() })); lastWritten = chapter; } catch { /* Optional persistence. */ }
      });
    };
    window.addEventListener('scroll', update, { passive: true }); update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', update); };
  }, []);
  useEffect(() => {
    document.querySelectorAll('.lab-chapters a').forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current');
    });
  }, [current]);
  const go = (index: number) => {
    const id = STORY_CHAPTERS[index]?.[0], target = id && document.getElementById(id);
    if (!id || !target) return;
    history.pushState(null, '', `#${id}`);
    stopJump.current?.();
    jumping.current = index;
    setCurrent(index);
    setSaved(null);
    const top = () => window.scrollY + target.getBoundingClientRect().top - (innerWidth < 760 ? 185 : 175);
    // Dynamic city/scene modules can add height above a restored chapter.
    // Track real layout changes briefly, rather than jumping to a stale pixel
    // coordinate. A user's own scroll immediately takes back control.
    let frame = 0, arrived = false, correcting = false;
    const correct = () => { cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      correcting=true;
      window.scrollTo({top:top(),behavior:'instant'});
      arrived=true; jumping.current=null;
      requestAnimationFrame(()=>{correcting=false;});
    }); };
    const resize = new ResizeObserver(correct);resize.observe(document.body);
    STORY_CHAPTERS.forEach(([chapter]) => { const section = document.getElementById(chapter); if (section) resize.observe(section); });
    // A scrollbar drag, assistive navigation or another in-page link can move
    // without a wheel/key event. Once arrived, that scroll also takes control.
    const scrolled = () => { if(arrived&&!correcting&&Math.abs(window.scrollY-top())>80)cancel(); };
    const cancel = () => { jumping.current=null;resize.disconnect();cancelAnimationFrame(frame);clearTimeout(timer);window.removeEventListener('wheel',cancel);window.removeEventListener('touchstart',cancel);window.removeEventListener('keydown',cancel);window.removeEventListener('scroll',scrolled); };
    const timer = window.setTimeout(cancel,4000);
    window.addEventListener('wheel',cancel,{passive:true});window.addEventListener('touchstart',cancel,{passive:true});window.addEventListener('keydown',cancel);
    window.addEventListener('scroll',scrolled,{passive:true});
    stopJump.current=cancel;correct();
  };
  return <>
    {saved !== null && <div className="story-resume" role="status"><Bookmark size={16} /><span>上次读到 {String(saved + 1).padStart(2, '0')} · {STORY_CHAPTERS[saved][1]}</span><button onClick={() => go(saved)}>继续阅读</button><button onClick={() => setSaved(null)} aria-label="关闭阅读位置提示">关闭</button></div>}
    <nav className="story-progress" aria-label="当前故事章节" data-current-chapter={current + 1}>
      <a href={`#${STORY_CHAPTERS[current][0]}`}><small>{String(current + 1).padStart(2, '0')} / 10</small><strong>{STORY_CHAPTERS[current][1]}</strong></a>
      <div className="story-progress-track" aria-hidden="true"><i style={{ width: `${(current + 1) * 10}%` }} /></div>
      <button disabled={current === 0} onClick={() => go(current - 1)} aria-label="上一章"><ArrowLeft size={17} /></button>
      <button disabled={current === 9} onClick={() => go(current + 1)} aria-label="下一章"><ArrowRight size={17} /></button>
    </nav>
  </>;
}
