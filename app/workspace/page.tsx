import ARGarmentTryOn from '@/components/3d/ARGarmentTryOn';
import SiteFooter from '@/components/SiteFooter';
import dynamic from 'next/dynamic';

const ClothingGallery = dynamic(() => import('@/components/3d/ClothingGallery'), { ssr: false, loading: () => <div className="clothing-gallery-loading">Loading digital garment atelier…</div> });
export const metadata={title:'The Footprint Mirror — CarbonTwin 碳足迹穿搭镜'};
export default function WorkspacePage(){return <><main className="workspace-page"><ARGarmentTryOn/><ClothingGallery/></main><SiteFooter/></>;} 
