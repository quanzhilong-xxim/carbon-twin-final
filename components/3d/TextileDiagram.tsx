'use client';

import { useId, useState } from 'react';
import { fabricStudies, type FabricStudy } from './FabricStructure';

const levels = ['经纬织物', '加捻纱线', '纤维束'] as const;

/** Original teaching drawing, usable without a WebGL context or model download. */
export default function TextileDiagram({ fabric }: { fabric: FabricStudy }) {
  const [level, setLevel] = useState(0);
  const id = useId().replace(/:/g, '');
  const study = fabricStudies[fabric];
  const descriptions = [
    fabric === 'denim' ? '观察交织点沿对角线移动：这是斜纹的结构特征。蓝色本身不能证明原料成分。' : '两组纱线在交织点交替浮沉。这里用平纹说明交织关系，不代表所有该材料都采用平纹。',
    '多根纤维或长丝经过加捻形成纱线。捻度、粗细与结构会改变手感和强度，图中没有测量尺度。',
    fabric === 'wool' ? '羊毛的天然卷曲在此被放大示意；实际卷曲、直径与长度因品种而异。' : fabric === 'polyester' ? '聚酯可制成长丝或短纤。此处展示较平直的长丝示意，并非这件服装的实测截面。' : '纤维是纱线的组成单元。这里展示纤维束的关系，不是显微照片，也不能用于识别真实衣物成分。',
  ];
  return <div className="textile-diagram" data-fabric={fabric} data-level={level}>
    <div className="textile-diagram-heading"><span>STRUCTURE AT THREE SCALES</span><strong>{study.name} · {levels[level]}</strong></div>
    <svg viewBox="0 0 520 280" role="img" aria-label={`${study.name}的${levels[level]}原创放大结构示意`}>
      <defs>
        <linearGradient id={`${id}yarn`} x1="0" x2="1"><stop stopColor="#647c69"/><stop offset=".45" stopColor={study.color}/><stop offset="1" stopColor="#657966"/></linearGradient>
        <radialGradient id={`${id}paper`}><stop stopColor="#385342"/><stop offset="1" stopColor="#132a20"/></radialGradient>
      </defs>
      <rect width="520" height="280" rx="12" fill={`url(#${id}paper)`}/>
      <g stroke={`url(#${id}yarn)`} fill="none" strokeLinecap="round">
        {level === 0 && <>
          {Array.from({length:11},(_,i)=><path key={`warp${i}`} d={`M${130+i*26} 24 V254`} strokeWidth="15"/>)}
          {Array.from({length:9},(_,i)=><path key={`weft${i}`} d={`M112 ${35+i*26} H410`} strokeWidth="15" stroke="#adbd9b"/>)}
          {Array.from({length:99},(_,i)=>{const x=i%11,y=Math.floor(i/11),over=fabric==='denim'?(x-y+12)%3!==0:(x+y)%2===0;return over&&<path key={i} d={`M${130+x*26} ${24+y*26} v22`} strokeWidth="15"/>;})}
        </>}
        {level === 1 && Array.from({length:9},(_,i)=><path key={i} d={`M65 ${135+Math.sin(i*.7)*27} ${Array.from({length:81},(_,p)=>{const x=65+p*4.9,y=140+Math.sin(p*.19+i*.7)*31;return `L${x.toFixed(1)} ${y.toFixed(1)}`;}).join(' ')}`} strokeWidth="6"/>)}
        {level === 2 && Array.from({length:13},(_,i)=><path key={i} d={Array.from({length:81},(_,p)=>{const x=70+p*4.8,wave=fabric==='wool'?12:fabric==='polyester'?1.5:5,y=53+i*14+Math.sin(p*.29+i*.8)*wave;return `${p?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`;}).join(' ')} strokeWidth={fabric==='polyester'?2.5:3.5}/>)}
      </g>
      <g fill="#d5dfca" fontSize="11" fontFamily="sans-serif"><text x="20" y="24">{String(level+1).padStart(2,'0')} / 03</text><text x="20" y="262">放大结构示意 · 无测量比例</text></g>
    </svg>
    <div className="textile-scales" role="group" aria-label="材料观察尺度">{levels.map((label,i)=><button key={label} onClick={()=>setLevel(i)} aria-pressed={level===i}><small>0{i+1}</small>{label}</button>)}</div>
    <p aria-live="polite">{descriptions[level]}</p>
  </div>;
}
