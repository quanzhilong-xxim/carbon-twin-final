'use client';
import Link from 'next/link';
import { THEMES,useCarbonStore } from '@/lib/store';
import { PERSPECTIVES } from '@/lib/world/learning';
const routes={
 student:['/learn#scope-boundaries','/learn#garment-journey','/simulator#activity-lab'],
 business:['/learn#scope-boundaries','/learn#garment-journey','/simulator#digital-room'],
 city:['/learn#scope-boundaries','/city-studies','/simulator#digital-room'],
} as const;
export default function RoleGuide(){
 const id=useCarbonStore(s=>s.activeIdentity),p=PERSPECTIVES[id];
 return <aside className="role-guide role-guide-v7" data-guide-identity={id} aria-label="当前身份探索引导"><span className="section-kicker">{THEMES[id].label} / YOUR NEXT QUESTION</span><h3>{p.question}</h3><p>{p.guide}</p><ol>{p.steps.map((step,i)=><li key={step}><Link href={routes[id][i]}><small>0{i+1}</small>{step} ↗</Link></li>)}</ol></aside>;
}
