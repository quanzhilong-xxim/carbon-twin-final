'use client';
import CityFormation from './3d/CityFormation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect,useState } from 'react';
const LegacyField=dynamic(()=>import('./ecology/EcologicalScene'),{ssr:false});
export default function CityScene({onStatusChange}:{onStatusChange?:(status:'loading'|'ready'|'fallback')=>void}) {const [legacy,setLegacy]=useState(false);useEffect(()=>{onStatusChange?.(legacy?'fallback':'loading');},[legacy,onStatusChange]);return <><div className="city-view-choice"><button onClick={()=>setLegacy(v=>!v)} aria-pressed={legacy}>{legacy?'返回实体城市':'查看原有城市 / 森林隐喻'} ↗</button><Link href="/citylight/studio">查看光之塔·光庭 ↗</Link></div>{legacy?<div className="legacy-city-field"><LegacyField city/><p>原有点阵生态隐喻 · 与真实植物预测不同。</p></div>:<CityFormation onStatusChange={onStatusChange}/>}</>; }
