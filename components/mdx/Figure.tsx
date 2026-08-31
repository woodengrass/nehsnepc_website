type FigureProps = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

export default function Figure({ src, alt, caption, width, height }: FigureProps) {
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
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
