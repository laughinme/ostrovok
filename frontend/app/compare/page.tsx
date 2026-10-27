import { Suspense } from 'react';
import ComparePage from '@/pages/compare';
import Loading from '../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><ComparePage /></Suspense>;
}
