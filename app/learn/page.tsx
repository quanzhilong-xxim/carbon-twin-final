import type { Metadata } from 'next';
import AcademicArchive from '@/components/AcademicArchive';
import SiteFooter from '@/components/SiteFooter';
import LearningLab from '@/components/LearningLab';
import ResearchLibraryHero from '@/components/ResearchLibraryHero';
import './library-v7.css';
import './library-v104.css';
import './library-v124.css';

export const metadata: Metadata = { title: 'The Evidence Archive — CarbonTwin 学术档案', description: '阅读 IPCC AR6 与 GHG Protocol 原文摘录、中文释义、章节定位和 DOI。区分证据、解读与适用边界。' };

export default function LearnPage() {
  return <div className="learn-page"><a className="skip-link" href="#archive">跳至学术档案</a><main className="archive-main">
    <div className="archive-masthead"><span><span className="live-dot" /> CARBONTWIN / THE RESEARCH LIBRARY</span><span>OPEN ACCESS TO UNDERSTANDING</span></div>
    <ResearchLibraryHero />
    <LearningLab />
    <section id="archive" aria-label="气候与碳核算学术档案"><AcademicArchive /></section>
  </main><SiteFooter /></div>;
}
