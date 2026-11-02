import type { Metadata } from 'next';
import SimulatorPanel from '@/components/simulator/SimulatorPanel';
import SiteFooter from '@/components/SiteFooter';
export const metadata: Metadata = { title: 'The Behaviour Lab — CarbonTwin 行为沙盘' };
export default function SimulatorPage() { return <><SimulatorPanel /><SiteFooter /></>; }
