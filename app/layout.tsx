import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import './surfaces.css';
import './editorial.css';
import './archive.css';
import './identity.css';
import './laboratory.css';
import './refinements.css';
import './research.css';
import './ecology.css';
import './cinematic.css';
import './twin.css';
import './atelier.css';
import './world.css';
import './fullsite.css';
import GlobalChrome from '@/components/GlobalChrome';
import Providers from '@/components/Providers';

const instrument = localFont({ src: [{ path: '../public/fonts/instrument-serif-latin-normal.woff2', weight: '400', style: 'normal' }, { path: '../public/fonts/instrument-serif-latin-italic.woff2', weight: '400', style: 'italic' }], variable: '--font-instrument', display: 'swap', fallback: ['Georgia', 'Times New Roman', 'serif'] });
const manrope = localFont({ src: '../public/fonts/manrope-latin-variable.woff2', weight: '200 800', variable: '--font-manrope', display: 'swap', fallback: ['Arial', 'Microsoft YaHei', 'sans-serif'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.URL ?? 'http://localhost:3000'),
  title: "CarbonTwin — 城市碳足迹数字孪生",
  description: "三种身份，一个未来。在交互学习实验室探索碳知识，从权威资料出发，理解日常选择与城市系统的联系。",
  openGraph: { title: "CarbonTwin — See the unseen.", description: "One city. An invisible ledger. A different tomorrow.", images: ["/media/golden-hour.jpg"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${instrument.variable} ${manrope.variable}`}>
      <body className="bg-[#050B14] text-white antialiased"><Providers><GlobalChrome />{children}</Providers></body>
    </html>
  );
}
