import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/app.css';

export const metadata: Metadata = {
  title: 'О!кно — каким будет ваш номер',
  description: 'Подбор отеля по желанию с проверенными фактами о виде, тишине и дороге до моря',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ru"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Onest:wght@400..800&display=swap" rel="stylesheet" />
  </head><body><Providers>{children}</Providers></body></html>;
}
