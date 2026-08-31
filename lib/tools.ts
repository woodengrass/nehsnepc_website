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
    description: '輸入光圈、快門、ISO，快速估算曝光值與等效曝光組合。適合外拍前快速試算。',
    image: '/images/generated/hero-640.webp',
    imageAlt: '曝光計算器示意',
    href: '/tools/exposure-calculator'
  },
  {
    id: 'depth-of-field',
    title: '景深試算',
    description: '依據焦段、光圈與對焦距離，估算景深範圍。幫助你掌握主體清晰與背景虛化的平衡。',
    image: '/images/generated/contact-800.webp',
    imageAlt: '景深試算示意',
    href: undefined
  },
  {
    id: 'film-log',
    title: '底片沖洗記錄',
    description: '記錄每一卷底片的沖洗參數、藥水批次與結果，建立自己的暗房資料庫。',
    image: '/images/generated/hero-1280.webp',
    imageAlt: '底片沖洗記錄示意',
    href: undefined
  }
];
