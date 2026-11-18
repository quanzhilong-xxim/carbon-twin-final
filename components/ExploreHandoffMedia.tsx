'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useUIStore } from '@/lib/stores/UIStore';

export default function ExploreHandoffMedia() {
  const video = useRef<HTMLVideoElement>(null), root = useRef<HTMLDivElement>(null);
  const reduced = useUIStore(state => state.reduced);
  const [paused, setPaused] = useState(false), [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false), [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .05 });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    sync(); document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const shouldPlay = visible && pageVisible && !paused && !reduced && !failed;
    if (shouldPlay) void element.play().catch(() => setPaused(true));
    else element.pause();
    return () => element.pause();
  }, [visible, pageVisible, paused, reduced, failed]);
  return <div ref={root} className="explore-evidence-visual" data-paused={paused || reduced || !pageVisible} data-media-state={failed ? 'poster' : !pageVisible ? 'page-hidden' : !visible ? 'offscreen' : paused || reduced ? 'paused' : 'playing'}>
    {!failed && <video ref={video} muted loop playsInline preload="none" poster="/media/deep-woods.jpg" onError={() => setFailed(true)} aria-hidden="true"><source src="/media/deep-woods.mp4" type="video/mp4" /></video>}
    <div className="evidence-orbit" aria-hidden="true"><i /><i /><i /><span>∑</span></div>
    <div className="evidence-visual-label"><span>FROM CITY TO EVIDENCE</span><b>看见城市，<br />也追问它的来路。</b></div>
    <button type="button" className="evidence-media-toggle" aria-label={paused || reduced ? '播放档案过渡背景' : '暂停档案过渡背景'} disabled={reduced || failed} onClick={() => setPaused(value => !value)}>{paused || reduced ? <Play size={15} /> : <Pause size={15} />}</button>
    <small>森林航拍 · Vladislav Sanikovich · CC BY 3.0</small>
  </div>;
}
