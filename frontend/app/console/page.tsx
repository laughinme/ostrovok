import { Suspense } from 'react';
import ConsolePage from '@/pages/console';
import Loading from '../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><ConsolePage /></Suspense>;
}
