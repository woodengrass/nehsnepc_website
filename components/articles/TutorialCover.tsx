import { articleImageSet } from '@/lib/article-images';

type TutorialCoverProps = {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  eager?: boolean;
};

// 文章封面：managed 路徑（/images/generated/articles/<slug>/…）走 manifest
// 量測寬度組出的響應式 <picture>；未知路徑沿用原 <img> 行為。
// <picture> 使用 display:contents，不改變原有排版與 hover 動效。
export default function TutorialCover({ src, alt, className, sizes, eager = false }: TutorialCoverProps) {
  const set = articleImageSet(src);
  const loading = eager ? 'eager' : 'lazy';
  const fetchPriority = eager ? 'high' : 'auto';
  if (!set) {
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
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={set.avifSrcSet} sizes={sizes} />
      <source type="image/webp" srcSet={set.webpSrcSet} sizes={sizes} />
      <img
        src={set.fallbackSrc}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
      />
    </picture>
  );
}
