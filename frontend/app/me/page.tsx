import { Suspense } from 'react';
import MePage from '@/pages/Me';
import Loading from '../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><MePage /></Suspense>;
}
