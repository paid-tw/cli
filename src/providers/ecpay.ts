import crypto from "node:crypto";
import { assertSupports, Capability } from "../core/capabilities.js";
import { PaymentError } from "../core/errors.js";
import { GetPaymentRequest, PaymentProvider, ProviderRuntimeConfig } from "../core/providers.js";
import { NormalizedPaymentData } from "../core/schema.js";

const ECPAY_ORIGINS = {
  sandbox: "https://payment-stage.ecpay.com.tw",
  production: "https://payment.ecpay.com.tw",
} as const;

const CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>(["GET_PAYMENT"]);

/**
 * ECPay (綠界科技) All-in-One adapter. Credentials + host live on the instance;
 * `baseUrl` (or the sandbox flag) selects the gateway origin so tests can point
 * it at an MSW mock. Trade-query (QueryTradeInfo/V5) is implemented; create and
 * refund are declared unsupported for now.
 */
export function createEcpayProvider(config: ProviderRuntimeConfig): PaymentProvider {
  const origin = (
    config.baseUrl ?? (config.sandbox ? ECPAY_ORIGINS.sandbox : ECPAY_ORIGINS.production)
  ).replace(/\/+$/, "");

  return {
    name: "ecpay",
    capabilities: CAPABILITIES,

    async createPayment() {
      assertSupports("ecpay", CAPABILITIES, "CREATE_PAYMENT");
      throw new PaymentError("UNSUPPORTED", "ECPay createPayment 尚未實作", "ecpay");
    },

    async refundPayment() {
      assertSupports("ecpay", CAPABILITIES, "REFUND_PAYMENT");
      throw new PaymentError("UNSUPPORTED", "ECPay refundPayment 尚未實作", "ecpay");
    },

    async getPayment(input: GetPaymentRequest): Promise<NormalizedPaymentData> {
      assertSupports("ecpay", CAPABILITIES, "GET_PAYMENT");
      const { merchantId, hashKey, hashIv } = requireCredentials(config);
      if (!input.merTradeNo) {
        throw new PaymentError("VALIDATION", "ECPay 查詢需要提供 MerchantTradeNo（--id）", "ecpay");
      }

      const params: Record<string, string> = {
        MerchantID: merchantId,
        MerchantTradeNo: input.merTradeNo,
        TimeStamp: String(Math.floor(Date.now() / 1000)),
      };
      params.CheckMacValue = computeCheckMacValue(params, hashKey, hashIv);

      let response: Response;
      try {
        response = await fetch(`${origin}/Cashier/QueryTradeInfo/V5`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(params),
        });
      } catch (err) {
        throw new PaymentError("NETWORK", "ECPay QueryTradeInfo 連線失敗", "ecpay", { cause: err });
      }

      if (!response.ok) {
        throw new PaymentError(
          "PROVIDER",
          `ECPay QueryTradeInfo failed: ${response.status} ${response.statusText}`,
          "ecpay",
          { rawCode: String(response.status) },
        );
      }

      const text = await response.text();
      if (process.env.PAID_DEBUG === "1") {
        console.error("[ecpay] query response:", text);
      }

      // Some ECPay endpoints answer errors as `0|Message` instead of a field set.
      const pipe = /^(\d+)\|(.+)$/.exec(text.trim());
      if (pipe) {
        throw new PaymentError("PROVIDER", `${pipe[1]}: ${pipe[2]}`, "ecpay", {
          rawCode: pipe[1],
          rawMessage: pipe[2],
          raw: text,
        });
      }

      const parsed = Object.fromEntries(new URLSearchParams(text).entries());
      verifyResponseMac(parsed, hashKey, hashIv);
      return normalizeQueryInfo(parsed);
    },
  };
}

function requireCredentials(config: ProviderRuntimeConfig) {
  const { merchantId, hashKey, hashIv } = config;
  if (!merchantId || !hashKey || !hashIv) {
    throw new PaymentError("AUTH", "缺少 ECPay 憑證（MerchantID / HashKey / HashIV）", "ecpay");
  }
  return { merchantId, hashKey, hashIv };
}

/**
 * Classic AIO CheckMacValue: sort params A→Z (case-insensitive), wrap as
 * `HashKey=<hk>&<sorted>&HashIV=<hiv>`, .NET-style URL-encode + lowercase, then
 * SHA256 → uppercase. Verified against ECPay's documented worked example
 * (see ecpay.test.ts). `CheckMacValue` itself is never part of the input.
 */
export function computeCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIv: string,
): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) =>
      a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0,
    )
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIv}`;
  const encoded = dotNetUrlEncode(raw);
  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

/** Mirror .NET HttpUtility.UrlEncode: encode, lowercase, then restore ECPay's char set. */
function dotNetUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");
}

function verifyResponseMac(parsed: Record<string, string>, hashKey: string, hashIv: string) {
  const returned = parsed.CheckMacValue;
  if (!returned) return; // no MAC to verify (some minimal responses)
  const expected = computeCheckMacValue(parsed, hashKey, hashIv);
  if (expected !== returned.toUpperCase()) {
    throw new PaymentError("PROVIDER", "ECPay 回應 CheckMacValue 驗證失敗", "ecpay", {
      raw: parsed,
    });
  }
}

function normalizeQueryInfo(parsed: Record<string, string>): NormalizedPaymentData {
  return {
    status: mapTradeStatus(parsed.TradeStatus),
    method: mapPaymentType(parsed.PaymentType),
    amount: asNumber(parsed.TradeAmt),
    paidAt: parsed.PaymentDate || undefined,
    tradeNo: parsed.TradeNo || undefined,
    merTradeNo: parsed.MerchantTradeNo || undefined,
    raw: parsed,
  };
}

/** QueryTradeInfo TradeStatus: 0 = 已建立未付款, 1 = 已付款, 10200095 = 未建立/失敗. */
function mapTradeStatus(value?: string) {
  switch (value) {
    case "1":
      return "paid";
    case "0":
      return "unpaid";
    case "10200095":
      return "failed";
    default:
      return value ?? "unknown";
  }
}

/** Collapse ECPay's PaymentType (e.g. `Credit_CreditCard`, `ATM_TAISHIN`) to a family. */
function mapPaymentType(value?: string) {
  if (!value) return "unknown";
  const family = value.split("_")[0];
  switch (family) {
    case "Credit":
      return "card";
    case "ATM":
      return "atm";
    case "CVS":
      return "cvs";
    case "BARCODE":
      return "barcode";
    case "WebATM":
      return "webatm";
    default:
      return family ?? value;
  }
}

function asNumber(input: unknown): number | undefined {
  if (input === null || input === undefined || input === "") return undefined;
  const num = Number(input);
  return Number.isNaN(num) ? undefined : num;
}
