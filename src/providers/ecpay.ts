import crypto from "node:crypto";
import { assertSupports, Capability } from "../core/capabilities.js";
import { PaymentError } from "../core/errors.js";
import {
  CreatePaymentRequest,
  GetPaymentRequest,
  PaymentProvider,
  ProviderRuntimeConfig,
} from "../core/providers.js";
import { NormalizedPaymentData, PaymentMethod } from "../core/schema.js";

const ECPAY_ORIGINS = {
  sandbox: "https://payment-stage.ecpay.com.tw",
  production: "https://payment.ecpay.com.tw",
} as const;

const CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>([
  "CREATE_PAYMENT",
  "GET_PAYMENT",
]);

/**
 * ECPay's AioCheckOut is a browser-redirect flow, not a server-to-server call:
 * the merchant auto-submits this form to hand the buyer off to ECPay's cashier.
 * createPayment returns the endpoint + signed params rather than a settled txn.
 */
export interface EcpayCheckoutForm {
  action: string;
  method: "POST";
  params: Record<string, string>;
}

/**
 * ECPay narrows the contract's `Promise<unknown>` create return to its concrete
 * shape. It's still assignable to {@link PaymentProvider} (covariant returns),
 * so the factory registry accepts it unchanged.
 */
export interface EcpayProvider extends PaymentProvider {
  createPayment(input: CreatePaymentRequest): Promise<EcpayCheckoutForm>;
}

/**
 * ECPay (綠界科技) All-in-One adapter. Credentials + host live on the instance;
 * `baseUrl` (or the sandbox flag) selects the gateway origin so tests can point
 * it at an MSW mock. AioCheckOut (create) and QueryTradeInfo/V5 (get) are
 * implemented; refund (DoAction) is declared unsupported for now.
 */
export function createEcpayProvider(config: ProviderRuntimeConfig): EcpayProvider {
  const origin = (
    config.baseUrl ?? (config.sandbox ? ECPAY_ORIGINS.sandbox : ECPAY_ORIGINS.production)
  ).replace(/\/+$/, "");

  return {
    name: "ecpay",
    capabilities: CAPABILITIES,

    async createPayment(input: CreatePaymentRequest): Promise<EcpayCheckoutForm> {
      assertSupports("ecpay", CAPABILITIES, "CREATE_PAYMENT");
      const { merchantId, hashKey, hashIv } = requireCredentials(config);
      if (input.currency && input.currency !== "TWD") {
        throw new PaymentError("VALIDATION", "ECPay AioCheckOut 僅支援 TWD", "ecpay");
      }
      if (!input.notifyUrl) {
        throw new PaymentError(
          "VALIDATION",
          "ECPay 需要 notify-url 作為 ReturnURL（付款結果通知）",
          "ecpay",
        );
      }

      const params: Record<string, string> = {
        MerchantID: merchantId,
        MerchantTradeNo: input.orderId,
        MerchantTradeDate: taipeiTradeDate(),
        PaymentType: "aio",
        TotalAmount: String(Math.round(input.amount)),
        TradeDesc: input.itemDesc ?? "paid",
        ItemName: input.itemDesc ?? input.orderId,
        ReturnURL: input.notifyUrl,
        ChoosePayment: mapChoosePayment(input.method),
        EncryptType: "1",
      };
      if (input.returnUrl) {
        params.OrderResultURL = input.returnUrl;
        params.ClientBackURL = input.returnUrl;
      }
      params.CheckMacValue = computeCheckMacValue(params, hashKey, hashIv);

      return { action: `${origin}/Cashier/AioCheckOut/V5`, method: "POST", params };
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

/** ECPay's ChoosePayment for a generic method; anything else offers all methods. */
function mapChoosePayment(method?: PaymentMethod): string {
  switch (method) {
    case "card":
      return "Credit";
    case "atm":
      return "ATM";
    case "cvs":
      return "CVS";
    default:
      return "ALL";
  }
}

/** MerchantTradeDate in ECPay's `yyyy/MM/dd HH:mm:ss`, in Asia/Taipei. */
function taipeiTradeDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
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
