import { Suspense } from 'react';
import DevelopersPage from '@/pages/Developers';
import Loading from '../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><DevelopersPage /></Suspense>;
}
