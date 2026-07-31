import { describe, expect, it } from "vitest";
import { ECPAY_SANDBOX, createEcpayProvider } from "@paid-tw/payment-ecpay";
import { isPaymentError, type PaymentError } from "@paid-tw/payment";

/**
 * Thin live smoke for the CLI package. Full suite lives in
 * `@paid-tw/payment-ecpay` (`ecpay-live.test.ts`).
 *
 *   ECPAY_LIVE=1 npm test -- ecpay-live
 */
const live = process.env.ECPAY_LIVE === "1";

describe.skipIf(!live)("ECPay live (CLI → @paid-tw/payment-ecpay)", () => {
  const provider = createEcpayProvider({ ...ECPAY_SANDBOX });

  it("queries stage with public merchant 3002607", async () => {
    const id = process.env.ECPAY_QUERY_ID ?? `cli${Date.now().toString().slice(-12)}`;
    try {
      const data = await provider.getPayment({ merTradeNo: id });
      expect(typeof data.status).toBe("string");
    } catch (err) {
      expect(isPaymentError(err)).toBe(true);
      expect((err as PaymentError).rawCode).toBeTruthy();
    }
  });
});
