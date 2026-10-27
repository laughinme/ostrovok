import { Suspense } from 'react';
import ConsolePage from '@/pages/Console';
import Loading from '../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><ConsolePage /></Suspense>;
}
