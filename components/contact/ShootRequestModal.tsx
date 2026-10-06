'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type ShootRequestDismissalState = 'pristine' | 'dirty' | 'submitting' | 'accepted';

type ShootRequestModalProps = {
  readonly onClose: () => void;
  readonly children?: ReactNode;
  readonly dismissalState?: ShootRequestDismissalState;
  readonly challengeOpen?: boolean;
  // Abort the local wait only; this does not retract a provider submission.
  readonly onCancelPending?: () => void;
};

function containsTrustedCaptcha(branch: HTMLElement): boolean {
  const frames = branch instanceof HTMLIFrameElement ? [branch] : Array.from(branch.querySelectorAll('iframe'));
  return frames.some((frame) => {
    try {
      const url = new URL(frame.src);
      return url.protocol === 'https:' &&
        (url.hostname === 'hcaptcha.com' || url.hostname.endsWith('.hcaptcha.com'));
    } catch (error) {
      if (error instanceof TypeError) return false;
      throw error;
    }
  });
}

export default function ShootRequestModal({
  onClose, children, dismissalState = 'pristine', challengeOpen = false, onCancelPending,
}: ShootRequestModalProps) {
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const modalBoxRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);

  const close = () => {
    onCancelPending?.();
    onClose();
  };
  const requestDismissal = () => {
    switch (dismissalState) {
      case 'pristine':
      case 'accepted': close(); return;
      case 'dirty':
      case 'submitting': setConfirming(true); return;
      default: {
        const exhaustive: never = dismissalState;
        return exhaustive;
      }
    }
  };
  const cancelConfirmation = () => {
    setConfirming(false);
    modalCloseRef.current?.focus({ preventScroll: true });
  };
  const cancelPendingOnExit = useEffectEvent(() => onCancelPending?.());
  const handleKeydown = useEffectEvent((event: KeyboardEvent) => {
    // Cross-origin frame events never reach this listener. Provider owns its challenge.
    if (event.defaultPrevented) return;
    if (event.key === 'Escape') {
      if (confirming) {
        event.preventDefault();
        cancelConfirmation();
      } else if (!challengeOpen) {
        event.preventDefault();
        requestDismissal();
      }
      return;
    }
    if (event.key !== 'Tab' || challengeOpen || !modalBoxRef.current) return;
    const focusable = Array.from(modalBoxRef.current.querySelectorAll<HTMLElement>(
      ':is(button, iframe, input:not([type="hidden"]), select, textarea, [href], [tabindex]):not(:disabled):not([tabindex="-1"])'
    )).filter((element) => element.tabIndex >= 0 && !element.closest('[inert], [hidden]') &&
      element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first && last) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last && first) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });

  useEffect(() => {
    if (confirming) continueRef.current?.focus({ preventScroll: true });
  }, [confirming]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    const hadModalLock = document.body.classList.contains('has-modal');
    const background = new Map<HTMLElement, boolean>();
    const isolate = (element: HTMLElement) => {
      if (containsTrustedCaptcha(element)) {
        for (const child of element.children) {
          if (child instanceof HTMLElement) isolate(child);
        }
        return;
      }
      background.set(element, element.inert);
      element.inert = true;
    };
    // Snapshot sibling branches along the dialog's ancestor path, not its ancestors.
    for (let branch: HTMLElement | null = dialog; branch && branch !== document.body; branch = branch.parentElement) {
      for (const sibling of branch.parentElement?.children ?? []) {
        if (sibling instanceof HTMLElement && sibling !== branch) isolate(sibling);
      }
    }
    // Release only our lock if a late trusted challenge appears inside an isolated branch.
    // Newly portalled body siblings stay untouched; never reapply inert to provider portals.
    const observer = new MutationObserver(() => {
      for (const [element, inert] of background) {
        if (!inert && containsTrustedCaptcha(element)) element.inert = false;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    document.body.classList.add('has-modal');
    modalCloseRef.current?.focus({ preventScroll: true });
    const listener = (event: KeyboardEvent) => handleKeydown(event);
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
      observer.disconnect();
      cancelPendingOnExit();
      for (const [element, inert] of background) element.inert = inert;
      document.body.classList.toggle('has-modal', hadModalLock);
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

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
      `}
      role="dialog"
      ref={dialogRef}
      id="shoot-request-dialog"
      aria-modal="true"
      aria-labelledby="shoot-request-dialog-title"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        className={`
          absolute
          inset-0
          bg-[rgba(9,9,9,0.86)]
          backdrop-blur-[9px]
        `}
        type="button"
        tabIndex={-1}
        aria-label="關閉表單"
        onClick={requestDismissal}
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
          max-[767px]:h-[calc(100dvh-4rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]
          max-[767px]:w-[calc(100vw-2rem)]
          max-[767px]:shadow-[0.7rem_0.7rem_0_var(--color-red)]
        `}
        ref={modalBoxRef}
      >
        <p
          id="shoot-request-dialog-title"
          className={`
            absolute
            top-[1.2rem]
            left-6
            right-32
            truncate
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
          type="button"
          onClick={requestDismissal}
          aria-label="關閉表單"
        >
          Close / 關閉
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {confirming ? (
            <section className="space-y-4 border-b border-[rgba(17,17,17,0.25)] p-6" aria-label="確認關閉表單">
              <p role="status">{dismissalState === 'submitting'
                ? '停止等待不代表已取消送出。' : '尚未送出的內容將不會保留。'}</p>
              <div className="flex flex-wrap gap-4">
                <button ref={continueRef} type="button" onClick={cancelConfirmation}>繼續填寫</button>
                <button type="button" onClick={close}>確認關閉</button>
              </div>
            </section>
          ) : null}
          <div inert={confirming}>{children}</div>
        </div>
      </div>
    </div>
  );
}
