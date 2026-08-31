'use client';

import { useEffect, useRef } from 'react';

export default function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let frame: number | null = null;

    const update = () => {
      frame = null;
      const document_ = document.documentElement;
      const maxScroll = document_.scrollHeight - document_.clientHeight;
      const progress = maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };

    const scheduleUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className={`
        fixed
        inset-x-0
        top-0
        z-[900]
        h-[3px]
        pointer-events-none
        bg-[rgba(240,238,232,0.08)]
      `}
      aria-hidden="true"
    >
      <div
        className={`
          h-full
          w-full
          origin-left
          bg-[var(--color-red)]
          [transform:scaleX(0)]
        `}
        ref={barRef}
      />
    </div>
  );
}
