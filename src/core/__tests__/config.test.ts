import { describe, expect, it } from "vitest";
import { mergeProviderConfig, providerEnvPrefix } from "../config.js";

describe("providerEnvPrefix", () => {
  it("maps hyphenated ecpay-ecpg to ECPAY_ECPG", () => {
    expect(providerEnvPrefix("ecpay-ecpg")).toBe("ECPAY_ECPG");
    expect(providerEnvPrefix("ecpay")).toBe("ECPAY");
    expect(providerEnvPrefix("payuni")).toBe("PAYUNI");
  });
});

const CREDS = { merchantId: "MS123", hashKey: "K", hashIv: "IV" };

describe("mergeProviderConfig — precedence (CLI flags > env > config.toml)", () => {
  it("keeps config.toml credentials when no env vars are set", () => {
    // Regression: an all-undefined env layer used to clobber file creds.
    const env = {
      merchantId: undefined,
      hashKey: undefined,
      hashIv: undefined,
      sandbox: undefined,
    };
    const merged = mergeProviderConfig(CREDS, env, undefined, undefined);
    expect(merged.merchantId).toBe("MS123");
    expect(merged.hashKey).toBe("K");
    expect(merged.hashIv).toBe("IV");
  });

  it("lets env override config.toml credentials", () => {
    const merged = mergeProviderConfig(CREDS, { merchantId: "ENV_MS" }, undefined, undefined);
    expect(merged.merchantId).toBe("ENV_MS");
    expect(merged.hashKey).toBe("K"); // untouched file value survives
  });

  it("lets flags override env and config.toml", () => {
    const merged = mergeProviderConfig(
      CREDS,
      { merchantId: "ENV_MS" },
      { merchantId: "FLAG_MS" },
      undefined,
    );
    expect(merged.merchantId).toBe("FLAG_MS");
  });
});

describe("mergeProviderConfig — sandbox resolution", () => {
  it("honors config.toml sandbox=true when env/flags/runtime are absent", () => {
    // Regression: env.sandbox was always a boolean, short-circuiting the ?? chain.
    const merged = mergeProviderConfig({ ...CREDS, sandbox: true }, {}, undefined, undefined);
    expect(merged.sandbox).toBe(true);
  });

  it("lets an explicit env sandbox=false override config.toml sandbox=true", () => {
    const merged = mergeProviderConfig(
      { ...CREDS, sandbox: true },
      { sandbox: false },
      undefined,
      undefined,
    );
    expect(merged.sandbox).toBe(false);
  });

  it("lets runtime (--sandbox/PAID_ENV) win over everything", () => {
    const merged = mergeProviderConfig(
      { ...CREDS, sandbox: false },
      { sandbox: false },
      undefined,
      true,
    );
    expect(merged.sandbox).toBe(true);
  });

  it("leaves sandbox undefined when no layer sets it", () => {
    const merged = mergeProviderConfig(CREDS, {}, undefined, undefined);
    expect(merged.sandbox).toBeUndefined();
  });
});
