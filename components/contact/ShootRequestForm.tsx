'use client';

// allow: SIZE_OK — The controlled request/abort/token state machine stays together;
// SDK lifecycle is isolated in ShootRequestCaptcha, and task 7 owns integration tests before further extraction.

import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { getContactConfig } from '@/lib/contact/config';
import {
  FIELD_ORDER, REQUIRED_FIELDS, NOTICES_INTRO, NOTICES, REQUEST_TIMEOUT_MS,
  validateRequest, buildPayload, submitRequest,
} from '@/lib/contact/request';
import type { FieldKey, RequestErrors, ShootRequestValues, SubmitResult } from '@/lib/contact/request';
import type { ShootRequestDismissalState } from './ShootRequestModal';
import type HCaptchaInstance from '@hcaptcha/react-hcaptcha';
import { ShootRequestCaptcha } from './ShootRequestCaptcha';
import type { ShootRequestCaptchaSlot } from './ShootRequestCaptcha';
export type { ShootRequestCaptchaSlot } from './ShootRequestCaptcha';

const EMPTY_VALUES: ShootRequestValues = {
  applicant: '', eventName: '', email: '', phone: '', otherContact: '',
  eventDate: '', startTime: '', endTime: '', eventDetails: '', notes: '',
};
const FIELDS = {
  applicant: { label: '申請單位/申請人', type: 'text', autoComplete: 'organization' },
  eventName: { label: '活動名稱', type: 'text', autoComplete: undefined },
  email: { label: 'Email', type: 'email', autoComplete: 'email' },
  phone: { label: '電話號碼（非必填）', type: 'tel', autoComplete: 'tel' },
  otherContact: { label: '其他聯絡方式（建議填寫以利快速溝通）', type: 'text', autoComplete: undefined },
  eventDate: { label: '活動日期', type: 'date', autoComplete: undefined },
  startTime: { label: '活動時段', type: 'time', autoComplete: undefined },
  endTime: { label: '至', type: 'time', autoComplete: undefined },
  eventDetails: { label: '活動性質與詳情', type: 'textarea', autoComplete: undefined },
  notes: { label: '備註（非必填）', type: 'textarea', autoComplete: undefined },
} as const;
const COPY = {
  accepted: '申請已送出，我們會依申請須知與你聯絡。送出不代表已確認接拍。',
  general: '目前無法完成送出，填寫內容仍保留。請稍後再試，或改用 Email 聯絡。',
  rateLimited: '送出過於頻繁，請稍後再試，或改用 Email 聯絡。',
  timeout: '尚未確認送出結果，請先確認是否已送出，或改用 Email 聯絡，避免重複申請。',
  captcha: '請先完成人機驗證，再送出申請。',
} as const;
const CONTROL = 'block min-h-12 w-full min-w-0 rounded-none border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-3 text-base leading-normal text-[var(--color-ink)] disabled:opacity-60';
const ACTION = 'inline-flex min-h-12 items-center justify-center px-6 py-3 text-base disabled:cursor-not-allowed disabled:opacity-60';

type FormState =
  | { readonly status: 'idle' | 'submitting' | 'accepted' }
  | { readonly status: 'error'; readonly message: string };

export type ShootRequestFormProps = {
  readonly onClose: () => void;
  readonly onDismissalStateChange?: (state: ShootRequestDismissalState) => void;
  // Parent connects this handler to ShootRequestModal.onCancelPending.
  readonly onCancelPendingChange?: (cancel: (() => void) | null) => void;
  readonly onCaptchaReset?: () => void;
  readonly onChallengeOpenChange?: (open: boolean) => void;
  readonly captchaSlot?: ReactNode | ((controls: ShootRequestCaptchaSlot) => ReactNode);
  readonly fetchImpl?: typeof fetch;
};

export default function ShootRequestForm({
  onClose, onDismissalStateChange, onCancelPendingChange, onCaptchaReset, onChallengeOpenChange, captchaSlot, fetchImpl,
}: ShootRequestFormProps) {
  const [config] = useState(getContactConfig);
  const [values, setValues] = useState<ShootRequestValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<RequestErrors>({});
  const [state, setState] = useState<FormState>({ status: 'idle' });
  const [botcheck, setBotcheck] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const token = useRef('');
  const generation = useRef(0);
  const captchaRef = useRef<HCaptchaInstance | null>(null);
  const mounted = useRef(false);
  const closed = useRef(false);
  const submitting = useRef(false);
  const attempt = useRef<{ controller: AbortController; timer: ReturnType<typeof setTimeout> } | null>(null);
  const fields = useRef<Partial<Record<FieldKey, HTMLInputElement | HTMLTextAreaElement>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const focusApplicant = useRef(false);
  const dirty = botcheck || FIELD_ORDER.some((key) => values[key] !== '');
  const dismissalState: ShootRequestDismissalState = state.status === 'accepted' ? 'accepted'
    : state.status === 'submitting' ? 'submitting' : dirty ? 'dirty' : 'pristine';
  const reportDismissal = useEffectEvent((next: ShootRequestDismissalState) => onDismissalStateChange?.(next));
  const registerCancel = useEffectEvent((cancel: (() => void) | null) => onCancelPendingChange?.(cancel));
  const closeChallenge = useEffectEvent(() => onChallengeOpenChange?.(false));
  const resetCaptcha = () => {
    token.current = '';
    generation.current += 1;
    captchaRef.current?.resetCaptcha();
    setCaptchaToken('');
    setResetKey(generation.current);
    onChallengeOpenChange?.(false);
    onCaptchaReset?.();
  };
  const cancelPending = useCallback(() => {
    closed.current = true;
    token.current = '';
    generation.current += 1;
    if (mounted.current) setResetKey(generation.current);
    captchaRef.current?.resetCaptcha();
    const current = attempt.current;
    attempt.current = null;
    if (current) {
      clearTimeout(current.timer);
      current.controller.abort();
    }
    submitting.current = false;
  }, []);
  // Called only by the captcha slot mounted inside the configured, open form.
  const loadCaptcha = useCallback(() => import('@hcaptcha/react-hcaptcha'), []);

  useEffect(() => {
    mounted.current = true;
    closed.current = false;
    // StrictMode replays cleanup without resetting refs; remount the current generation.
    setResetKey(generation.current);
    registerCancel(cancelPending);
    return () => {
      mounted.current = false;
      cancelPending();
      closeChallenge();
      registerCancel(null);
    };
  }, [cancelPending]);
  useEffect(() => { reportDismissal(dismissalState); }, [dismissalState]);
  useEffect(() => {
    if (state.status === 'idle' && focusApplicant.current) {
      focusApplicant.current = false;
      fields.current.applicant?.focus();
    }
    if (state.status !== 'accepted' && state.status !== 'error') return;
    const firstInvalid = FIELD_ORDER.find((key) => errors[key]);
    if (firstInvalid) fields.current[firstInvalid]?.focus();
    else resultHeading.current?.focus();
  }, [state, errors]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config.available || closed.current || submitting.current || state.status === 'accepted') return;
    const nextErrors = validateRequest(values, { botcheck });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setState({ status: 'error', message: nextErrors.botcheck ?? '請檢查必填欄位與格式後再送出。' });
      return;
    }
    if (!token.current) {
      setState({ status: 'error', message: COPY.captcha });
      return;
    }
    submitting.current = true;
    setState({ status: 'submitting' });
    const controller = new AbortController();
    const finish = (result: SubmitResult) => {
      if (!mounted.current || closed.current || attempt.current?.controller !== controller) return;
      clearTimeout(attempt.current.timer);
      attempt.current = null;
      submitting.current = false;
      resetCaptcha();
      switch (result.status) {
        case 'accepted':
          setValues(EMPTY_VALUES);
          setBotcheck(false);
          setState({ status: 'accepted' });
          return;
        case 'rate-limited': setState({ status: 'error', message: COPY.rateLimited }); return;
        case 'aborted': setState({ status: 'error', message: COPY.timeout }); return;
        case 'rejected':
        case 'network':
        case 'invalid-response': setState({ status: 'error', message: COPY.general }); return;
        default: { const exhaustive: never = result; return exhaustive; }
      }
    };
    // Settle locally even if an injected transport ignores AbortSignal; late results cannot win.
    const timer = setTimeout(() => {
      controller.abort();
      finish({ status: 'aborted' });
    }, REQUEST_TIMEOUT_MS);
    attempt.current = { controller, timer };
    const payload = buildPayload(values, { accessKey: config.accessKey, captchaToken: token.current, botcheck });
    finish(await submitRequest(payload, { fetchImpl: fetchImpl ?? fetch.bind(globalThis), signal: controller.signal }));
  };
  const newForm = () => {
    setValues(EMPTY_VALUES);
    setErrors({});
    setBotcheck(false);
    resetCaptcha();
    focusApplicant.current = true;
    setState({ status: 'idle' });
  };
  const emailFallback = <a className="inline-flex min-h-12 items-center break-all text-base text-[var(--color-blue)] underline underline-offset-4" href="mailto:contact@nehsnepc.com">contact@nehsnepc.com</a>;
  const controls: ShootRequestCaptchaSlot = {
    onVerify: (next) => {
      if (!mounted.current || closed.current || submitting.current || generation.current !== resetKey) return;
      token.current = next.trim();
      setCaptchaToken(token.current);
    },
    onInvalidate: () => {
      if (generation.current !== resetKey) return;
      token.current = '';
      setCaptchaToken('');
    },
    resetKey, submitting: state.status === 'submitting', loadCaptcha,
  };

  return (
    <section className="min-w-0 space-y-8 p-6 text-[var(--color-ink)] max-[767px]:p-4" aria-labelledby="shoot-request-title">
      <h2 id="shoot-request-title" className="text-3xl leading-tight font-semibold text-[var(--color-blue)]">接拍申請</h2>
      {!config.available ? <div className="space-y-4"><p role="status">表單暫時無法使用，請改用 Email 聯絡。</p>{emailFallback}</div>
        : state.status === 'accepted' ? (
          <div className="space-y-6" role="status">
            <h3 ref={resultHeading} tabIndex={-1} className="text-xl leading-relaxed">{COPY.accepted}</h3>
            <div className="flex flex-wrap gap-4">
              <button type="button" className={`${ACTION} bg-[var(--color-red)] text-[var(--color-paper)]`} onClick={onClose}>Close / 關閉</button>
              <button type="button" className={`${ACTION} border border-[var(--color-line)] hover:bg-[var(--color-line-soft)]`} onClick={newForm}>再填一份</button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 border-y border-[var(--color-line)] py-6 text-base leading-relaxed">
              <p>{NOTICES_INTRO}</p>
              <ol className="list-decimal space-y-3 pl-6">{NOTICES.map((notice) => <li key={notice}>{notice}</li>)}</ol>
            </div>
            <form noValidate onSubmit={handleSubmit} className="space-y-8" aria-busy={state.status === 'submitting'}>
              <p className="text-sm text-[var(--color-muted)]">標示「必填」的欄位請務必填寫。</p>
              <fieldset disabled={state.status === 'submitting'} className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-6 max-[767px]:grid-cols-1">
                <legend className="sr-only">接拍申請資料</legend>
                {FIELD_ORDER.map((key) => {
                  const field = FIELDS[key];
                  const required = REQUIRED_FIELDS.includes(key);
                  const id = `shoot-request-${key}`;
                  const props = {
                    id, name: key, required, value: values[key], autoComplete: field.autoComplete,
                    'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `${id}-error` : undefined,
                    className: CONTROL,
                    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((current) => ({ ...current, [key]: event.target.value })),
                    ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => { if (element) fields.current[key] = element; else delete fields.current[key]; },
                  };
                  return (
                    <div key={key} className={`flex min-w-0 flex-col gap-2 ${field.type === 'textarea' ? 'col-span-full' : ''}`}>
                      <label htmlFor={id} className="block flex-1 text-base leading-relaxed">{field.label}{required ? <span className="ml-2 text-sm text-[var(--color-muted)]">（必填）</span> : null}</label>
                      {field.type === 'textarea' ? <textarea {...props} rows={key === 'notes' ? 3 : 5} /> : <input {...props} type={field.type} />}
                      {errors[key] ? <p id={`${id}-error`} role="alert" className="text-sm leading-relaxed">{errors[key]}</p> : null}
                    </div>
                  );
                })}
              </fieldset>
              <div hidden><input type="checkbox" name="botcheck" checked={botcheck} tabIndex={-1} onChange={(event) => setBotcheck(event.target.checked)} /></div>
              <fieldset className="min-w-0 space-y-3">
                <legend className="sr-only">人機驗證</legend>
                {typeof captchaSlot === 'function' ? captchaSlot(controls) : captchaSlot ?? <ShootRequestCaptcha
                  key={resetKey} {...controls} captchaRef={captchaRef} onRetry={resetCaptcha}
                  onChallengeOpenChange={(open) => {
                    if (mounted.current && !closed.current && generation.current === resetKey) onChallengeOpenChange?.(open);
                  }}
                />}
                {!captchaToken ? <p id="shoot-request-captcha-help" className="text-sm leading-relaxed">{COPY.captcha}</p> : null}
              </fieldset>
              <div className="space-y-3 border-t border-[var(--color-line)] pt-6 text-sm leading-relaxed">
                <p>送出後，資料將由 Web3Forms 處理並通知本社，僅用於接拍聯繫。請勿填寫敏感個人資料。</p>
                <a href="https://web3forms.com/privacy" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center text-[var(--color-blue)] underline underline-offset-4">Web3Forms 隱私權政策（另開視窗）</a>
                <p>關閉後，尚未送出的內容將不會保留。停止等待不代表已取消送出。</p>
              </div>
              {state.status === 'error' ? <div role="alert"><h3 ref={resultHeading} tabIndex={-1} className="text-base leading-relaxed">{state.message}</h3></div> : null}
              {state.status === 'submitting' ? <p role="status">送出中…</p> : null}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <button type="submit" disabled={state.status === 'submitting'} aria-describedby={!captchaToken ? 'shoot-request-captcha-help' : undefined} className={`${ACTION} bg-[var(--color-red)] text-[var(--color-paper)] hover:bg-[var(--color-ink)]`}>{state.status === 'submitting' ? '送出中…' : '送出申請'}</button>
                {emailFallback}
              </div>
            </form>
          </>
        )}
    </section>
  );
}
