import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'NEHS Photography Club',
  description: 'NEHS 攝影社 — LOOK CLOSER.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
