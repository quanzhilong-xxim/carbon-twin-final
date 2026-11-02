'use client';
import { useRef } from 'react';
import { useCarbonModel } from '@/lib/hooks/useCarbonModel';
import { useUIStore } from '@/lib/stores/UIStore';
const labels = { overview: '供应链全景', energy: '上游能源', transport: '运输节点', food: '食物消费', beefTendon: '牛肉供应链教学节点' };
export default function CarbonModel({ onExplore }: { onExplore?: () => void }) {
  const host = useRef<HTMLDivElement>(null), callback = useRef(onExplore);
  callback.current = onExplore;
  const focus = useUIStore(s => s.focus);
  useCarbonModel(host, callback);
  return <div className="carbon-model" ref={host} role="img" aria-label={`牛肉供应链概念模型，当前聚焦${labels[focus]}`}>
    <span className="model-caption">BEEF / SUPPLY-CHAIN LENS<br />{labels[focus]}</span>
    <div className="model-fallback">3D 视图不可用，仍可使用视角按钮探索。</div>
  </div>;
}
