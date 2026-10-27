import { Suspense, type ReactNode } from 'react';
import SearchPage from '@/pages/search';
import Loading from '../loading';

// Keep the search workflow mounted during the landing → results transition.
export default function DiscoveryLayout({ children }: { children: ReactNode }) {
  return <><Suspense fallback={<Loading />}><SearchPage /></Suspense>{children}</>;
}
