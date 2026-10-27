import { Suspense } from 'react';
import ComparePage from '@/pages/Compare';
import Loading from '../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><ComparePage /></Suspense>;
}
