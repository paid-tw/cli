import { setupServer } from "msw/node";
import { computeCheckMacValue, createEcpayProvider } from "../ecpay.js";
import type { ProviderRuntimeConfig } from "../../core/providers.js";

/**
 * Fixed host + credentials for ECPay MSW handlers. The HashKey/HashIV are the
 * pair from ECPay's documented CheckMacValue worked example (see ecpay.test.ts)
 * so the golden hash reproduces exactly; MerchantID is the public test id.
 */
export const BASE = "https://ecpay.test";
export const MERCHANT = "3002607";
export const HASH_KEY = "pwFHCqoQZGmho4w6";
export const HASH_IV = "EkRm7iFT261dpevs";

export const QUERY_URL = `${BASE}/Cashier/QueryTradeInfo/V5`;

export const server = setupServer();

export function testProvider(overrides: Partial<ProviderRuntimeConfig> = {}) {
  return createEcpayProvider({
    merchantId: MERCHANT,
    hashKey: HASH_KEY,
    hashIv: HASH_IV,
    baseUrl: BASE,
    ...overrides,
  });
}

/** Serialize a QueryTradeInfo response and stamp a valid CheckMacValue over it. */
export function queryResponse(fields: Record<string, string>): string {
  const withMac = { ...fields };
  withMac.CheckMacValue = computeCheckMacValue(withMac, HASH_KEY, HASH_IV);
  return new URLSearchParams(withMac).toString();
}
