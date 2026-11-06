import crypto from "node:crypto";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { isPaymentError, PaymentError } from "../../core/errors.js";
import { getPayment } from "../../core/payments.js";
import { server } from "./server.js";

/**
 * CLI-level wiring tests for the newebpay provider: `payments get` must carry
 * the order amount down to the SDK, because QueryTradeInfo's CheckValue signs
 * `Amt + MerchantID + MerchantOrderNo` and the gateway rejects anything else.
 * The SDK's own normalization is covered in @paid-tw/payment-newebpay.
 */

// Official manual sample-shop credentials (public documentation values).
const MERCHANT_ID = "TEK1682407426";
const HASH_KEY = "IaWudQJsuOT994cpHRWzv7Ge67yC1cE3";
const HASH_IV = "C1dLm3nxZRVlmBSP";
const QUERY_URL = "https://ccore.newebpay.com/API/QueryTradeInfo";

const ENV_KEYS = ["NEWEBPAY_MERCHANT_ID", "NEWEBPAY_HASH_KEY", "NEWEBPAY_HASH_IV"] as const;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function sha256Upper(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").toUpperCase();
}

/** ksorted `k=v` join — all fixture values are alphanumeric, so no urlencoding needed. */
function sortedQuery(fields: Record<string, string>): string {
  return Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("&");
}

const expectedCheckValue = (fields: Record<string, string>) =>
  sha256Upper(`IV=${HASH_IV}&${sortedQuery(fields)}&Key=${HASH_KEY}`);

const checkCodeOf = (fields: Record<string, string>) =>
  sha256Upper(`HashIV=${HASH_IV}&${sortedQuery(fields)}&HashKey=${HASH_KEY}`);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  process.env.NEWEBPAY_MERCHANT_ID = MERCHANT_ID;
  process.env.NEWEBPAY_HASH_KEY = HASH_KEY;
  process.env.NEWEBPAY_HASH_IV = HASH_IV;
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("newebpay payments get — CLI wiring", () => {
  it("carries --amount into the signed QueryTradeInfo request and normalizes the response", async () => {
    let posted: Record<string, string> = {};
    server.use(
      http.post(QUERY_URL, async ({ request }) => {
        posted = Object.fromEntries(new URLSearchParams(await request.text()));
        const result = {
          MerchantID: MERCHANT_ID,
          Amt: 100,
          TradeNo: "26110600000001",
          MerchantOrderNo: "ORDER123",
          TradeStatus: "1",
          PaymentType: "CREDIT",
          PayTime: "2026-11-06 15:55:14",
          CheckCode: checkCodeOf({
            Amt: "100",
            MerchantID: MERCHANT_ID,
            MerchantOrderNo: "ORDER123",
            TradeNo: "26110600000001",
          }),
        };
        return HttpResponse.json({ Status: "SUCCESS", Message: "查詢成功", Result: result });
      }),
    );

    const res = await getPayment(
      { provider: "newebpay", id: "ORDER123", amount: 100 },
      { sandbox: true },
    );

    // The request must sign the amount — this is exactly what the pass-through adds.
    expect(posted.MerchantOrderNo).toBe("ORDER123");
    expect(posted.Amt).toBe("100");
    expect(posted.CheckValue).toBe(
      expectedCheckValue({ Amt: "100", MerchantID: MERCHANT_ID, MerchantOrderNo: "ORDER123" }),
    );

    expect(res.status).toBe("fetched");
    expect(res.data?.status).toBe("paid");
    expect(res.data?.method).toBe("card");
    expect(res.data?.amount).toBe(100);
    expect(res.data?.tradeNo).toBe("26110600000001");
    expect(res.data?.merTradeNo).toBe("ORDER123");
  });

  it("surfaces the SDK's VALIDATION error when --amount is missing (no network call)", async () => {
    // No msw handler registered: a network call would fail onUnhandledRequest.
    try {
      await getPayment({ provider: "newebpay", id: "ORDER123" }, { sandbox: true });
      expect.unreachable("expected a VALIDATION PaymentError");
    } catch (err) {
      expect(isPaymentError(err)).toBe(true);
      expect((err as PaymentError).code).toBe("VALIDATION");
      expect((err as PaymentError).message).toContain("amount");
    }
  });
});
