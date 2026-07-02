import { describe, expect, it } from "vitest";
import { formatPaymentOutput } from "../format.js";
import type { PaymentResult } from "../schema.js";

describe("formatPaymentOutput — pretty", () => {
  it("renders ECPay without the PAYUNi-only card block or a raw PaymentType", () => {
    const result: PaymentResult = {
      provider: "ecpay",
      id: "paidcli1782998612529",
      status: "fetched",
      data: {
        status: "paid",
        method: "card",
        amount: 1234,
        paidAt: "2026/07/02 21:27:45",
        tradeNo: "2607022124117236",
        merTradeNo: "paidcli1782998612529",
        raw: { PaymentType: "Credit_CreditCard", TradeAmt: "1234" },
      },
    };
    const out = formatPaymentOutput(result, "pretty");

    expect(out).toContain("交易序號");
    expect(out).toContain("2607022124117236");
    expect(out).toContain("信用卡"); // method normalized, not the raw wire value
    // ECPay has none of the PAYUNi wire fields — don't render that section.
    expect(out).not.toContain("付款資訊");
    expect(out).not.toContain("卡號");
    expect(out).not.toContain("Credit_CreditCard");
  });

  it("still renders the card block for PAYUNi", () => {
    const result: PaymentResult = {
      provider: "payuni",
      id: "ORDER-1",
      status: "fetched",
      data: {
        status: "paid",
        method: "card",
        amount: 100,
        tradeNo: "UNI1",
        merTradeNo: "ORDER-1",
        raw: { Card6No: "400022", Card4No: "1234", CardBank: "807", PaymentType: "1" },
      },
    };
    const out = formatPaymentOutput(result, "pretty");
    expect(out).toContain("付款資訊");
    expect(out).toContain("卡號");
    expect(out).toContain("400022******1234");
  });
});
