import CityStudies from '@/components/3d/CityStudies';
import AtelierLinks from '@/components/architecture/AtelierLinks';
import './studies.css';

export default function CityStudiesPage() {
  return <main className="city-studies-page"><AtelierLinks active="bamboo"/><CityStudies/></main>;
}
