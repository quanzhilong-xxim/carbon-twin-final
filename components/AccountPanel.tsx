'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Database, X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { allLearning } from '@/lib/storage/LearningDB';
export default function AccountPanel() {
  const [open,setOpen]=useState(false),[count,setCount]=useState(0);
  const dialog = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  useEffect(()=>{const update=()=>{void allLearning('guest').then(rows=>setCount(rows.length));};update();window.addEventListener('carbon-learning-updated',update);return()=>window.removeEventListener('carbon-learning-updated',update);},[]);
  useEffect(() => {
    if (!open) return;
    // Safari does not focus buttons on pointer clicks. Restore the explicit
    // trigger rather than whichever unrelated element happened to be focused.
    const opener = trigger.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      if (event.key !== 'Tab') return;
      const items = dialog.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);
  const overlay = <AnimatePresence>{open&&<motion.div className="account-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:.2}} onClick={()=>setOpen(false)}><section ref={dialog} className="account-dialog" role="dialog" aria-modal="true" aria-label="本地学习记录" onClick={e=>e.stopPropagation()}><button className="account-close" aria-label="关闭本地记录" onClick={()=>setOpen(false)}><X size={18}/></button><span className="section-kicker">LOCAL LEARNING JOURNAL</span><h2>每一次选择，<br/><i>都被记住。</i></h2><p>已保存 {count} 条本地学习记录。</p><p>滑块操作、AI 问答和测验进度保存在当前浏览器的 IndexedDB 中，无需登录。</p><small>本地记录不会跨设备同步；清除浏览器数据或结束无痕会话会删除相应记录。导出的 PDF 可单独保存。</small></section></motion.div>}</AnimatePresence>;
  return <><button ref={trigger} className="account-toggle" aria-label="查看本地记录" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><Database size={16}/><span>本地记录</span></button>{typeof document !== 'undefined' && createPortal(overlay, document.body)}</>;
}
