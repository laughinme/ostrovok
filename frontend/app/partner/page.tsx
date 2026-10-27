import { Suspense } from 'react';
import PartnerPage from '@/pages/partner';
import Loading from '../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><PartnerPage /></Suspense>;
}
