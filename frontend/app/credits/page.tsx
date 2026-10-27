import { Suspense } from 'react';
import CreditsPage from '@/pages/Credits';
import Loading from '../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><CreditsPage /></Suspense>;
}
