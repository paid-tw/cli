import { describe, expect, it } from "vitest";
import { errorFromException } from "../output.js";
import { PaymentError } from "../errors.js";

describe("errorFromException", () => {
  it("surfaces a PaymentError's normalized code + rawCode/rawMessage without leaking raw", () => {
    const err = new PaymentError("NOT_FOUND", "ECPay 查無交易資料", "ecpay", {
      rawCode: "10200047",
      rawMessage: "查無交易資料",
      raw: { TradeStatus: "10200047", TradeAmt: "0", CheckMacValue: "..." },
    });

    const res = errorFromException("PAYMENT_GET_FAILED", err, { command: "payments get" });

    expect(res.error.code).toBe("PAYMENT_GET_FAILED"); // command-scoped, stable
    const details = res.error.details as Record<string, unknown>;
    expect(details.code).toBe("NOT_FOUND"); // normalized code is now discoverable
    expect(details.rawCode).toBe("10200047");
    expect(details.provider).toBe("ecpay");
    // the full gateway payload must not be serialized into user output
    expect(details).not.toHaveProperty("raw");
    expect(JSON.stringify(res)).not.toContain("CheckMacValue");
  });

  it("handles a plain thrown value with no details", () => {
    const res = errorFromException("X_FAILED", new Error("boom"));
    expect(res.error.code).toBe("X_FAILED");
    expect(res.error.message).toBe("boom");
    expect(res.error.details).toBeUndefined();
  });
});
