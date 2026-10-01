'use client';

// Client boundary for the route-level split: `next/dynamic` with
// `ssr: false` is only legal inside a Client Component, so this tiny loader
// owns the split and keeps the MDX compiler out of SSR and public bundles.
import dynamic from 'next/dynamic';

const PreviewClient = dynamic(() => import('./PreviewClient'), { ssr: false });

export default function PreviewLoader() {
  return <PreviewClient />;
}
