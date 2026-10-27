import { Suspense } from 'react';
import TripPage from '@/pages/trip';
import Loading from '../../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><TripPage /></Suspense>;
}
