import type { Metadata } from 'next';
import AcademicArchive from '@/components/AcademicArchive';
import SiteFooter from '@/components/SiteFooter';
import LearningLab from '@/components/LearningLab';

export const metadata: Metadata = { title: 'The Evidence Archive — CarbonTwin 学术档案', description: '阅读 IPCC AR6 与 GHG Protocol 原文摘录、中文释义、章节定位和 DOI。区分证据、解读与适用边界。' };

export default function LearnPage() {
  return <div className="learn-page"><a className="skip-link" href="#archive">跳至学术档案</a><main className="archive-main">
    <div className="archive-masthead"><span><span className="live-dot" /> CARBONTWIN / THE RESEARCH LIBRARY</span><span>OPEN ACCESS TO UNDERSTANDING</span></div>
    <header className="archive-heading"><div><span className="section-kicker">THE EVIDENCE ARCHIVE</span><h1>Read the science.<br /><i>Question everything.</i></h1></div><div className="archive-heading-note"><span>[ A LIVING INDEX ]</span><p>气候科学不是口号。<br />从原文出发，辨认事实、<br />方法，以及每个判断的边界。</p><small>IPCC AR6 / GHG PROTOCOL</small></div></header>
    <section className="academic-vision"><span>A LETTER TO OUR SHARED FUTURE</span><p>从一个日常选择，到一座城市的呼吸。在这片看不见的账本里，每一个微小的行为都会留下碳的痕迹。通过交互式推演与 AI 溯源，让我们一起看懂碳足迹，重塑这个星球的未来。</p></section>
    <LearningLab />
    <section id="archive" aria-label="气候与碳核算学术档案"><AcademicArchive /></section>
  </main><SiteFooter /></div>;
}
