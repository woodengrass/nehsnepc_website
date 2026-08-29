import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'NEHS 攝影社作品集 — 敬請期待。',
  alternates: { canonical: '/portfolio' }
};

export default function PortfolioPage() {
  return (
    <main className="page-placeholder">
      <h1>Portfolio</h1>
      <p>This page is coming soon.</p>
    </main>
  );
}
