import type { Metadata } from 'next';

import Hero from '@/components/home/Hero';

export const metadata: Metadata = {
  alternates: { canonical: '/' }
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="scroll-spacer" aria-hidden="true" />
    </>
  );
}
