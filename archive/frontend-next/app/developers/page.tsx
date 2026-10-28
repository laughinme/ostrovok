import { Suspense } from 'react';
import DevelopersPage from '@/pages/developers';
import Loading from '../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><DevelopersPage /></Suspense>;
}
