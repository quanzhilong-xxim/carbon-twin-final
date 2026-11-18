'use client';
import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useUIStore } from '@/lib/stores/UIStore';
import { visualDynamics } from '@/lib/visualDynamics';
export function useCinematicScroll(root: RefObject<HTMLDivElement>) {
  const reduced = useUIStore(s => s.reduced);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (reduced) { visualDynamics.scroll = 1; return () => { visualDynamics.scroll = 0; }; }
    const lenis = new Lenis({ duration: 1.1, anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add('(min-width: 1001px) and (min-height: 900px)', () => {
        const hero = root.current?.querySelector<HTMLElement>('.research-hero');
        if (!hero) return;
        const trigger = ScrollTrigger.create({
          trigger: hero, start: 'top top', end: '+=900', pin: true,
          invalidateOnRefresh: true, onUpdate: trigger => {
            visualDynamics.scroll = trigger.progress;
            hero.dataset.phase = String(Math.min(2, Math.floor(trigger.progress * 3)));
            hero.dataset.scroll = trigger.progress.toFixed(3);
          },
        });
        // Keep the research title and citations readable while the field changes.
        return () => { trigger.kill(); visualDynamics.scroll = 0; };
      }, root);
      media.add('(max-width: 1000px), (max-height: 899px)', () => {
        const field = root.current?.querySelector<HTMLElement>('.city-observatory');
        if (!field) return;
        // Native vertical scrolling on touch devices; no pinned section or wheel trapping.
        const trigger = ScrollTrigger.create({ trigger: field, start: 'clamp(top top)', end: 'bottom 25%',
          onUpdate: self => { visualDynamics.scroll = self.progress; },
        });
        return () => { trigger.kill(); visualDynamics.scroll = 0; };
      }, root);
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(element => gsap.fromTo(element,
        { y: 35, opacity: .3 }, { y: 0, opacity: 1, scrollTrigger: { trigger: element, start: 'top 92%', end: 'top 60%', scrub: 1 } }));
    }, root);
    let disposed = false;
    void document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    return () => { disposed = true; media.revert(); context.revert(); gsap.ticker.remove(tick); lenis.off('scroll', ScrollTrigger.update); lenis.destroy(); visualDynamics.scroll = 0; };
  }, [root, reduced]);
}
