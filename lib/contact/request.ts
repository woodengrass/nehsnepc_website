/**
 * Shoot-request contract for the Web3Forms Free direct submission.
 *
 * Framework-free pure module: field types, verbatim notices, trimmed
 * validator, explicit-key payload builder and a typed direct-fetch helper.
 * The React form owns state/rendering; this module never touches the DOM,
 * imports no React/backend modules and reads no secrets.
 *
 * Binding contract: `.omo/plans/contact-web3forms.md` (field order/labels,
 * four verbatim notices, payload keys, 20s abort, no-auto-retry, token
 * one-use semantics for the caller).
 */

/** Ten public user fields in display order. */
export const FIELD_ORDER = [
  'applicant',
  'eventName',
  'email',
  'phone',
  'otherContact',
  'eventDate',
  'startTime',
  'endTime',
  'eventDetails',
  'notes'
] as const;

export type FieldKey = (typeof FIELD_ORDER)[number];

/** Fields the visitor must fill; the other three are optional. */
export const REQUIRED_FIELDS: readonly FieldKey[] = [
  'applicant',
  'eventName',
  'email',
  'eventDate',
  'startTime',
  'endTime',
  'eventDetails'
] as const;

export const OPTIONAL_FIELDS: readonly FieldKey[] = ['phone', 'otherContact', 'notes'] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];
export type OptionalField = (typeof OPTIONAL_FIELDS)[number];

/** Raw visitor input; display values are kept as entered. */
export interface ShootRequestValues {
  applicant: string;
  eventName: string;
  email: string;
  phone: string;
  otherContact: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  eventDetails: string;
  notes: string;
}

/** Introductory copy shown above the request notices. */
export const NOTICES_INTRO = '以下為接拍申請須知，請仔細閱讀後再申請，感謝理解' as const;

/** Four request notices, verbatim from the original public form. */
export const NOTICES: readonly [string, string, string, string] = [
  '申請期限：請於活動7天以前完成申請，我們會在活動五天前告知能否協拍',
  '接拍價格：我方會依據詳細情況提供報價，價格確認以雙方協商為準',
  '作品繳交：拍攝包含基本照片後製，視活動性質在活動前會告知繳交時間',
  '其他服務：若有特殊需求，例如縮短交稿期限、特殊後製、燈具準備等，需視情況另外討論'
] as const;

export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit' as const;
export const WEB3FORMS_SUBJECT = 'NEHS NEPC｜接拍申請' as const;
export const WEB3FORMS_FROM_NAME = 'NEHS NEPC 接拍申請' as const;

/**
 * Abort timeout for a submission POST in milliseconds.
 *
 * The caller owns the AbortController: start a 20s timer on submit, abort on
 * unmount/close, clear the timer on settle and ignore late results. Aborting
 * only stops the local wait; it does not undo a provider-side acceptance.
 * Never auto-retry a POST; every resend needs an explicit submit.
 */
export const REQUEST_TIMEOUT_MS = 20_000 as const;

/** Keyed validation errors; absent key means that field is valid. */
export type RequestErrors = Partial<Record<FieldKey | 'botcheck', string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isRealCalendarDate(text: string): boolean {
  const match = DATE_PATTERN.exec(text);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // Leap-year aware month length, no timezone conversion involved.
  const monthLength = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= monthLength;
}

/**
 * Validate request fields. Trims for validation (serialization trims the same
 * way) but never mutates the display values. Checks date/time syntax plus
 * real calendar date only: no timezone conversion, no past-date rejection,
 * no end-before-start rejection (cross-midnight stays representable).
 */
export function validateRequest(values: ShootRequestValues, options?: { botcheck?: boolean }): RequestErrors {
  const errors: RequestErrors = {};
  const trimmed: Record<FieldKey, string> = {
    applicant: values.applicant.trim(),
    eventName: values.eventName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    otherContact: values.otherContact.trim(),
    eventDate: values.eventDate.trim(),
    startTime: values.startTime.trim(),
    endTime: values.endTime.trim(),
    eventDetails: values.eventDetails.trim(),
    notes: values.notes.trim()
  };

  if (trimmed.applicant === '') errors.applicant = '請填寫申請單位/申請人';
  if (trimmed.eventName === '') errors.eventName = '請填寫活動名稱';

  if (trimmed.email === '') {
    errors.email = '請填寫 Email';
  } else if (!EMAIL_PATTERN.test(trimmed.email)) {
    errors.email = 'Email 格式不正確，請檢查後再試';
  }

  if (trimmed.eventDate === '') {
    errors.eventDate = '請選擇活動日期';
  } else if (!DATE_PATTERN.test(trimmed.eventDate)) {
    errors.eventDate = '活動日期格式不正確，請使用 YYYY-MM-DD';
  } else if (!isRealCalendarDate(trimmed.eventDate)) {
    errors.eventDate = '活動日期不是有效的日期，請檢查後再試';
  }

  if (trimmed.startTime === '') {
    errors.startTime = '請選擇活動開始時間';
  } else if (!TIME_PATTERN.test(trimmed.startTime)) {
    errors.startTime = '活動開始時間格式不正確，請使用 HH:mm';
  }

  if (trimmed.endTime === '') {
    errors.endTime = '請選擇活動結束時間';
  } else if (!TIME_PATTERN.test(trimmed.endTime)) {
    errors.endTime = '活動結束時間格式不正確，請使用 HH:mm';
  }

  if (trimmed.eventDetails === '') errors.eventDetails = '請填寫活動性質與詳情';

  if (options?.botcheck === true) errors.botcheck = '驗證未通過，請重新整理後再試';

  return errors;
}

export interface PayloadMeta {
  accessKey: string;
  captchaToken: string;
  botcheck?: boolean;
}

/**
 * Exact JSON payload sent to Web3Forms. Explicit allowed keys only;
 * optional custom values are omitted when empty. `email` and `replyto`
 * always carry the same trimmed address.
 */
export interface Web3FormsPayload {
  access_key: string;
  subject: string;
  from_name: string;
  email: string;
  replyto: string;
  'h-captcha-response': string;
  botcheck: boolean;
  '申請單位/申請人': string;
  '活動名稱': string;
  '電話號碼'?: string;
  '其他聯絡方式'?: string;
  '活動日期': string;
  '活動開始時間': string;
  '活動結束時間': string;
  '活動性質與詳情': string;
  '備註'?: string;
}

export function buildPayload(values: ShootRequestValues, meta: PayloadMeta): Web3FormsPayload {
  const email = values.email.trim();
  const payload: Web3FormsPayload = {
    access_key: meta.accessKey,
    subject: WEB3FORMS_SUBJECT,
    from_name: WEB3FORMS_FROM_NAME,
    email,
    replyto: email,
    'h-captcha-response': meta.captchaToken,
    botcheck: meta.botcheck ?? false,
    '申請單位/申請人': values.applicant.trim(),
    '活動名稱': values.eventName.trim(),
    '活動日期': values.eventDate.trim(),
    '活動開始時間': values.startTime.trim(),
    '活動結束時間': values.endTime.trim(),
    '活動性質與詳情': values.eventDetails.trim()
  };
  const phone = values.phone.trim();
  const otherContact = values.otherContact.trim();
  const notes = values.notes.trim();
  if (phone !== '') payload['電話號碼'] = phone;
  if (otherContact !== '') payload['其他聯絡方式'] = otherContact;
  if (notes !== '') payload['備註'] = notes;
  return payload;
}

/**
 * Exhaustive submission outcome. Only `response.ok` AND a parsed object
 * with `success === true` is `accepted`; HTTP status plus the success
 * boolean govern every branch. Provider message strings are never trusted
 * or rendered; the caller shows local Chinese copy instead.
 */
export type SubmitResult =
  | { status: 'accepted' }
  | { status: 'rejected'; httpStatus: number }
  | { status: 'rate-limited'; httpStatus: number }
  | { status: 'network' }
  | { status: 'invalid-response'; httpStatus?: number }
  | { status: 'aborted' };

export interface SubmitDeps {
  fetchImpl: typeof fetch;
  signal?: AbortSignal;
}

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted === true) return true;
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * POST an already-built payload to Web3Forms exactly once. The caller
 * injects `fetch` (tests) or passes the platform fetch, plus an
 * AbortSignal it aborts after REQUEST_TIMEOUT_MS or on unmount. A locally
 * tripped `botcheck` is rejected without issuing a request. Never retries.
 */
export async function submitRequest(payload: Web3FormsPayload, deps: SubmitDeps): Promise<SubmitResult> {
  if (payload.botcheck === true) {
    return { status: 'rejected', httpStatus: 400 };
  }

  let response: Response;
  try {
    response = await deps.fetchImpl(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: deps.signal
    });
  } catch (error) {
    if (isAbort(error, deps.signal)) return { status: 'aborted' };
    return { status: 'network' };
  }

  if (!response.ok) {
    if (response.status === 429) return { status: 'rate-limited', httpStatus: 429 };
    return { status: 'rejected', httpStatus: response.status };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: 'invalid-response', httpStatus: response.status };
  }

  if (typeof body !== 'object' || body === null) {
    return { status: 'invalid-response', httpStatus: response.status };
  }
  const success = (body as { success?: unknown }).success;
  if (success === true) return { status: 'accepted' };
  if (success === false) return { status: 'rejected', httpStatus: response.status };
  return { status: 'invalid-response', httpStatus: response.status };
}
