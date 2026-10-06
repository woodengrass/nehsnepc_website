import { test, expect, SYNTHETIC_EMAIL } from './fixtures';
import { WEB3FORMS_ENDPOINT } from '../../lib/contact/request';

test('harness baseline renders Contact without loading captcha before modal opens', async ({ page, contact }) => {
  // Given: provider routes are installed before navigation.
  await page.goto('/contact');
  // When: the Contact surface is rendered without opening the request modal.
  await expect(page.locator('[data-contact-page]')).toBeVisible();
  // Then: no captcha or submission traffic is requested.
  expect(contact.sdkRequests).toHaveLength(0);
  expect(contact.requests).toHaveLength(0);
  await expect(page.locator('#shoot-request-dialog')).toHaveCount(0);
});

test('harness baseline explicitly denies an unregistered provider POST', async ({ page, contact }) => {
  // Given: no response has been registered and only synthetic data is used.
  await page.goto('/contact');
  // When: a browser POST reaches the deny-by-default provider route.
  const status = await page.evaluate(async ({ endpoint, email }) => {
    const response = await fetch(endpoint, { method: 'POST', body: JSON.stringify({ email }) });
    return response.status;
  }, { endpoint: WEB3FORMS_ENDPOINT, email: SYNTHETIC_EMAIL });
  // Then: it fails explicitly, is captured, and the self-test acknowledges that denial.
  expect(status).toBe(403);
  expect(contact.requests).toHaveLength(1);
  expect(contact.acknowledgeDeniedRequests()).toEqual([`Unregistered POST ${WEB3FORMS_ENDPOINT}`]);
});
