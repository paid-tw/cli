import { describe, expect, it } from "vitest";
import { createEcpayProvider } from "../ecpay.js";
import { isPaymentError, PaymentError } from "../../core/errors.js";

/**
 * Live QueryTradeInfo against the real ECPay stage environment. Skipped unless
 * ECPAY_LIVE=1. Credentials default to ECPay's public test merchant (3002607),
 * so ECPAY_LIVE=1 alone is enough; override with ECPAY_* for your own account.
 *
 *   ECPAY_LIVE=1 npm test -- ecpay-live
 *
 * Run with PAID_DEBUG=1 to print the raw response and re-record fixtures.
 */
const live = process.env.ECPAY_LIVE === "1";

// ECPay's public stage credentials for merchant 3002607 (published in the docs).
const SANDBOX = {
  merchantId: process.env.ECPAY_MERCHANT_ID ?? "3002607",
  hashKey: process.env.ECPAY_HASH_KEY ?? "pwFHCqoQZGmho4w6",
  hashIv: process.env.ECPAY_HASH_IV ?? "EkRm7iFT261dpevs",
};

describe.skipIf(!live)("ECPay live QueryTradeInfo (stage)", () => {
  const provider = createEcpayProvider({ ...SANDBOX, sandbox: true });

  it("queries an order — returns normalized data or a mapped PaymentError", async () => {
    const id = process.env.ECPAY_QUERY_ID ?? "NONEXISTENT-ORDER";
    try {
      const data = await provider.getPayment({ merTradeNo: id });
      expect(typeof data.status).toBe("string");
    } catch (err) {
      // Even a bogus id round-trips CheckMacValue signing and comes back as a
      // normalized, code-bearing error rather than a raw throw.
      expect(isPaymentError(err)).toBe(true);
      expect((err as PaymentError).rawCode).toBeTruthy();
    }
  });
});
