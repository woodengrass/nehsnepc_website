import type { Metadata } from 'next';

import ExposureCalculator from '@/components/tools/ExposureCalculator';

export const metadata: Metadata = {
  title: '曝光計算器',
  description: '調整 ISO、快門、光圈、ND 濾鏡與閃燈設定，快速計算等效曝光。',
  alternates: { canonical: '/tools/exposure-calculator' }
};

export default function ExposureCalculatorPage() {
  return <ExposureCalculator />;
}
