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
    if (reduced) return;
    const lenis = new Lenis({ duration: 1.1, anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add('(min-width: 900px)', () => {
        const hero = root.current?.querySelector<HTMLElement>('.research-hero');
        if (!hero) return;
        const timeline = gsap.timeline({ scrollTrigger: {
          trigger: hero, start: 'top top', end: '+=1200', pin: true, scrub: 1,
          invalidateOnRefresh: true, onUpdate: trigger => {
            visualDynamics.scroll = trigger.progress;
            hero.dataset.phase = String(Math.min(2, Math.floor(trigger.progress * 3)));
            hero.dataset.scroll = trigger.progress.toFixed(3);
          },
        } });
        timeline.to('.decode-letter', { x: i => Math.sin(i * 13.7) * 250, y: i => Math.cos(i * 7.3) * 160, rotation: i => Math.sin(i) * 80, scale: 1.8, opacity: 0, stagger: { amount: .16 }, ease: 'power2.in' }, 0)
          .to('.research-deck,.climate-sparks,.scope-ledger,.research-citations,.research-actions', { opacity: 0, y: -60, stagger: .025, duration: .38 }, 0)
          .to('.city-stat', { opacity: 0, y: -50, scale: .85, duration: .25 }, .15)
          .fromTo('.seam-tile', { opacity: 0, scale: .1, rotation: 15 }, { opacity: 1, scale: 1.02, rotation: 0, stagger: { amount: .15, from: 'random' }, duration: .16 }, .7)
          .to('.seam-tile', { y: i => 90 + (i % 6) * 30, rotation: i => (i % 2 ? -1 : 1) * 20, opacity: 0, stagger: { amount: .12 }, duration: .16 }, .88);
        return () => { visualDynamics.scroll = 0; };
      }, root);
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(element => gsap.fromTo(element,
        { y: 35, opacity: .3 }, { y: 0, opacity: 1, scrollTrigger: { trigger: element, start: 'top 92%', end: 'top 60%', scrub: 1 } }));
    }, root);
    let disposed = false;
    void document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    return () => { disposed = true; media.revert(); context.revert(); gsap.ticker.remove(tick); lenis.off('scroll', ScrollTrigger.update); lenis.destroy(); visualDynamics.scroll = 0; };
  }, [root, reduced]);
}
