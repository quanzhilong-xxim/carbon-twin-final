'use client';

import Link from 'next/link';
import SoundToggle from './SoundToggle';
import AccountPanel from './AccountPanel';
import { usePathname } from 'next/navigation';
import { Atom, BookOpen, Orbit, Users, ArrowUpRight, Search } from 'lucide-react';
import { useUIStore, setMotionPreference } from '@/lib/stores/UIStore';
import GlassSurface from './GlassSurface';
import { useCarbonStore } from '@/lib/store';

const links = [
  { id: 'home', label: '探索', href: '/', icon: Orbit },
  { id: 'identities', label: '身份视角', href: '/#identities', icon: Users },
  { id: 'learn', label: '学术档案', href: '/learn', icon: BookOpen },
  { id: 'simulator', label: '行为沙盘', href: '/simulator', icon: Atom },
];

export default function LiquidNavbar() {
  const section = useCarbonStore(s => s.activeSection), reduced = useUIStore(s => s.reduced);
  const path = usePathname();
  const active = path === '/simulator' ? 'simulator' : path === '/learn' ? 'learn' : path === '/' ? (section === 'identities' ? 'identities' : 'home') : undefined;
  return <header className="site-header"><Link href="/" className="wordmark" aria-label="CarbonTwin 首页"><span className="brand-symbol"><Atom size={23} /></span>carbon<span>twin</span><span className="brand-beta">RESEARCH LAB</span></Link><GlassSurface className="navbar-glass" tilt={false}><nav aria-label="主导航">{links.map(({ id, label, href, icon: Icon }) => <Link key={id} href={href} aria-current={active === id ? 'page' : undefined} className={`nav-item ${active === id ? 'active' : ''}`}><span className="nav-icon"><Icon size={16} /></span><span>{label}</span></Link>)}</nav></GlassSurface><div className="header-utilities"><Link href="/search" className="header-action site-search-entry" aria-label="搜索全站"><Search size={16}/><span>搜索</span></Link><SoundToggle/><AccountPanel/><button className="header-action motion-toggle" aria-pressed={reduced} onClick={() => setMotionPreference(reduced ? 'full' : 'reduce')}>{reduced ? '动效已减弱' : '减弱动效'} <ArrowUpRight size={15} /></button></div></header>;
}
