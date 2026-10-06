import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  HCAPTCHA_SITEKEY,
  getContactConfig,
  isContactAvailable,
  normalizeAccessKey,
} from "../../lib/contact/config";

// Fake routing-shape UUID for tests only. Valid UUID shape, never provisioned;
// route mocks prohibit delivery, so this key can never submit anywhere.
const FAKE_UUID = "123e4567-e89b-42d3-a456-426614174000";

function withEnv(value: string | undefined, fn: () => void): void {
  const key = "NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY";
  const previous = process.env[key];
  try {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
}

describe("contact config", () => {
  it("exports the fixed hCaptcha sitekey", () => {
    assert.equal(
      HCAPTCHA_SITEKEY,
      "50b2fe65-b00b-4b9e-ad62-3ba471098be2",
    );
    // Never the production hCaptcha test sitekey.
    assert.notEqual(
      HCAPTCHA_SITEKEY,
      "10000000-ffff-ffff-ffff-000000000001",
    );
  });

  it("is unavailable when the key is missing", () => {
    withEnv(undefined, () => {
      assert.deepEqual(getContactConfig(), { available: false });
      assert.equal(isContactAvailable(), false);
    });
  });

  it("is unavailable for empty and whitespace values", () => {
    for (const value of ["", "   ", "\n\t "]) {
      withEnv(value, () => {
        assert.deepEqual(
          getContactConfig(),
          { available: false },
          `expected unavailable for ${JSON.stringify(value)}`,
        );
      });
    }
  });

  it("rejects placeholder values without throwing", () => {
    for (const value of [
      "your-web3forms-access-key",
      "placeholder",
      "example-key",
    ]) {
      withEnv(value, () => {
        assert.deepEqual(getContactConfig(), { available: false });
      });
    }
  });

  it("rejects malformed UUID values without throwing", () => {
    for (const value of [
      "not-a-uuid",
      "12345",
      "123e4567-e89b-42d3-a456",
      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      `${FAKE_UUID}-extra`,
    ]) {
      withEnv(value, () => {
        assert.deepEqual(
          getContactConfig(),
          { available: false },
          `expected unavailable for ${JSON.stringify(value)}`,
        );
      });
    }
  });

  it("rejects the all-zero UUID without throwing", () => {
    withEnv("00000000-0000-0000-0000-000000000000", () => {
      assert.deepEqual(getContactConfig(), { available: false });
      assert.equal(isContactAvailable(), false);
    });
  });

  it("is available for a valid UUID and normalizes case/whitespace", () => {
    withEnv(`  ${FAKE_UUID.toUpperCase()}  `, () => {
      assert.deepEqual(getContactConfig(), {
        available: true,
        accessKey: FAKE_UUID,
      });
      assert.equal(isContactAvailable(), true);
    });
  });

  it("normalizeAccessKey never throws on non-string input", () => {
    for (const value of [undefined, null, 42, {}, []] as unknown[]) {
      assert.equal(normalizeAccessKey(value), null);
    }
  });

  it("exposes no secret-shaped fields on the public config", () => {
    withEnv(FAKE_UUID, () => {
      const config = getContactConfig();
      const serialized = JSON.stringify(config);
      assert.match(serialized, /"available":true/);
      assert.doesNotMatch(serialized, /secret/i);
      assert.equal(
        Object.keys(config).sort().join(","),
        "accessKey,available",
      );
    });
  });
});
