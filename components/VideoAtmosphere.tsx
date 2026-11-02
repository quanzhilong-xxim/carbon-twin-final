'use client';
import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/lib/stores/UIStore';
const scenes = [
  { id: 'golden-hour', label: '01 / 城市暮光', caption: 'MONTRÉAL · URBAN LIGHT' },
  { id: 'deep-woods', label: '02 / 森林呼吸', caption: 'BELARUS · LIVING CANOPY' },
  { id: 'quiet-dawn', label: '03 / 下一次日出', caption: 'KENNEDY SPACE CENTER · DAWN' },
];
export default function VideoAtmosphere() {
  const [active, setActive] = useState(0), [visible, setVisible] = useState(true);
  const videos = useRef<(HTMLVideoElement | null)[]>([]), root = useRef<HTMLDivElement>(null);
  const reduced = useUIStore(s => s.reduced);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const sync = () => videos.current.forEach((video, index) => {
      if (!video) return;
      if (index === active && visible && !document.hidden && !reduced) void video.play().catch(() => undefined);
      else video.pause();
    });
    const selected = videos.current[active];
    if (selected && visible && !reduced) void selected.play().catch(() => undefined);
    if (reduced || !visible || document.hidden) sync();
    const timer = setTimeout(sync, reduced ? 0 : 1200);
    document.addEventListener('visibilitychange', sync);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', sync); };
  }, [active, reduced, visible]);
  return <><div ref={root} className="video-atmosphere" aria-hidden="true">{scenes.map((scene, index) => <video key={scene.id} ref={node => { videos.current[index] = node; }} className={active === index ? 'selected' : ''} autoPlay muted loop playsInline preload="metadata" poster={`/media/${scene.id}.jpg`} src={`/media/${scene.id}.mp4`} />)}<div className="video-veil" /></div>
    <div className="scene-switcher" aria-label="切换影像氛围">{scenes.map((scene, index) => <button key={scene.id} aria-pressed={active === index} onClick={() => setActive(index)}><span className={active === index ? 'scene-dot active' : 'scene-dot'} />{scene.label}</button>)}<span className="scene-caption">{scenes[active].caption}</span></div></>;
}
