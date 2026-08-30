'use client';

import { useEffect, useRef, useState } from 'react';

type Model3DProps = {
  src: string;
  alt: string;
  poster?: string;
  caption?: string;
  aspect?: string;
  autoRotate?: boolean;
  exposure?: number;
  interactionPrompt?: string;
};

export default function Model3D({
  src,
  alt,
  poster,
  caption,
  aspect = '4 / 3',
  autoRotate = false,
  exposure = 1,
  interactionPrompt = 'DRAG TO ROTATE / 拖曳旋轉'
}: Model3DProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);
  const [interacted, setInteracted] = useState(false);

  // 進入可視範圍附近才載入 model-viewer runtime（~1MB），首屏與行動裝置零成本。
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px 0px' }
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    import('@google/model-viewer').catch(() => {
      if (!cancelled) setModelFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldLoad]);

  const attachViewer = (element: HTMLElement | null) => {
    viewerRef.current = element;
    if (element) {
      element.addEventListener('load', () => setModelLoaded(true));
      element.addEventListener('error', () => setModelFailed(true));
    }
  };

  return (
    <figure className={`
      article-model
    `}>
      <div
        ref={frameRef}
        className={`
          relative
          aspect-[4/3]
          w-full
          overflow-hidden
          border
          border-[var(--color-line)]
          bg-[#0d0d0d]
          [touch-action:pan-y]
          ${interacted
            ? `
              [&_.model-hint]:opacity-0
            `
            : ''}
          [&>model-viewer]:h-full
          [&>model-viewer]:w-full
          [&>model-viewer]:[--poster-color:transparent]
        `}
        style={{ aspectRatio: aspect }}
        onPointerDown={() => setInteracted(true)}
      >
        {shouldLoad ? (
          <model-viewer
            ref={attachViewer}
            src={src}
            alt={alt}
            camera-controls
            loading="lazy"
            auto-rotate={autoRotate ? true : undefined}
            touch-action="pan-y"
            environment-image="neutral"
            shadow-intensity="1"
            exposure={String(exposure)}
          />
        ) : null}
        {poster && !modelLoaded ? (
          <img
            className={`
              absolute
              inset-0
              h-full
              w-full
              grayscale-[0.7]
              brightness-[0.72]
              transition-opacity
              duration-[var(--transition-slow)]
            `}
            src={poster}
            alt=""
            loading="lazy"
          />
        ) : null}
        {!modelLoaded && !modelFailed ? (
          <span
            className={`
              model-hint
              pointer-events-none
              absolute
              bottom-4
              right-4
              bg-[var(--color-paper)]
              px-[0.6rem]
              py-[0.45rem]
              text-[0.6rem]
              uppercase
              tracking-[0.12em]
              text-[var(--color-ink)]
              transition-opacity
              duration-[var(--transition-fast)]
            `}
          >
            {interactionPrompt}
          </span>
        ) : null}
        {modelFailed ? (
          <span
            className={`
              model-hint
              pointer-events-none
              absolute
              bottom-4
              right-4
              bg-[var(--color-paper)]
              px-[0.6rem]
              py-[0.45rem]
              text-[0.6rem]
              uppercase
              tracking-[0.12em]
              text-[var(--color-ink)]
            `}
          >
            3D 預覽無法載入
          </span>
        ) : null}
      </div>
      {caption ? (
        <figcaption
          className={`
            mt-[0.8rem]
            text-right
            text-[0.68rem]
            tracking-[0.1em]
            text-[var(--color-muted)]
          `}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
