import { test, expect } from './fixtures';

test('missing-key: actual empty-key harness offers Email without captcha or POST', async ({ page, contact }, info) => {
  // Given: task-3 unconfigured launcher (or CONTACT_UNCONFIGURED production selection)
  // supplies the actual empty build-time key; no runtime config is injected.
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async (text: string) => { sessionStorage.setItem('copied-email', text); } },
  }));
  await page.goto('/contact');
  // When: open the same real request trigger with unavailable configuration.
  await page.locator('#shootTrigger').click();
  // Then: fallback replaces fields/captcha/send; the original Email channel works after close.
  await expect(page.getByRole('status')).toHaveText('表單暫時無法使用，請改用 Email 聯絡。');
  await expect(page.getByRole('link', { name: 'contact@nehsnepc.com', exact: true }))
    .toHaveAttribute('href', 'mailto:contact@nehsnepc.com');
  await expect(page.locator('#shoot-request-dialog form, #shoot-request-dialog iframe')).toHaveCount(0);
  expect(contact.sdkRequests).toHaveLength(0);
  expect(contact.requests).toHaveLength(0);
  if (info.project.name === 'desktop') await page.screenshot({ path: '.omo/evidence/contact-web3forms/task-7-missing-key.png' });
  await page.locator('#shoot-request-dialog button[aria-label="關閉表單"]').last().click();
  await expect(page.locator('#shootTrigger')).toBeFocused();
  await page.locator('[aria-controls="acc-contact-body"]').click();
  await page.locator('#copyEmail').click();
  await expect(page.locator('#copyEmail')).toHaveText('copied');
  expect(await page.evaluate(() => sessionStorage.getItem('copied-email'))).toBe('contact@nehsnepc.com');
  expect(contact.sdkRequests).toHaveLength(0);
  expect(contact.requests).toHaveLength(0);
});
