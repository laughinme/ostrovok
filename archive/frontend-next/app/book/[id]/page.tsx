import { Suspense } from 'react';
import BookPage from '@/pages/book';
import Loading from '../../loading';

export default function Page() {
  return <Suspense fallback={<Loading />}><BookPage /></Suspense>;
}
