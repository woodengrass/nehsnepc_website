import { articleImageSet } from '@/lib/article-images';

type FigureProps = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

// 內文圖片：managed 路徑走 manifest 量測寬度組出的響應式 <picture>，
// fallback <img> 指向序列化路徑本身（pipeline 在該路徑輸出 fallback 檔）。
// 非 managed 路徑沿用原 <img> 行為。Server-only：manifest 讀取走 node:fs，
// 編輯器即時預覽請用 client-safe 的 EditorFigurePreview。
export default function Figure({ src, alt, caption, width, height }: FigureProps) {
  const set = articleImageSet(src);
  return (
    <figure className={`
      my-[3em]
      [&>img]:h-auto
      [&>img]:w-full
      [&>img]:grayscale-[0.4]
      [&>img]:contrast-[1.06]
      [&>img]:brightness-[0.9]
      [&>figcaption]:mt-[0.8rem]
      [&>figcaption]:text-right
      [&>figcaption]:text-[0.68rem]
      [&>figcaption]:tracking-[0.1em]
      [&>figcaption]:text-[var(--color-muted)]
    `}>
      {set ? (
        <picture className="contents">
          <source type="image/avif" srcSet={set.avifSrcSet} />
          <source type="image/webp" srcSet={set.webpSrcSet} />
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
