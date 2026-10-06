// Contact form public configuration.
//
// `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` is a public routing identifier, NOT a
// secret — it ships to the browser by design (NEXT_PUBLIC_*). It is read here
// with a static `process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` reference so
// Next.js can inline it at build time. Missing or invalid values resolve to
// `{ available: false }` and never throw, so builds stay green before the
// provider key is provisioned.

/** Fixed hCaptcha provider sitekey for the contact form. */
export const HCAPTCHA_SITEKEY = "50b2fe65-b00b-4b9e-ad62-3ba471098be2";

export type ContactConfig =
  | { available: false }
  | { available: true; accessKey: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALL_ZERO_PATTERN = /^0{8}-0{4}-0{4}-0{4}-0{12}$/;
const PLACEHOLDER_PATTERN = /your-|placeholder|example|changeme|^x+$/i;

/**
 * Normalize a raw env value to a lowercase UUID, or `null` when the value is
 * missing, a placeholder, all-zero, or malformed. Never throws.
 */
export function normalizeAccessKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized.length === 0) return null;
  if (PLACEHOLDER_PATTERN.test(normalized)) return null;
  if (!UUID_PATTERN.test(normalized)) return null;
  if (ALL_ZERO_PATTERN.test(normalized)) return null;
  return normalized;
}

/** Resolve the public contact configuration. Never throws. */
export function getContactConfig(): ContactConfig {
  // Static env key on purpose: Next.js inlines NEXT_PUBLIC_* at build time.
  // Do NOT refactor to a dynamic `process.env[name]` lookup.
  const accessKey = normalizeAccessKey(
    process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
  );
  if (accessKey === null) return { available: false };
  return { available: true, accessKey };
}

/** Whether the contact request form can be submitted. Never throws. */
export function isContactAvailable(): boolean {
  return getContactConfig().available;
}
