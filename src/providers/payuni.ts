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
    const hashInfo = generateHashInfo(encryptInfo, payload.HashKey, payload.HashIV);

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
    if (process.env.PAID_DEBUG === "1") {
      console.error("[payuni] status:", response.status);
      console.error("[payuni] response:", JSON.stringify(result));
      if (result.EncryptInfo) {
        console.error("[payuni] encrypt_info_length:", result.EncryptInfo.length);
      }
    }

    const errorCode = result.Status && result.Status !== "SUCCESS" ? result.Status : undefined;
    const errorMessage =
      errorCode ? `${errorCode}: ${PAYUNI_QUERY_ERRORS[errorCode] ?? "未知錯誤"}` : undefined;

    const decrypted = result.EncryptInfo
      ? tryDecrypt(result.EncryptInfo, payload.HashKey, payload.HashIV)
      : undefined;
    const parsed = decrypted?.value ? parseDecryptedPayload(decrypted.value) : undefined;
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
  const key = Buffer.from(hashKey.trim(), "utf8");
  const iv = Buffer.from(hashIv.trim(), "utf8");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const encryptedBase64 = encrypted.toString("base64");
  const tagBase64 = tag.toString("base64");
  const combined = `${encryptedBase64}:::${tagBase64}`;
  return Buffer.from(combined, "utf8").toString("hex");
}

function generateHashInfo(encryptInfo: string, hashKey: string, hashIv: string): string {
  const data = `${hashKey}${encryptInfo}${hashIv}`;
  return crypto.createHash("sha256").update(data).digest("hex").toUpperCase();
}

function tryDecrypt(encryptedHex: string, hashKey: string, hashIv: string) {
  try {
    const raw = Buffer.from(encryptedHex, "hex").toString("utf8");
    const [encryptedBase64, tagBase64] = raw.split(":::");
    if (!encryptedBase64 || !tagBase64) {
      return { error: "invalid_encrypted_format" };
    }
    const key = Buffer.from(hashKey.trim(), "utf8");
    const iv = Buffer.from(hashIv.trim(), "utf8");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
    const encryptedData = Buffer.from(encryptedBase64, "base64");
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]).toString("utf8");
    return { value: decrypted };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "decrypt_failed" };
  }
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

  const result0 = extractFromFlatKeys(obj);
  if (Object.keys(result0).length) {
    obj.Result = [result0];
  }
  if (process.env.PAID_DEBUG === "1") {
    const resultKeys = Object.keys(obj).filter((key) => key.startsWith("Result"));
    console.error("[payuni] flat_result_keys:", Object.keys(result0).length);
    console.error("[payuni] result_keys_sample:", resultKeys.slice(0, 5));
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
  const flat = extractFromFlatKeys(parsed);
  return Object.keys(flat).length ? flat : (parsed as PayuniQueryResult);
}

function extractFromFlatKeys(parsed: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const re = /^Result\[(\d+)\]\[(.+)\]$/;
  for (const [key, value] of Object.entries(parsed)) {
    const match = key.match(re);
    if (!match) continue;
    const index = Number(match[1]);
    if (index !== 0) continue;
    out[match[2]] = value;
  }
  return out;
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
