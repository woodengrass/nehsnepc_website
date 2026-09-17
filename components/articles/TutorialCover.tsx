type TutorialCoverProps = {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  eager?: boolean;
};

// 與 scripts/optimize_images.js 的輸出寬度保持一致；
// cover 若指向 generated 家族內的檔案，即可組出完整響應式 srcset。
const GENERATED_WIDTHS: Record<string, number[]> = {
  hero: [640, 1280, 1920, 2560],
  contact: [480, 800, 1200, 1600],
  logo: [96, 192, 384],
  'exposure-calculator': [640, 960, 1280]
};

function generatedFamily(src: string): { name: string; widths: number[] } | null {
  const match = src.match(/^\/images\/generated\/(.+)\.(?:avif|webp|jpg|jpeg|png)$/);
  if (!match) return null;
  const base = match[1].replace(/-\d+$/, '');
  if (base.startsWith('about-satellite-')) return { name: base, widths: [640] };
  const widths = GENERATED_WIDTHS[base];
  return widths ? { name: base, widths } : null;
}

// 文章封面：已知家族走 <picture> 響應式，未知路徑沿用原 <img> 行為。
// <picture> 使用 display:contents，不改變原有排版與 hover 動效。
export default function TutorialCover({ src, alt, className, sizes, eager = false }: TutorialCoverProps) {
  const family = generatedFamily(src);
  const loading = eager ? 'eager' : 'lazy';
  const fetchPriority = eager ? 'high' : 'auto';
  if (!family) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
      />
    );
  }
  const avifSrcSet = family.widths.map((width) => `/images/generated/${family.name}-${width}.avif ${width}w`).join(', ');
  const webpSrcSet = family.widths.map((width) => `/images/generated/${family.name}-${width}.webp ${width}w`).join(', ');
  const fallbackWidth = family.widths[Math.min(1, family.widths.length - 1)];
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
      <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
      <img
        src={`/images/generated/${family.name}-${fallbackWidth}.webp`}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
      />
    </picture>
  );
}
