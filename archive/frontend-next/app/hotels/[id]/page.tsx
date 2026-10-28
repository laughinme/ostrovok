import { Suspense } from 'react';
import HotelPage from '@/pages/hotel';
import Loading from '../../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><HotelPage /></Suspense>;
}
