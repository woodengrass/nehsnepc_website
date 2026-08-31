export interface ToolItem {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  href?: string;
}

export const TOOLS: ToolItem[] = [
  {
    id: 'exposure-calculator',
    title: '曝光計算器',
    description: '輸入光圈、快門、ISO，外拍時快速試算曝光值與等效曝光組合。',
    image: '/images/generated/exposure-calculator-640.webp',
    imageAlt: '曝光計算器示意',
    href: '/tools/exposure-calculator'
  }
];
