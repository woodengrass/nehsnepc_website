import { articleImageSet } from '@/lib/article-images';

type FigureProps = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

// 文章內文欄最寬 760px；手機上接近滿版。
const FIGURE_SIZES = '(max-width: 767px) 100vw, 760px';

// 內文圖片：managed 路徑走 manifest 量測寬度組出的響應式 <picture>，
// fallback <img> 指向序列化路徑本身（pipeline 在該路徑輸出 fallback 檔）。
// 非 managed 路徑沿用原 <img> 行為。Server-only：manifest 讀取走 node:fs，
// 編輯器即時預覽請用 client-safe 的 EditorFigurePreview。
// 照片是內容：不在這裡自動套濾鏡（見 AGENTS.md Photography）；<picture> 雖是
// display:contents 仍是 DOM 父層，所以樣式用後代選擇器才能同時套到兩條路徑。
export default function Figure({ src, alt, caption, width, height }: FigureProps) {
  const set = articleImageSet(src);
  return (
    <figure className={`
      article-figure
      my-[3em]
      [&_img]:h-auto
      [&_img]:w-full
      [&>figcaption]:mt-[0.8rem]
      [&>figcaption]:text-right
      [&>figcaption]:text-[0.68rem]
      [&>figcaption]:tracking-[0.1em]
      [&>figcaption]:text-[var(--color-muted)]
    `}>
      {set ? (
        <picture className="contents">
          <source type="image/avif" srcSet={set.avifSrcSet} sizes={FIGURE_SIZES} />
          <source type="image/webp" srcSet={set.webpSrcSet} sizes={FIGURE_SIZES} />
          <img
            src={set.fallbackSrc}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
          />
        </picture>
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
      )}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
