import type { Metadata } from 'next';
import SiteSearch from '@/components/SiteSearch';
import SiteFooter from '@/components/SiteFooter';
import './search.css';
export const metadata: Metadata={title:'站内搜索 — CarbonTwin'};
export default function SearchPage({searchParams}:{searchParams:{q?:string|string[]}}){return <><SiteSearch initialQuery={typeof searchParams.q==='string'?searchParams.q:''}/><SiteFooter/></>;}
