import { ProviderAdapter } from "../core/providers.js";
import crypto from "node:crypto";
import fetch from "node-fetch";

export class PayuniProvider implements ProviderAdapter {
  name = "payuni" as const;

  async createPayment(input: unknown) {
    // TODO: 實作 PAYUNi 建立交易 API
    return {
      ok: false,
      message: "PAYUNi createPayment 尚未實作",
      input
    };
  }

  async getPayment(input: unknown) {
    const payload = ensureQueryPayload(input);
    const params = new URLSearchParams({
      MerID: payload.MerchantID,
      Timestamp: String(Math.floor(Date.now() / 1000))
    });
    if (payload.MerTradeNo) params.set("MerTradeNo", payload.MerTradeNo);
    if (payload.TradeNo) params.set("TradeNo", payload.TradeNo);
    const queryString = params.toString();

    const encryptInfo = encrypt(queryString, payload.HashKey, payload.HashIV);
    const hashInfo = generateHashInfo(encryptInfo);

    const response = await fetch(getQueryEndpoint(payload.Sandbox), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "payuni"
      },
      body: new URLSearchParams({
        MerID: payload.MerchantID,
        Version: "2.0",
        EncryptInfo: encryptInfo,
        HashInfo: hashInfo
      })
    });

    if (!response.ok) {
      throw new Error(`PAYUNi query failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as PayuniQueryResponse;

    const errorCode = result.Status && result.Status !== "SUCCESS" ? result.Status : undefined;
    const errorMessage =
      errorCode ? `${errorCode}: ${PAYUNI_QUERY_ERRORS[errorCode] ?? "未知錯誤"}` : undefined;

    const decrypted = result.EncryptInfo
      ? decrypt(result.EncryptInfo, payload.HashKey, payload.HashIV)
      : undefined;
    const parsed = decrypted ? parseDecryptedPayload(decrypted) : undefined;
    const normalized = parsed ? normalizeQueryResult(parsed) : undefined;

    return {
      ok: !errorCode,
      error: errorMessage,
      data: normalized,
      raw: {
        ...result,
        decrypted,
        parsed
      }
    };
  }

  async refundPayment(input: unknown) {
    // TODO: 實作 PAYUNi 退款 API
    return {
      ok: false,
      message: "PAYUNi refundPayment 尚未實作",
      input
    };
  }
}

type PayuniQueryPayload = {
  MerchantID: string;
  HashKey: string;
  HashIV: string;
  Sandbox?: boolean;
  MerTradeNo?: string;
  TradeNo?: string;
};

function ensureQueryPayload(input: unknown): PayuniQueryPayload {
  if (!input || typeof input !== "object") {
    throw new Error("PAYUNi query payload invalid");
  }
  const payload = input as Partial<PayuniQueryPayload>;
  if (!payload.MerchantID) throw new Error("PAYUNi MerchantID missing");
  if (!payload.HashKey) throw new Error("PAYUNi HashKey missing");
  if (!payload.HashIV) throw new Error("PAYUNi HashIV missing");
  if (!payload.MerTradeNo && !payload.TradeNo) {
    throw new Error("PAYUNi MerTradeNo/TradeNo missing");
  }
  return payload as PayuniQueryPayload;
}

function getQueryEndpoint(isTest?: boolean): string {
  return isTest
    ? "https://sandbox-api.payuni.com.tw/api/trade/query"
    : "https://api.payuni.com.tw/api/trade/query";
}

function encrypt(data: string, hashKey: string, hashIv: string): string {
  const key = Buffer.from(hashKey.padEnd(32, "\0").slice(0, 32), "utf8");
  const iv = Buffer.from(hashIv.padEnd(16, "\0").slice(0, 16), "utf8");
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function generateHashInfo(encryptInfo: string): string {
  return crypto.createHash("sha256").update(encryptInfo).digest("hex").toUpperCase();
}

function decrypt(encryptedHex: string, hashKey: string, hashIv: string): string {
  const key = Buffer.from(hashKey.padEnd(32, "\0").slice(0, 32), "utf8");
  const iv = Buffer.from(hashIv.padEnd(16, "\0").slice(0, 16), "utf8");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

type PayuniQueryResponse = {
  Status?: string;
  Message?: string;
  EncryptInfo?: string;
  HashInfo?: string;
  Version?: string;
  [key: string]: unknown;
};

type PayuniQueryResult = Record<string, unknown>;

function parseDecryptedPayload(input: string): Record<string, unknown> {
  const trimmed = input.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      // fall through to querystring parse
    }
  }

  const params = new URLSearchParams(trimmed);
  const obj: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    if (key === "Result") {
      obj[key] = tryParseJson(value) ?? value;
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

function tryParseJson(input: string): unknown | undefined {
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

function normalizeQueryResult(parsed: Record<string, unknown>) {
  const result = extractFirstResult(parsed);
  const tradeStatus = asString(result?.TradeStatus);
  const paymentType = asString(result?.PaymentType);

  return {
    status: mapTradeStatus(tradeStatus),
    method: mapPaymentType(paymentType),
    amount: asNumber(result?.TradeAmt),
    paidAt: asString(result?.PaymentDay),
    tradeNo: asString(result?.TradeNo),
    merTradeNo: asString(result?.MerTradeNo),
    raw: result
  };
}

function extractFirstResult(parsed: Record<string, unknown>): PayuniQueryResult | undefined {
  const result = parsed.Result;
  if (Array.isArray(result)) {
    return result[0] as PayuniQueryResult | undefined;
  }
  if (result && typeof result === "object") {
    return result as PayuniQueryResult;
  }
  return parsed as PayuniQueryResult;
}

function mapTradeStatus(value?: string) {
  switch (value) {
    case "1":
      return "paid";
    case "2":
      return "failed";
    case "3":
      return "canceled";
    case "4":
      return "expired";
    case "8":
      return "pending";
    case "9":
      return "unpaid";
    case "0":
      return "initialized";
    default:
      return value ?? "unknown";
  }
}

function mapPaymentType(value?: string) {
  switch (value) {
    case "1":
      return "card";
    case "2":
      return "atm";
    case "3":
      return "cvs";
    case "9":
      return "linepay";
    case "11":
      return "jkopay";
    default:
      return value ?? "unknown";
  }
}

function asString(input: unknown): string | undefined {
  if (input === null || input === undefined) return undefined;
  return String(input);
}

function asNumber(input: unknown): number | undefined {
  if (input === null || input === undefined) return undefined;
  const num = Number(input);
  return Number.isNaN(num) ? undefined : num;
}

const PAYUNI_QUERY_ERRORS: Record<string, string> = {
  QUERY01001: "未有商店代號",
  QUERY01002: "資料 HASH 比對不符合",
  QUERY01003: "資料解密失敗",
  QUERY01004: "解密資料不存在",
  QUERY01005: "查無符合商店資料",
  QUERY01006: "網路連線異常",
  QUERY02001: "未有商店代號",
  QUERY02002: "商店訂單或訂單編號，請擇一送入",
  QUERY02003: "商店訂單編號，超過長度限制",
  QUERY02004: "商店訂單編號，格式錯誤",
  QUERY02005: "訂單編號，超過長度限制",
  QUERY02006: "訂單編號，格式錯誤",
  QUERY02007: "未有時間戳記",
  QUERY02008: "時間戳記，僅可輸入整數",
  QUERY02009: "時間戳記，已過期",
  QUERY02010: "未有查詢類別",
  QUERY02011: "非可使用的查詢類別",
  QUERY02012: "參數格式錯誤(QueryNo)",
  QUERY02013: "超過單次可查詢筆數上限",
  QUERY03001: "查無符合訂單資料",
  QUERY04001: "未有API處理結果",
  QUERY04002: "回傳加密失敗"
};
