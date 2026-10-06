import type { Page } from '@playwright/test';
import { test, expect as fixtureExpect, SYNTHETIC_EMAIL, CAPTCHA_FRAME_URL } from './fixtures';
import { z } from 'zod';

// allow: SIZE_OK — One integration specification owns the task-4/5/6 scenario matrix;
// the task contract forbids splitting it into extra files or modifying shared fixtures.
const E = '.omo/evidence/contact-web3forms';
const expect = fixtureExpect.configure({ timeout: 5_000 });
const values = { applicant: ' 測試社團 ', eventName: '測試活動', email: SYNTHETIC_EMAIL,
  phone: 'test-phone', otherContact: 'test-contact', eventDate: '2026-11-01',
  startTime: '22:00', endTime: '01:00', eventDetails: '合法多行內容\n'.repeat(100), notes: '測試備註' } as const;
const field = (page: Page, key: string) => page.locator(`#shoot-request-${key}`);
const close = (page: Page) => page.locator('#shoot-request-dialog button[aria-label="關閉表單"]').last();
async function open(page: Page) {
  await page.goto('/contact');
  await page.locator('#shootTrigger').click();
  await expect(page.locator('#shoot-request-title')).toBeVisible();
}
async function fill(page: Page) {
  for (const [key, value] of Object.entries(values)) await field(page, key).fill(value);
}
async function ready(page: Page) {
  await expect(page.locator('iframe[title="hCaptcha test widget"]')).toHaveCount(1);
}
const traffic = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const urls: string[] = []; traffic.set(page, urls);
  page.on('request', (request) => urls.push(request.url()));
});
test.afterEach(async ({ page }) => {
  expect(traffic.get(page)?.filter((url) => /tally\.so|web3forms\.com\/client\/script/.test(url))).toEqual([]);
});

test('field parity: ten labels, required split, native types and notices', async ({ page }) => {
  // Given: the real configured form is lazily opened.
  await open(page);
  // When: inspect the rendered controls rather than the source constants.
  const controls = await page.locator('fieldset input:not([type="hidden"]), fieldset textarea').evaluateAll((nodes) =>
    nodes.filter((node) => node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement).map((node) => ({
      name: node.name, required: node.required, label: node.labels?.[0]?.textContent, type: node.type,
    })));
  // Then: seven required and three optional fields match the original public form.
  expect(controls.map((control) => control.name)).toEqual(Object.keys(values));
  expect(controls.filter((control) => control.required).map((control) => control.name)).toEqual(
    ['applicant', 'eventName', 'email', 'eventDate', 'startTime', 'endTime', 'eventDetails']);
  expect(controls.map((control) => control.label?.replace('（必填）', ''))).toEqual([
    '申請單位/申請人', '活動名稱', 'Email', '電話號碼（非必填）', '其他聯絡方式（建議填寫以利快速溝通）',
    '活動日期', '活動時段', '至', '活動性質與詳情', '備註（非必填）']);
  expect(controls.map((control) => control.type)).toEqual(['text', 'text', 'email', 'tel', 'text', 'date', 'time', 'time', 'textarea', 'textarea']);
  await expect(page.locator('#shoot-request-dialog ol li')).toHaveText([
    '申請期限：請於活動7天以前完成申請，我們會在活動五天前告知能否協拍',
    '接拍價格：我方會依據詳細情況提供報價，價格確認以雙方協商為準',
    '作品繳交：拍攝包含基本照片後製，視活動性質在活動前會告知繳交時間',
    '其他服務：若有特殊需求，例如縮短交稿期限、特殊後製、燈具準備等，需視情況另外討論']);
});

for (const invalid of ['missing', 'email'] as const) test(`local validation: ${invalid} retains text with zero POST`, async ({ page, contact }) => {
  // Given: valid text with one invalid required field and an already verified token.
  await open(page); await fill(page); await ready(page); await contact.captcha('verify');
  const key = invalid === 'missing' ? 'applicant' : 'email';
  await field(page, key).fill(invalid === 'missing' ? '   ' : 'invalid-email');
  // When: submit the invalid local data.
  await page.getByRole('button', { name: '送出申請', exact: true }).click();
  // Then: the first invalid field is focused/associated and no transport starts.
  await expect(field(page, key)).toBeFocused(); await expect(field(page, key)).toHaveAttribute('aria-invalid', 'true');
  await expect(field(page, key)).toHaveAttribute('aria-describedby', `shoot-request-${key}-error`);
  await expect(field(page, 'eventDetails')).toHaveValue(values.eventDetails); expect(contact.requests).toHaveLength(0);
});

test('form status: double-click single POST then accepted, reset and singleton SDK', async ({ page, contact }, info) => {
  // Given: a deferred response and a verified cross-origin test widget.
  await open(page); await fill(page); await ready(page);
  await page.frameLocator('iframe[title="hCaptcha test widget"]').getByRole('button', { name: 'Verify test captcha' }).click();
  // The frame click posts an asynchronous message; wait for the form to consume
  // the token before racing submits (enabled alone is not token-gated).
  await expect(page.locator('#shoot-request-captcha-help')).toHaveCount(0);
  const pending = contact.defer();
  // When: two synchronous user activations race before React disables the button.
  await page.getByRole('button', { name: '送出申請', exact: true }).evaluate((button) => {
    if (button instanceof HTMLButtonElement) { button.click(); button.click(); }
  });
  // Then: one request, disabled fields and busy status precede truthful acceptance.
  await expect.poll(() => contact.requests.length).toBe(1);
  await expect(page.locator('form')).toHaveAttribute('aria-busy', 'true'); await expect(field(page, 'email')).toBeDisabled();
  const payload = z.record(z.string(), z.unknown()).parse(contact.requests[0]?.postDataJSON());
  expect(payload).toMatchObject({ email: SYNTHETIC_EMAIL, replyto: SYNTHETIC_EMAIL, '申請單位/申請人': '測試社團',
    '活動名稱': values.eventName, '電話號碼': values.phone, '其他聯絡方式': values.otherContact,
    '活動日期': values.eventDate, '活動開始時間': '22:00', '活動結束時間': '01:00',
    '活動性質與詳情': values.eventDetails.trim(), '備註': values.notes, botcheck: false });
  expect(payload['h-captcha-response']).toMatch(/^contact-test-token-/);
  expect(Object.keys(payload).sort()).toEqual(['access_key', 'subject', 'from_name', 'email', 'replyto', 'h-captcha-response',
    'botcheck', '申請單位/申請人', '活動名稱', '電話號碼', '其他聯絡方式', '活動日期', '活動開始時間', '活動結束時間', '活動性質與詳情', '備註'].sort());
  pending.release();
  await expect(page.getByRole('heading', { name: '申請已送出，我們會依申請須知與你聯絡。送出不代表已確認接拍。' })).toBeFocused();
  await page.screenshot({ path: `${E}/last-two-double-click-accepted-${info.project.name}.png` });
  await expect(page.locator('form')).toHaveCount(0); await expect.poll(() => page.evaluate(() => window.contactCaptcha.ids().length)).toBe(0);
  await page.getByRole('button', { name: '再填一份' }).click(); await expect(field(page, 'applicant')).toBeFocused();
  for (const key of Object.keys(values)) await expect(field(page, key)).toHaveValue('');
  await ready(page); expect(contact.sdkRequests).toHaveLength(1);
});

for (const outcome of ['rejected', '500', '429', 'malformed', 'abort', 'stalled'] as const) {
  test(`submission outcomes: ${outcome} retains text, no auto-retry, fresh token needed`, async ({ page, contact }, info) => {
    // Given: one registered failure with a verified token and optional fields empty.
    await open(page); await fill(page); await ready(page); await contact.captcha('verify');
    for (const key of ['phone', 'otherContact', 'notes']) await field(page, key).fill('');
    await page.clock.install(); contact.enqueue(outcome);
    // When: submit once; a stalled transport reaches the actual 20-second timeout.
    await page.getByRole('button', { name: '送出申請', exact: true }).click();
    await expect.poll(() => contact.requests.length).toBe(1);
    if (outcome === 'stalled') await page.clock.fastForward(20_001);
    // Then: local error focus and unchanged text, with no automated resend or reused token.
    const message = outcome === '429' ? '送出過於頻繁，請稍後再試，或改用 Email 聯絡。'
      : outcome === 'stalled' ? '尚未確認送出結果，請先確認是否已送出，或改用 Email 聯絡，避免重複申請。'
      : '目前無法完成送出，填寫內容仍保留。請稍後再試，或改用 Email 聯絡。';
    await expect(page.getByRole('heading', { name: message })).toBeFocused();
    if (outcome === 'stalled') await page.screenshot({ path: `${E}/last-two-stalled-timeout-${info.project.name}.png` });
    await expect(field(page, 'eventDetails')).toHaveValue(values.eventDetails); await expect(field(page, 'applicant')).toHaveValue(values.applicant);
    await page.clock.fastForward(30_000); expect(contact.requests).toHaveLength(1);
    await page.getByRole('button', { name: '送出申請', exact: true }).click();
    await expect(page.getByRole('heading', { name: '請先完成人機驗證，再送出申請。' })).toBeFocused(); expect(contact.requests).toHaveLength(1);
    await ready(page); await contact.captcha('verify'); contact.enqueue('success');
    await page.getByRole('button', { name: '送出申請', exact: true }).click();
    await expect(page.getByRole('button', { name: '再填一份' })).toBeVisible(); expect(contact.requests).toHaveLength(2);
    expect(contact.requests[1]?.postDataJSON()['h-captcha-response']).not.toBe(contact.requests[0]?.postDataJSON()['h-captcha-response']);
  });
}

for (const event of ['expire', 'challenge-expire', 'error'] as const) test(`captcha lifecycle: ${event} invalidates verified token`, async ({ page, contact }) => {
  // Given: a verified, fully populated request.
  await open(page); await fill(page); await ready(page); await contact.captcha('verify');
  // When: the SDK reports loss of verification before submit.
  await contact.captcha(event); await page.getByRole('button', { name: '送出申請', exact: true }).click();
  // Then: no stale token can send; error requires explicit remount while expiry can reverify.
  expect(contact.requests).toHaveLength(0); await expect(field(page, 'eventDetails')).toHaveValue(values.eventDetails);
  await expect(page.getByRole('heading', { name: '請先完成人機驗證，再送出申請。' })).toBeFocused();
  if (event === 'error') {
    await expect(page.getByText('驗證服務無法載入，請稍後重試，或改用 Email 聯絡。')).toBeVisible();
    await contact.captcha('verify'); await page.getByRole('button', { name: '送出申請', exact: true }).click(); expect(contact.requests).toHaveLength(0);
    await page.getByRole('button', { name: '重試人機驗證' }).click(); await ready(page);
  } else await expect(page.getByText('驗證已過期，請重新完成人機驗證。')).toBeVisible();
  await contact.captcha('verify'); contact.enqueue('success'); await page.getByRole('button', { name: '送出申請', exact: true }).click();
  await expect(page.getByRole('button', { name: '再填一份' })).toBeVisible(); expect(contact.sdkRequests).toHaveLength(1);
});

test('captcha lifecycle: blocked script keeps fields editable, zero POST and explicit retry', async ({ page, contact }) => {
  // Given: the SDK route is blocked, not a runtime verification bypass.
  contact.blockCaptchaScript(); await open(page);
  // When: the loader fails and the visitor fills/submits anyway.
  await expect(page.getByText('驗證服務無法載入，請稍後重試，或改用 Email 聯絡。')).toBeVisible(); await fill(page);
  await page.getByRole('button', { name: '送出申請', exact: true }).click();
  // Then: text remains editable, fallback is usable, and retry never invents a token.
  expect(contact.requests).toHaveLength(0); await expect(field(page, 'email')).toBeEnabled();
  await expect(page.getByRole('link', { name: 'contact@nehsnepc.com', exact: true })).toHaveAttribute('href', 'mailto:contact@nehsnepc.com');
  const previousLoads = contact.sdkRequests.length;
  await page.getByRole('button', { name: '重試人機驗證' }).click();
  await expect.poll(() => contact.sdkRequests.length).toBeGreaterThan(previousLoads);
  await expect(page.getByText('驗證服務無法載入，請稍後重試，或改用 Email 聯絡。')).toBeVisible();
  expect(await page.locator('script[src^="https://js.hcaptcha.com/1/api.js"]').count()).toBeLessThanOrEqual(1);
  expect(contact.requests).toHaveLength(0);
});

test('responsive fields: grid, readable controls, scrolling and Close at reduced viewport', async ({ page }, info) => {
  // Given: each configured desktop/mobile/320px viewport renders the actual form.
  await open(page); await ready(page);
  // When: measure controls at their real responsive width.
  const metrics = await field(page, 'applicant').evaluate((node) => ({ font: parseFloat(getComputedStyle(node).fontSize), height: node.getBoundingClientRect().height }));
  // Then: readable targets fit, short fields pair only above 767px, Close stays pinned while scrolling.
  expect(metrics.font).toBeGreaterThanOrEqual(16); expect(metrics.height).toBeGreaterThanOrEqual(44);
  const first = await field(page, 'applicant').boundingBox(); const second = await field(page, 'eventName').boundingBox();
  expect(first && second && (page.viewportSize()?.width ?? 0) > 767 ? first.y === second.y : first && second && second.y > first.y).toBeTruthy();
  expect(await page.locator('#shoot-request-dialog').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: `${E}/task-4-${info.project.name}.png` });
  await field(page, 'notes').scrollIntoViewIfNeeded(); await expect(close(page)).toBeInViewport();
  await page.setViewportSize({ width: 320, height: 420 }); await expect(close(page)).toBeInViewport();
  await close(page).click(); await expect(page.locator('#shootTrigger')).toBeFocused();
});

test('modal lifecycle: Tab/Shift-Tab, all pristine close paths, reopen ×3, reduced motion and scroll', async ({ page, contact }) => {
  // Given: reduced motion and the original request trigger at its current scroll position.
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/contact');
  await page.locator('#shootTrigger').scrollIntoViewIfNeeded(); const scroll = await page.evaluate(() => window.scrollY);
  // When: repeatedly open and dismiss using each original affordance.
  for (let cycle = 0; cycle < 3; cycle++) for (const path of ['Close', 'Escape', 'backdrop']) {
    await page.locator('#shootTrigger').click(); await ready(page); await expect(close(page)).toBeFocused();
    await page.keyboard.press('Tab'); await expect(field(page, 'applicant')).toBeFocused();
    await close(page).focus(); await page.keyboard.press('Shift+Tab'); await expect(page.getByRole('link', { name: 'contact@nehsnepc.com', exact: true })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(close(page)).toBeFocused();
    if (path === 'Close') await close(page).click();
    else if (path === 'Escape') await page.keyboard.press('Escape');
    else await page.locator('#shoot-request-dialog button[aria-label="關閉表單"]').first().click({ position: { x: 2, y: 2 } });
    await expect(page.locator('#shoot-request-dialog')).toHaveCount(0); await expect(page.locator('#shootTrigger')).toBeFocused();
    await expect(page.locator('body')).not.toHaveClass(/has-modal/); expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  }
  expect(contact.sdkRequests).toHaveLength(1);
});

for (const path of ['Close', 'Escape', 'backdrop'] as const) test(`modal lifecycle: dirty ${path} confirms discard, cancel keeps text`, async ({ page }) => {
  // Given: dirty local text, with no provider request.
  await open(page); await field(page, 'applicant').fill('保留此內容');
  // When: a dismissal requests confirmation instead of losing work.
  if (path === 'Close') await close(page).click(); else if (path === 'Escape') await field(page, 'applicant').press('Escape');
  else await page.locator('#shoot-request-dialog button[aria-label="關閉表單"]').first().click({ position: { x: 2, y: 2 } });
  // Then: continue/Escape cancel confirmation; explicit discard resets on fresh mount.
  await expect(page.getByRole('button', { name: '繼續填寫' })).toBeFocused(); await page.keyboard.press('Escape');
  await expect(field(page, 'applicant')).toHaveValue('保留此內容'); await close(page).click();
  await page.getByRole('button', { name: '繼續填寫' }).click(); await expect(field(page, 'applicant')).toHaveValue('保留此內容');
  await close(page).click(); await page.getByRole('button', { name: '確認關閉', exact: true }).click();
  await expect(page.locator('#shootTrigger')).toBeFocused(); await page.locator('#shootTrigger').click(); await expect(field(page, 'applicant')).toHaveValue('');
});

test('background isolation: existing inert and scroll lock ownership restored', async ({ page }) => {
  // Given: a pre-inert branch and an existing owner's body lock.
  await page.goto('/contact'); await page.evaluate(() => {
    const branch = document.createElement('button'); branch.id = 'prior-inert'; branch.inert = true; document.body.append(branch);
    document.body.classList.add('has-modal');
  });
  // When: the real modal isolates the page then closes.
  await page.locator('#shootTrigger').click(); await expect(close(page)).toBeFocused();
  expect(await page.locator('[data-contact-page]').evaluate((node) => Boolean(node.closest('[inert]')))).toBe(true);
  await page.locator('#shootTrigger').evaluate((node) => node.focus()); await expect(close(page)).toBeFocused(); await close(page).click();
  // Then: it releases only its own flags, leaving preexisting ownership intact.
  expect(await page.locator('[data-contact-page]').evaluate((node) => Boolean(node.closest('[inert]')))).toBe(false);
  await expect(page.locator('#prior-inert')).toHaveJSProperty('inert', true); await expect(page.locator('body')).toHaveClass(/has-modal/);
});

for (const timing of ['existing', 'late'] as const) test(`captcha portal: ${timing} trusted cross-origin challenge remains interactive`, async ({ page, contact }) => {
  // Given: a trusted provider portal outside the dialog, routed by the fixture.
  await page.goto('/contact');
  const portal = () => page.evaluate((src) => {
    const branch = document.createElement('div'); branch.id = 'challenge-portal';
    branch.style.cssText = 'position:fixed;top:100px;left:10px;z-index:1000;background:white';
    const frame = document.createElement('iframe'); frame.src = src; frame.title = 'Challenge portal'; frame.width = '280'; frame.height = '100';
    branch.append(frame); document.body.append(branch);
  }, CAPTCHA_FRAME_URL);
  if (timing === 'existing') await portal();
  await page.locator('#shootTrigger').click(); await ready(page); if (timing === 'late') await portal();
  // When: challenge open is reported through form → page → modal.
  await contact.captcha('open'); await close(page).focus(); await page.keyboard.press('Escape');
  // Then: parent Escape does not dismiss; the cross-origin challenge takes keyboard input without a focusin trap.
  await expect(page.locator('#shoot-request-dialog')).toBeVisible();
  const input = page.frameLocator('iframe[title="Challenge portal"]').getByRole('textbox', { name: 'Challenge input' });
  await input.fill('interactive'); await input.press('Escape'); await expect(input).toHaveValue('interactive');
  expect(await page.locator('#challenge-portal').evaluate((node) => Boolean(node.closest('[inert]')))).toBe(false);
  await expect(close(page)).toBeInViewport(); await contact.captcha('close'); await close(page).focus(); await page.keyboard.press('Escape');
  await expect(page.locator('#shoot-request-dialog')).toHaveCount(0);
});

for (const exit of ['Close', 'Escape', 'backdrop', 'route'] as const) test(`modal lifecycle: pending ${exit} aborts local wait, deferred response never reopens UI`, async ({ page, contact }) => {
  // Given: a captured request with its provider response deliberately deferred.
  await open(page); await fill(page); await ready(page); await contact.captcha('verify'); const pending = contact.defer();
  await page.getByRole('button', { name: '送出申請', exact: true }).click(); await expect.poll(() => contact.requests.length).toBe(1);
  // When: stop waiting via explicit discard or route unmount.
  if (exit !== 'route') {
    if (exit === 'Close') await close(page).click(); else if (exit === 'Escape') await close(page).press('Escape');
    else await page.locator('#shoot-request-dialog button[aria-label="關閉表單"]').first().click({ position: { x: 2, y: 2 } });
    await expect(page.getByText('停止等待不代表已取消送出。', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: '確認關閉', exact: true }).click();
  } else await page.goto('/tools');
  pending.release(); await pending.response;
  // Then: no late acceptance or leaked modal lock, and a fresh form has no old widget/token/text.
  await expect(page.locator('#shoot-request-dialog')).toHaveCount(0); await expect(page.locator('body')).not.toHaveClass(/has-modal/);
  await page.goto('/contact'); await page.locator('#shootTrigger').click(); await expect(field(page, 'applicant')).toHaveValue(''); expect(contact.requests).toHaveLength(1);
});

test('page-channel regressions: accordion, copy timer, Instagram and photography unchanged', async ({ page, contact }, info) => {
  // Given: clipboard success is isolated; all external traffic is denied by default.
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { sessionStorage.setItem('copied-email', text); } } }));
  await page.goto('/contact'); await page.clock.install();
  // When: use the existing Email channel then switch to Social.
  await page.locator('[aria-controls="acc-contact-body"]').click(); await page.locator('#copyEmail').click();
  // Then: same address/timer, exclusive expansion, original link attributes and responsive image sources.
  await expect(page.locator('#copyEmail')).toHaveText('copied'); expect(await page.evaluate(() => sessionStorage.getItem('copied-email'))).toBe('contact@nehsnepc.com');
  await page.clock.fastForward(1801); await expect(page.locator('#copyEmail')).toHaveText('contact@nehsnepc.com');
  await page.locator('[aria-controls="acc-social-body"]').click(); await expect(page.locator('[aria-controls="acc-contact-body"]')).toHaveAttribute('aria-expanded', 'false');
  const instagram = page.locator('#acc-social-body a'); await expect(instagram).toHaveAttribute('href', 'https://instagram.com/nehs_nepc');
  await expect(instagram).toHaveAttribute('target', '_blank'); await expect(instagram).toHaveAttribute('rel', 'noopener');
  for (const type of ['avif', 'webp']) {
    await expect(page.locator(`picture source[type="image/${type}"]`)).toHaveAttribute('srcset', [480, 800, 1200, 1600].map((width) => `/images/generated/contact-${width}.${type} ${width}w`).join(', '));
    await expect(page.locator(`picture source[type="image/${type}"]`)).toHaveAttribute('sizes', '(max-width: 767px) 88vw, 40vw');
  }
  await expect(page.locator('picture img')).toHaveAttribute('src', '/images/generated/contact-800.webp'); await expect(page.locator('picture img')).toHaveAttribute('alt', '');
  expect(contact.sdkRequests).toHaveLength(0); expect(contact.requests).toHaveLength(0);
  if (info.project.name === 'desktop') await page.screenshot({ path: `${E}/task-7-page.png`, fullPage: true, animations: 'disabled' });
});

test('page-channel regressions: clipboard denied invokes intercepted mailto fallback', async ({ page }) => {
  // Given: deny clipboard and cancel the actual protocol navigation before opening a client.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new DOMException('Denied', 'NotAllowedError'); } } });
    window.navigation.addEventListener('navigate', (event) => {
      if (event.destination.url.startsWith('mailto:')) { event.preventDefault(); sessionStorage.setItem('mailto-destination', event.destination.url); }
    });
  });
  await page.goto('/contact'); await page.locator('[aria-controls="acc-contact-body"]').click();
  // When: the unchanged copy handler rejects clipboard permission.
  await page.locator('#copyEmail').click();
  // Then: its actual navigation targets the existing address, with no mail client opened.
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('mailto-destination'))).toBe('mailto:contact@nehsnepc.com');
  await expect(page.locator('#copyEmail')).toHaveText('contact@nehsnepc.com');
});

test('page-channel regressions: accordion hidden controls skipped until expanded', async ({ page }) => {
  // Given: both original accordions are collapsed.
  await page.goto('/contact'); const email = page.locator('[aria-controls="acc-contact-body"]');
  // When: keyboard navigation crosses the collapsed Email panel.
  await email.focus(); await page.keyboard.press('Tab');
  // Then: the invisible copy control is skipped, then becomes reachable only on expansion.
  await expect(page.locator('#shootTrigger')).toBeFocused();
  await email.click(); await page.locator('#copyEmail').focus(); await expect(page.locator('#copyEmail')).toBeFocused();
  await page.locator('[aria-controls="acc-social-body"]').click(); await email.focus(); await page.keyboard.press('Tab');
  await expect(page.locator('#shootTrigger')).toBeFocused();
  await page.locator('[aria-controls="acc-social-body"]').click(); await page.locator('[aria-controls="acc-social-body"]').focus();
  await page.keyboard.press('Tab'); await expect(page.locator('#acc-social-body a')).not.toBeFocused();
});
