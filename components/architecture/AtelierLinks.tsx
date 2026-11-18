import Link from 'next/link';
import './architecture-v7.css';

const studies = [
  { id: 'bamboo', number: '01', name: '春笋 · 斜网格塔', description: '从斜网格到开放塔冠', href: '/city-studies?building=B01&view=front' },
  { id: 'tide', number: '02', name: '潮汐之门', description: '双塔之间，一座空中花园', href: '/citylight/lab?candidate=a' },
  { id: 'light', number: '03', name: '光之塔 · 光庭', description: '幕墙、房间与日光的关系', href: '/citylight/studio' },
] as const;

export default function AtelierLinks({ active }: { active: 'bamboo' | 'tide' | 'light' | 'other' }) {
  return <nav className="architecture-journey" aria-label="建筑工作台导航">
    <div className="architecture-journey-intro"><span>THE ARCHITECTURE ATELIER</span><p>三种结构，一段城市旅程。</p><Link href="/#home">返回城市探索 ↗</Link></div>
    {studies.map(study => <Link key={study.id} className="architecture-journey-card" aria-current={active === study.id ? 'page' : undefined} href={study.href}><span>{study.number} / ARCHITECTURE STUDY</span><strong>{study.name}<i aria-hidden="true">↗</i></strong><small>{study.description}</small></Link>)}
  </nav>;
}
