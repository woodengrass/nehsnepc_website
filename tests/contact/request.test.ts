import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  FIELD_ORDER,
  NOTICES,
  NOTICES_INTRO,
  OPTIONAL_FIELDS,
  REQUEST_TIMEOUT_MS,
  REQUIRED_FIELDS,
  buildPayload,
  submitRequest,
  validateRequest,
  type ShootRequestValues,
  type Web3FormsPayload
} from '../../lib/contact/request';

function validValues(): ShootRequestValues {
  return {
    applicant: '測試社團',
    eventName: '迎新晚會',
    email: 'contact-test@example.com',
    phone: '0912-345-678',
    otherContact: 'LINE: test-line',
    eventDate: '2026-11-01',
    startTime: '18:00',
    endTime: '21:00',
    eventDetails: '室內舞台活動\n需要兩位攝影',
    notes: '可提早半小時進場'
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

interface FetchSpy {
  fetchImpl: typeof fetch;
  calls: number;
  lastUrl: string | null;
  lastInit: RequestInit | null;
}

function spyOnFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): FetchSpy {
  const spy: FetchSpy = {
    calls: 0,
    lastUrl: null,
    lastInit: null,
    fetchImpl: (async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      spy.calls += 1;
      spy.lastUrl = String(url);
      spy.lastInit = init ?? null;
      return handler(String(url), init);
    }) as typeof fetch
  };
  return spy;
}

const META = { accessKey: '00000000-0000-4000-8000-000000000001', captchaToken: 'test-captcha-token' };

describe('request field contract', () => {
  it('exposes ten fields in order with seven required and three optional', () => {
    assert.deepEqual([...FIELD_ORDER], [
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
    ]);
    assert.deepEqual([...REQUIRED_FIELDS], [
      'applicant',
      'eventName',
      'email',
      'eventDate',
      'startTime',
      'endTime',
      'eventDetails'
    ]);
    assert.deepEqual([...OPTIONAL_FIELDS], ['phone', 'otherContact', 'notes']);
    assert.equal(new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]).size, 10);
  });

  it('keeps the intro copy and four notices verbatim', () => {
    assert.equal(NOTICES_INTRO, '以下為接拍申請須知，請仔細閱讀後再申請，感謝理解');
    assert.deepEqual([...NOTICES], [
      '申請期限：請於活動7天以前完成申請，我們會在活動五天前告知能否協拍',
      '接拍價格：我方會依據詳細情況提供報價，價格確認以雙方協商為準',
      '作品繳交：拍攝包含基本照片後製，視活動性質在活動前會告知繳交時間',
      '其他服務：若有特殊需求，例如縮短交稿期限、特殊後製、燈具準備等，需視情況另外討論'
    ]);
  });

  it('valid request preserves all fields and notices', () => {
    const errors = validateRequest(validValues());
    assert.deepEqual(errors, {});
  });

  it('whitespace-only required fields fail with keyed errors', () => {
    const values = validValues();
    values.applicant = '   ';
    values.eventName = ' ';
    values.email = '  ';
    values.eventDate = '';
    values.startTime = ' ';
    values.endTime = '';
    values.eventDetails = '   ';
    const errors = validateRequest(values);
    for (const key of REQUIRED_FIELDS) {
      assert.ok(typeof errors[key] === 'string' && (errors[key] as string).length > 0, `missing error for ${key}`);
    }
    assert.equal(errors.phone, undefined);
    assert.equal(errors.otherContact, undefined);
    assert.equal(errors.notes, undefined);
  });

  it('invalid email fails while optional fields stay valid when empty', () => {
    const values = validValues();
    values.email = 'not-an-email';
    values.phone = '';
    values.otherContact = '';
    values.notes = '';
    const errors = validateRequest(values);
    assert.ok(typeof errors.email === 'string');
    assert.equal(errors.phone, undefined);
    assert.equal(errors.otherContact, undefined);
    assert.equal(errors.notes, undefined);
  });
});

describe('date and time semantics', () => {
  it('rejects invalid calendar dates but accepts real ones', () => {
    const bad = validValues();
    bad.eventDate = '2026-02-30';
    assert.ok(typeof validateRequest(bad).eventDate === 'string');

    const badSyntax = validValues();
    badSyntax.eventDate = '2026/11/01';
    assert.ok(typeof validateRequest(badSyntax).eventDate === 'string');

    const leap = validValues();
    leap.eventDate = '2024-02-29';
    assert.equal(validateRequest(leap).eventDate, undefined);
  });

  it('rejects malformed times', () => {
    const values = validValues();
    values.startTime = '25:00';
    values.endTime = '18-00';
    const errors = validateRequest(values);
    assert.ok(typeof errors.startTime === 'string');
    assert.ok(typeof errors.endTime === 'string');
  });

  it('allows cross-midnight ranges without end-before-start rejection', () => {
    const values = validValues();
    values.startTime = '22:00';
    values.endTime = '01:00';
    assert.deepEqual(validateRequest(values), {});
  });
});

describe('payload builder', () => {
  it('serializes exact allowed keys with matching email and replyto', () => {
    const payload = buildPayload(validValues(), META);
    const keys = Object.keys(payload).sort();
    assert.deepEqual(keys, [
      'access_key',
      'from_name',
      'h-captcha-response',
      'subject',
      'botcheck',
      'email',
      'replyto',
      '備註',
      '其他聯絡方式',
      '活動名稱',
      '活動日期',
      '活動性質與詳情',
      '活動結束時間',
      '活動開始時間',
      '申請單位/申請人',
      '電話號碼'
    ].sort());
    assert.equal(payload.email, 'contact-test@example.com');
    assert.equal(payload.replyto, payload.email);
    assert.equal(payload.subject, 'NEHS NEPC｜接拍申請');
    assert.equal(payload.from_name, 'NEHS NEPC 接拍申請');
    assert.equal(payload.botcheck, false);
    for (const forbidden of ['redirect', 'cc', 'to', 'autoresponse', 'webhook']) {
      assert.ok(!(forbidden in payload), `forbidden key ${forbidden} present`);
    }
  });

  it('omits empty optional custom values and trims input', () => {
    const values = validValues();
    values.phone = '   ';
    values.otherContact = '';
    values.notes = '  ';
    values.applicant = '  測試社團  ';
    const payload = buildPayload(values, META);
    assert.ok(!('電話號碼' in payload));
    assert.ok(!('其他聯絡方式' in payload));
    assert.ok(!('備註' in payload));
    assert.equal(payload['申請單位/申請人'], '測試社團');
  });

  it('preserves textarea newlines', () => {
    const payload = buildPayload(validValues(), META);
    assert.equal(payload['活動性質與詳情'], '室內舞台活動\n需要兩位攝影');
  });

  it('serializes botcheck false when unchecked', () => {
    const payload = buildPayload(validValues(), { ...META, botcheck: false });
    assert.equal(payload.botcheck, false);
  });
});

describe('botcheck honeypot', () => {
  it('rejects locally when checked without issuing a request', async () => {
    const values = validValues();
    const errors = validateRequest(values, { botcheck: true });
    assert.ok(typeof errors.botcheck === 'string');

    const payload: Web3FormsPayload = buildPayload(values, { ...META, botcheck: true });
    assert.equal(payload.botcheck, true);
    const spy = spyOnFetch(() => jsonResponse({ success: true }));
    const result = await submitRequest(payload, { fetchImpl: spy.fetchImpl });
    assert.deepEqual(result, { status: 'rejected', httpStatus: 400 });
    assert.equal(spy.calls, 0);
  });
});

describe('submitRequest outcomes', () => {
  it('200 success true is accepted with exactly one request', async () => {
    const spy = spyOnFetch(() => jsonResponse({ success: true }));
    const result = await submitRequest(buildPayload(validValues(), META), { fetchImpl: spy.fetchImpl });
    assert.deepEqual(result, { status: 'accepted' });
    assert.equal(spy.calls, 1);
    assert.equal(spy.lastUrl, 'https://api.web3forms.com/submit');
  });

  it('200 success false is rejected', async () => {
    const spy = spyOnFetch(() => jsonResponse({ success: false }));
    const result = await submitRequest(buildPayload(validValues(), META), { fetchImpl: spy.fetchImpl });
    assert.deepEqual(result, { status: 'rejected', httpStatus: 200 });
    assert.equal(spy.calls, 1);
  });

  it('HTTP failure with success true is rejected because status governs', async () => {
    const spy = spyOnFetch(() => jsonResponse({ success: true }, 500));
    const result = await submitRequest(buildPayload(validValues(), META), { fetchImpl: spy.fetchImpl });
    assert.deepEqual(result, { status: 'rejected', httpStatus: 500 });
    assert.equal(spy.calls, 1);
  });

  it('429 is rate-limited', async () => {
    const spy = spyOnFetch(() => jsonResponse({ success: false }, 429));
    const result = await submitRequest(buildPayload(validValues(), META), { fetchImpl: spy.fetchImpl });
    assert.deepEqual(result, { status: 'rate-limited', httpStatus: 429 });
    assert.equal(spy.calls, 1);
  });

  it('malformed JSON is an invalid response', async () => {
    const spy = spyOnFetch(() => new Response('not json{{{', { status: 200 }));
    const result = await submitRequest(buildPayload(validValues(), META), { fetchImpl: spy.fetchImpl });
    assert.deepEqual(result, { status: 'invalid-response', httpStatus: 200 });
    assert.equal(spy.calls, 1);
  });

  it('unknown response shape is never accepted', async () => {
    for (const shape of [{ ok: true }, [1, 2], null, 'success', { success: 'yes' }]) {
      const spy = spyOnFetch(() => jsonResponse(shape));
      const result = await submitRequest(buildPayload(validValues(), META), { fetchImpl: spy.fetchImpl });
      assert.deepEqual(result, { status: 'invalid-response', httpStatus: 200 });
      assert.equal(spy.calls, 1);
    }
  });

  it('tolerates provider message variants with local copy only', async () => {
    const withBody = spyOnFetch(() => jsonResponse({ success: true, body: { message: 'Form submitted' } }));
    assert.deepEqual(
      await submitRequest(buildPayload(validValues(), META), { fetchImpl: withBody.fetchImpl }),
      { status: 'accepted' }
    );
    const withTop = spyOnFetch(() => jsonResponse({ success: true, message: '<b>raw html</b>' }));
    const result = await submitRequest(buildPayload(validValues(), META), { fetchImpl: withTop.fetchImpl });
    assert.deepEqual(result, { status: 'accepted' });
    assert.ok(!('message' in result), 'raw provider message must not surface in the typed result');
  });

  it('transport failure is a network result', async () => {
    const spy = spyOnFetch(() => {
      throw new TypeError('fetch failed');
    });
    const result = await submitRequest(buildPayload(validValues(), META), { fetchImpl: spy.fetchImpl });
    assert.deepEqual(result, { status: 'network' });
    assert.equal(spy.calls, 1);
  });

  it('abort is reported as aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const spy = spyOnFetch(() => {
      throw new DOMException('The operation was aborted.', 'AbortError');
    });
    const result = await submitRequest(buildPayload(validValues(), META), {
      fetchImpl: spy.fetchImpl,
      signal: controller.signal
    });
    assert.deepEqual(result, { status: 'aborted' });
    assert.equal(spy.calls, 1);
  });

  it('documents the 20 second caller-owned timeout contract', () => {
    assert.equal(REQUEST_TIMEOUT_MS, 20_000);
  });
});
