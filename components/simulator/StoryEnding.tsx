'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
const Scene = dynamic(() => import('../ecology/SakuraScene'), { ssr:false });

export default function StoryEnding() {
  const [paused,setPaused]=useState(false),[visits,setVisits]=useState(0);
  useEffect(()=>{try{setVisits(Math.max(0,Number(localStorage.getItem('ct-forest-reunion'))||0));}catch{}},[]);
  const greet=()=>setVisits(n=>{const next=n+1;try{localStorage.setItem('ct-forest-reunion',String(next));}catch{}return next;});
  return <section className="forest-reunion" aria-labelledby="forest-reunion-title">
    <header><div><span className="section-kicker">THE WORLD YOU RETURN TO / 回到生命之间</span><h3 id="forest-reunion-title">樱花落下，故事仍在生长。</h3><p>女孩留在树下，猫咪与羊羔走进花园。轻触猫咪，或停下来，看一看你选择之后的世界。</p></div><div className="forest-reunion-controls"><button type="button" onClick={greet}>和猫咪打招呼</button><button type="button" aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?'继续花园动画':'暂停花园动画'}</button><span role="status">{visits?`已留下 ${visits} 次问候`:'等待一次温柔的问候'}</span></div></header>
    <div className="story-ending-landscape"><Scene ending paused={paused} reaction={visits} onInteract={greet}/></div>
    <footer><p>花园以生命变化回应故事，数值结果仍以活动量和因子为依据。动画不代表真实碳汇，也不会改变你的排放计算。</p><div><Link className="primary-button" href="/#explore">带着新问题，回到探索 ↗</Link><a href="#sakura-meeting">重新走过这十个章节 ↑</a></div></footer>
  </section>;
}
