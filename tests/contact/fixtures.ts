import { test as base, expect } from '@playwright/test';
import type { Request, Route } from '@playwright/test';
import { WEB3FORMS_ENDPOINT } from '../../lib/contact/request';

export const SYNTHETIC_EMAIL = 'contact-test@example.com';
export const CAPTCHA_FRAME_URL = 'https://newassets.hcaptcha.com/contact-test/frame';

type CaptchaEvent = 'verify' | 'expire' | 'error' | 'open' | 'close' | 'challenge-expire';
type CaptchaOptions = {
  readonly callback?: () => void;
  readonly 'expired-callback'?: () => void;
  readonly 'error-callback'?: (error: string) => void;
  readonly 'open-callback'?: () => void;
  readonly 'close-callback'?: () => void;
  readonly 'chalexpired-callback'?: () => void;
};
type CaptchaControl = {
  readonly ids: () => string[];
  readonly emit: (id: string, event: CaptchaEvent) => void;
};
declare global {
  interface Window { contactCaptcha: CaptchaControl }
}

// Serialized as the intercepted SDK, not injected into product code or root layout.
function installCaptchaStub() {
  const widgets = new Map<string, { options: CaptchaOptions; frame: HTMLIFrameElement; token: string }>();
  let sequence = 0;
  const widget = (id: string) => {
    const value = widgets.get(id);
    if (!value) throw new Error(`Unknown captcha widget: ${id}`);
    return value;
  };
  const control: CaptchaControl = {
    ids: () => [...widgets.keys()],
    emit(id, event) {
      const value = widget(id);
      switch (event) {
        case 'verify': value.token = `contact-test-token-${id}`; value.options.callback?.(); return;
        case 'expire': value.token = ''; value.options['expired-callback']?.(); return;
        case 'error': value.token = ''; value.options['error-callback']?.('challenge-error'); return;
        case 'open': value.options['open-callback']?.(); return;
        case 'close': value.options['close-callback']?.(); return;
        case 'challenge-expire': value.options['chalexpired-callback']?.(); return;
        default: { const exhaustive: never = event; return exhaustive; }
      }
    },
  };
  Object.assign(window, {
    contactCaptcha: control,
    hcaptcha: {
      render(container: string | HTMLElement, options: CaptchaOptions) {
        const element = typeof container === 'string' ? document.getElementById(container) : container;
        if (!element) throw new Error('Missing captcha container');
        const id = `contact-widget-${++sequence}`;
        const frame = document.createElement('iframe');
        frame.src = `https://newassets.hcaptcha.com/contact-test/frame?id=${id}`;
        frame.title = 'hCaptcha test widget';
        frame.width = '280'; frame.height = '80';
        element.append(frame);
        widgets.set(id, { options, frame, token: '' });
        return id;
      },
      reset(id: string) { widget(id).token = ''; },
      remove(id: string) { widget(id).frame.remove(); widgets.delete(id); },
      getResponse(id: string) { return widget(id).token; },
      getRespKey(id: string) { widget(id); return `contact-test-response-${id}`; },
    },
  });
  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (event.origin !== 'https://newassets.hcaptcha.com') return;
    for (const [id, value] of widgets) {
      if (event.source === value.frame.contentWindow && event.data === 'verify') control.emit(id, 'verify');
    }
  });
  const script = document.currentScript;
  if (script instanceof HTMLScriptElement) {
    const name = new URL(script.src).searchParams.get('onload');
    const callback: unknown = name ? Reflect.get(window, name) : undefined;
    if (typeof callback === 'function') callback();
  }
}

export type ProviderResponse = 'success' | 'rejected' | '429' | '500' | 'malformed' | 'stalled' | 'abort';
type DeferredResponse = { readonly release: () => void; readonly response: Promise<ProviderResponse> };
export type ContactHarness = {
  readonly requests: readonly Request[];
  readonly sdkRequests: readonly string[];
  readonly enqueue: (response: ProviderResponse) => void;
  readonly defer: (response?: ProviderResponse) => DeferredResponse;
  readonly acknowledgeDeniedRequests: () => readonly string[];
  readonly blockCaptchaScript: () => void;
  readonly captcha: (event: CaptchaEvent, id?: string) => Promise<void>;
};

async function fulfillProvider(route: Route, response: ProviderResponse) {
  const headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
  switch (response) {
    case 'success': await route.fulfill({ headers, json: { success: true } }); return;
    case 'rejected': await route.fulfill({ headers, json: { success: false } }); return;
    case '429': await route.fulfill({ headers, status: 429, json: { success: false } }); return;
    case '500': await route.fulfill({ headers, status: 500, json: { success: false } }); return;
    case 'malformed': await route.fulfill({ headers, body: '{invalid-json' }); return;
    case 'stalled': return;
    case 'abort': await route.abort('failed'); return;
    default: { const exhaustive: never = response; return exhaustive; }
  }
}

export const test = base.extend<{ contact: ContactHarness }>({
  contact: [async ({ page, baseURL }, use) => {
    const requests: Request[] = [];
    const sdkRequests: string[] = [];
    const denied: string[] = [];
    const queue: (ProviderResponse | Promise<ProviderResponse>)[] = [];
    const releases: (() => void)[] = [];
    const stalledRoutes: Route[] = [];
    let scriptBlocked = false;
    const localOrigin = new URL(baseURL ?? 'http://localhost:3150').origin;
    await page.route('**/*', async (route) => {
      if (new URL(route.request().url()).origin === localOrigin) await route.continue();
      else await route.abort('blockedbyclient');
    });
    await page.route(`${CAPTCHA_FRAME_URL}*`, (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><button onclick="parent.postMessage(\'verify\', \'*\')">Verify test captcha</button><input aria-label="Challenge input"></body></html>',
    }));
    await page.route('https://js.hcaptcha.com/1/api.js*', async (route) => {
      sdkRequests.push(route.request().url());
      if (scriptBlocked) await route.abort('blockedbyclient');
      else await route.fulfill({ contentType: 'application/javascript', body: `(${installCaptchaStub.toString()})();` });
    });
    await page.route(WEB3FORMS_ENDPOINT, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: {
          'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST',
          'access-control-allow-headers': 'content-type,accept',
        } });
        return;
      }
      requests.push(route.request());
      const response = queue.shift();
      if (response === undefined) {
        denied.push(`Unregistered ${route.request().method()} ${route.request().url()}`);
        await route.fulfill({ status: 403, headers: { 'access-control-allow-origin': '*' },
          json: { success: false, error: 'Unregistered contact provider request' } });
        return;
      }
      const outcome = await response;
      if (outcome === 'stalled') stalledRoutes.push(route);
      await fulfillProvider(route, outcome);
    });
    await use({
      requests, sdkRequests,
      enqueue: (response) => { queue.push(response); },
      defer(response = 'success') {
        let release = () => {};
        const pending = new Promise<ProviderResponse>((resolve) => { release = () => resolve(response); });
        queue.push(pending);
        releases.push(release);
        return { release, response: pending };
      },
      acknowledgeDeniedRequests: () => denied.splice(0),
      blockCaptchaScript: () => { scriptBlocked = true; },
      captcha: (event, id) => page.evaluate(({ event, id }) => {
        const widgetId = id ?? window.contactCaptcha.ids()[0];
        if (!widgetId) throw new Error('No rendered captcha widget');
        window.contactCaptcha.emit(widgetId, event);
      }, { event, id }),
    });
    // Resolve outstanding deferred routes before closing the context; no dangling handlers.
    for (const release of releases) release();
    // Returning from a stalled handler does not handle its route. Finish these
    // interceptions before unrouteAll waits, even after the browser's local abort.
    for (const route of stalledRoutes) await route.abort('failed');
    await page.unrouteAll({ behavior: 'wait' });
    expect(denied, 'Unregistered contact sends must never silently pass').toEqual([]);
  }, { auto: true }],
});

export { expect };
