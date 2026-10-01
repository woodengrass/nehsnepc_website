import type { Metadata } from 'next';
import { Suspense } from 'react';

import PreviewLoader from './PreviewLoader';

// Pure client route: the MDX compiler + GitHub fetch pipeline lives only in
// this route chunk (PreviewLoader → next/dynamic ssr:false → PreviewClient →
// PreviewRenderer). No public route may import ./PreviewClient,
// ./PreviewRenderer, ./PreviewLoader, or lib/preview/* — the consistency
// spec asserts that isolation.

export const metadata: Metadata = {
  title: '文章預覽',
  description: '已提交分支文章的瀏覽器內預覽，僅顯示已儲存的提交，不列入索引。',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  }
};

export default function PreviewPage() {
  return (
    <Suspense>
      <PreviewLoader />
    </Suspense>
  );
}
