'use client';

import { useEffect, useRef } from 'react';

const TALLY_EMBED_URL = 'https://tally.so/embed/NpRGgl?alignLeft=1&hideTitle=1';

export default function TallyModal({ onClose }: { onClose: () => void }) {
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const modalBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add('has-modal');
    modalCloseRef.current?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !modalBoxRef.current) return;
      const focusable = Array.from(modalBoxRef.current.querySelectorAll<HTMLElement>('button, iframe, [href], [tabindex]:not([tabindex="-1"])'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.classList.remove('has-modal');
    };
  }, [onClose]);

  return (
    <div
      className={`
        fixed
        inset-0
        z-950
        grid
        place-items-center
        transition-[opacity,visibility]
        duration-[260ms]
        ease-[cubic-bezier(0.22,1,0.36,1)]
        motion-reduce:transition-none
        visible
        pointer-events-auto
        opacity-100
      `}
      role="dialog"
      aria-modal="true"
      aria-label="接拍申請表單"
    >
      <div
        className={`
          absolute
          inset-0
          bg-[rgba(9,9,9,0.86)]
          backdrop-blur-[9px]
        `}
        onClick={onClose}
      />
      <div
        className={`
          relative
          z-1
          flex
          h-[min(680px,86svh)]
          w-[min(760px,90vw)]
          flex-col
          border
          border-[rgba(17,17,17,0.28)]
          bg-[var(--color-paper)]
          pt-[3.4rem]
          text-[var(--color-ink)]
          shadow-[1.3rem_1.3rem_0_var(--color-red)]
          max-[767px]:h-[calc(100svh-4rem)]
          max-[767px]:w-[calc(100vw-2rem)]
          max-[767px]:shadow-[0.7rem_0.7rem_0_var(--color-red)]
        `}
        ref={modalBoxRef}
      >
        <p
          className={`
            absolute
            top-[1.2rem]
            left-6
            text-[0.62rem]
            tracking-[0.14em]
            text-[rgba(17,17,17,0.58)]
            uppercase
            max-[767px]:left-[0.8rem]
          `}
        >
          02 / SHOOT REQUEST / 接拍申請
        </p>
        <button
          className={`
            absolute
            top-0
            right-0
            h-12
            min-w-28
            border-b
            border-l
            border-[rgba(17,17,17,0.25)]
            text-[0.6rem]
            tracking-[0.12em]
            uppercase
            hover:bg-[var(--color-blue)]
            hover:text-[var(--color-paper)]
          `}
          ref={modalCloseRef}
          onClick={onClose}
          aria-label="關閉表單"
        >
          Close / 關閉
        </button>
        <iframe
          src={TALLY_EMBED_URL}
          width="100%"
          height="100%"
          frameBorder={0}
          title="接拍申請表單"
          className={`
            min-h-0
            flex-1
            bg-white
          `}
        />
      </div>
    </div>
  );
}
