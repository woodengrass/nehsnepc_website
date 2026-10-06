'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type HCaptchaInstance from '@hcaptcha/react-hcaptcha';
import { HCAPTCHA_SITEKEY } from '@/lib/contact/config';

export type ShootRequestCaptchaSlot = {
  readonly onVerify: (token: string) => void;
  readonly onInvalidate: () => void;
  readonly resetKey: number;
  readonly submitting: boolean;
  readonly loadCaptcha: () => Promise<typeof import('@hcaptcha/react-hcaptcha')>;
};
type CaptchaProps = ShootRequestCaptchaSlot & {
  readonly captchaRef: RefObject<HCaptchaInstance | null>;
  readonly onRetry: () => void;
  readonly onChallengeOpenChange: (open: boolean) => void;
};
const SERVICE_ERROR = '驗證服務無法載入，請稍後重試，或改用 Email 聯絡。';

// Isolate SDK loading/recovery from the controlled request form. The official
// loader shares its promise per window and evicts failed loads; cleanup removes
// failed script tags. Never inject another SDK or delete its global ourselves.
export function ShootRequestCaptcha({
  loadCaptcha, captchaRef, resetKey, submitting, onVerify, onInvalidate,
  onRetry, onChallengeOpenChange,
}: CaptchaProps) {
  const [HCaptcha, setHCaptcha] = useState<typeof import('@hcaptcha/react-hcaptcha').default | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const failed = useRef(false);
  const fail = () => {
    failed.current = true;
    setReady(false);
    setMessage(SERVICE_ERROR);
    onInvalidate();
    onChallengeOpenChange(false);
  };
  const failLoading = useEffectEvent(fail);
  useEffect(() => {
    let active = true;
    void loadCaptcha().then(
      (module) => { if (active) setHCaptcha(() => module.default); },
      // Import rejection is an external chunk-loading boundary, just like SDK failure.
      () => { if (active) failLoading(); },
    );
    return () => { active = false; };
  }, [loadCaptcha]);
  const enable = () => { if (!failed.current) setReady(true); };
  const expire = () => {
    onInvalidate();
    setMessage('驗證已過期，請重新完成人機驗證。');
    onChallengeOpenChange(false);
  };

  return (
    <div className="min-w-0 space-y-3" aria-busy={!ready && !message}>
      {HCaptcha ? <HCaptcha
        key={resetKey} ref={captchaRef} sitekey={HCAPTCHA_SITEKEY}
        reCaptchaCompat={false} theme="light" size="compact"
        languageOverride="zh-TW" sentry={false} cleanup={true}
        onLoad={enable} onReady={enable}
        onVerify={(token) => {
          if (failed.current || submitting) return;
          setMessage('');
          onVerify(token);
        }}
        onExpire={expire} onChalExpired={expire} onError={fail}
        onOpen={() => onChallengeOpenChange(true)}
        onClose={() => onChallengeOpenChange(false)}
      /> : null}
      {!ready && !message ? <p role="status" className="text-sm leading-relaxed">人機驗證載入中，仍可繼續填寫資料。</p> : null}
      {message ? <p role="alert" className="text-sm leading-relaxed">{message}</p> : null}
      {failed.current ? <button type="button" disabled={submitting} onClick={onRetry}
        className="inline-flex min-h-12 items-center text-base underline underline-offset-4">重試人機驗證</button> : null}
    </div>
  );
}
