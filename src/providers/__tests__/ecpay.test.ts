import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { computeCheckMacValue } from "../ecpay.js";
import { PaymentError } from "../../core/errors.js";
import { supports } from "../../core/capabilities.js";
import {
  HASH_IV,
  HASH_KEY,
  queryResponse,
  QUERY_URL,
  server,
  testProvider,
} from "./ecpay-server.js";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ECPay CheckMacValue", () => {
  // ECPay's documented worked example — the single most important regression
  // guard: if the sort / .NET-encode / SHA256 pipeline drifts, this breaks.
  // https://developers.ecpay.com.tw/?p=2902
  it("reproduces the documented worked example", () => {
    const params = {
      MerchantID: "3002607",
      MerchantTradeNo: "ecpay20230312153023",
      MerchantTradeDate: "2023/03/12 15:30:23",
      PaymentType: "aio",
      TotalAmount: "30000",
      TradeDesc: "促銷方案",
      ItemName: "Apple iphone 15",
      ReturnURL: "https://www.ecpay.com.tw/receive.php",
      ChoosePayment: "ALL",
      EncryptType: "1",
    };
    expect(computeCheckMacValue(params, "pwFHCqoQZGmho4w6", "EkRm7iFT261dpevs")).toBe(
      "6C51C9E6888DE861FD62FB1DD17029FC742634498FD813DC43D4243B5685B840",
    );
  });

  it("ignores a pre-existing CheckMacValue key in the input", () => {
    const base = { MerchantID: "3002607", TradeAmt: "100" };
    const withMac = { ...base, CheckMacValue: "STALE" };
    expect(computeCheckMacValue(withMac, HASH_KEY, HASH_IV)).toBe(
      computeCheckMacValue(base, HASH_KEY, HASH_IV),
    );
  });
});

describe("ECPay getPayment (QueryTradeInfo)", () => {
  it("normalizes a paid credit-card query", async () => {
    server.use(
      http.post(QUERY_URL, () =>
        HttpResponse.text(
          queryResponse({
            MerchantID: "3002607",
            MerchantTradeNo: "ORDER-A1",
            TradeNo: "2303121530231234",
            TradeAmt: "30000",
            PaymentDate: "2023/03/12 15:31:00",
            PaymentType: "Credit_CreditCard",
            TradeStatus: "1",
            HandlingCharge: "10",
          }),
        ),
      ),
    );

    const data = await testProvider().getPayment({ merTradeNo: "ORDER-A1" });

    expect(data.status).toBe("paid");
    expect(data.method).toBe("card");
    expect(data.amount).toBe(30000);
    expect(data.tradeNo).toBe("2303121530231234");
    expect(data.merTradeNo).toBe("ORDER-A1");
    expect(data.paidAt).toBe("2023/03/12 15:31:00");
  });

  it("maps an unpaid ATM order (TradeStatus 0)", async () => {
    server.use(
      http.post(QUERY_URL, () =>
        HttpResponse.text(
          queryResponse({
            MerchantTradeNo: "ORDER-A2",
            TradeAmt: "500",
            PaymentType: "ATM_TAISHIN",
            TradeStatus: "0",
          }),
        ),
      ),
    );
    const data = await testProvider().getPayment({ merTradeNo: "ORDER-A2" });
    expect(data.status).toBe("unpaid");
    expect(data.method).toBe("atm");
  });

  it("signs the request with a valid CheckMacValue over MerchantTradeNo + TimeStamp", async () => {
    let body: Record<string, string> | undefined;
    server.use(
      http.post(QUERY_URL, async ({ request }) => {
        body = Object.fromEntries(new URLSearchParams(await request.text()).entries());
        return HttpResponse.text(queryResponse({ MerchantTradeNo: "ORDER-A1", TradeStatus: "1" }));
      }),
    );

    await testProvider().getPayment({ merTradeNo: "ORDER-A1" });

    expect(body?.MerchantTradeNo).toBe("ORDER-A1");
    expect(body?.TimeStamp).toMatch(/^\d+$/);
    expect(body?.CheckMacValue).toBe(computeCheckMacValue(body!, HASH_KEY, HASH_IV));
  });

  it("rejects a response whose CheckMacValue does not verify", async () => {
    server.use(
      http.post(QUERY_URL, () =>
        HttpResponse.text(
          new URLSearchParams({
            MerchantTradeNo: "ORDER-A1",
            TradeStatus: "1",
            CheckMacValue: "DEADBEEF",
          }).toString(),
        ),
      ),
    );
    const err = await testProvider()
      .getPayment({ merTradeNo: "ORDER-A1" })
      .catch((e) => e);
    expect((err as PaymentError).code).toBe("PROVIDER");
  });

  it("maps a `code|message` error body to a PROVIDER error", async () => {
    server.use(http.post(QUERY_URL, () => HttpResponse.text("0|CheckMacValue Error")));
    const err = await testProvider()
      .getPayment({ merTradeNo: "ORDER-A1" })
      .catch((e) => e);
    expect((err as PaymentError).code).toBe("PROVIDER");
    expect((err as PaymentError).rawCode).toBe("0");
  });

  it("wraps a non-2xx response as PROVIDER and a transport failure as NETWORK", async () => {
    server.use(http.post(QUERY_URL, () => new HttpResponse("bad", { status: 500 })));
    const provErr = await testProvider()
      .getPayment({ merTradeNo: "x" })
      .catch((e) => e);
    expect((provErr as PaymentError).code).toBe("PROVIDER");

    server.use(http.post(QUERY_URL, () => HttpResponse.error()));
    const netErr = await testProvider()
      .getPayment({ merTradeNo: "x" })
      .catch((e) => e);
    expect((netErr as PaymentError).code).toBe("NETWORK");
  });
});

describe("ECPay getPayment — guards (no network)", () => {
  it("requires MerchantTradeNo", async () => {
    const err = await testProvider()
      .getPayment({})
      .catch((e) => e);
    expect((err as PaymentError).code).toBe("VALIDATION");
  });

  it("requires credentials", async () => {
    const err = await testProvider({ merchantId: undefined, hashKey: undefined, hashIv: undefined })
      .getPayment({ merTradeNo: "x" })
      .catch((e) => e);
    expect((err as PaymentError).code).toBe("AUTH");
  });
});

describe("ECPay capabilities", () => {
  it("declares only GET_PAYMENT for now", async () => {
    const provider = testProvider();
    expect(supports(provider.capabilities, "GET_PAYMENT")).toBe(true);
    expect(supports(provider.capabilities, "CREATE_PAYMENT")).toBe(false);
    const err = await provider
      .createPayment({ amount: 1, currency: "TWD", method: "card", orderId: "o" })
      .catch((e) => e);
    expect((err as PaymentError).code).toBe("UNSUPPORTED");
  });
});
