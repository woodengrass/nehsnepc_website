export type ToolStatus = 'available' | 'coming-soon';

interface ToolBase {
  id: string;
  title: string;
  description: string;
  /** Fallback WebP used by the `<img>` inside `<picture>`. */
  image: string;
  imageAvifSrcSet: string;
  imageWebpSrcSet: string;
  imageSizes: string;
  imageAlt: string;
}

export type ToolItem = ToolBase &
  ({ status: 'available'; href: string } | { status: 'coming-soon'; href?: never });

const TOOL_IMAGE_SIZES = '(max-width: 767px) 100vw, (max-width: 980px) 50vw, 33vw';

export const TOOLS: readonly ToolItem[] = [
  {
    id: 'exposure-calculator',
    title: '曝光計算器',
    description: '輸入光圈、快門、ISO，外拍時快速試算曝光值與等效曝光組合。',
    image: '/images/generated/exposure-calculator-640.webp',
    imageAvifSrcSet:
      '/images/generated/exposure-calculator-640.avif 640w, /images/generated/exposure-calculator-960.avif 960w, /images/generated/exposure-calculator-1280.avif 1280w',
    imageWebpSrcSet:
      '/images/generated/exposure-calculator-640.webp 640w, /images/generated/exposure-calculator-960.webp 960w, /images/generated/exposure-calculator-1280.webp 1280w',
    imageSizes: TOOL_IMAGE_SIZES,
    imageAlt: '曝光計算器示意',
    status: 'available',
    href: '/tools/exposure-calculator'
  }
];
