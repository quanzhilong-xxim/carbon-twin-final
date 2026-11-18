import Link from 'next/link';
import { Atom, ArrowUpRight } from 'lucide-react';

export default function SiteFooter() {
  return <footer className="site-footer"><Link href="/" className="wordmark"><span className="brand-symbol"><Atom size={23} /></span>carbon<span>twin</span></Link><span>让每一个判断，有据可循。</span><div><span>© {new Date().getFullYear()} CARBONTWIN</span><Link href="/learn">学术档案 <ArrowUpRight size={11} style={{ display: 'inline' }} /></Link><Link href="/city-studies">建筑工作台 ↗</Link><Link href="/tts-audition">豆包语音 ↗</Link></div></footer>;
}
