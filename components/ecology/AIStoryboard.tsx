'use client';
import type { AIResponse } from '@/types';
import BotanicalCanvas from './BotanicalCanvas';
export default function AIStoryboard({storyboard,streaming=false}:{storyboard?:AIResponse['storyboard'];streaming?:boolean}){
  return <figure className={`ai-storyboard ${streaming?'is-streaming':''}`} data-scene={storyboard?.scene??'leaf'}><BotanicalCanvas compact vitality={storyboard?.intensity??.75} active={streaming||!!storyboard}/>{storyboard&&<figcaption>{storyboard.caption}<small>AI分镜 × 代码绘图 · 教学隐喻</small></figcaption>}</figure>;
}
