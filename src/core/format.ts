import { PaymentResult } from "./schema.js";
import { getBankDisplay } from "../providers/tw-banks.js";
import stringWidth from "string-width";

export type OutputFormat = "json" | "pretty";

export function formatPaymentOutput(result: PaymentResult, format: OutputFormat) {
  if (format === "pretty") {
    return renderPrettyPayment(result);
  }
  return JSON.stringify(result, null, 2);
}

function renderPrettyPayment(result: PaymentResult) {
  const lines: string[] = [];
  const data = result.data ?? {};
  const raw = (data as { raw?: Record<string, unknown> }).raw ?? {};

  lines.push("交易明細");
  lines.push(kv("Provider", formatProvider(result.provider)));
  lines.push(kv("狀態", formatStatus((data as { status?: string }).status ?? result.status)));
  lines.push(kv("商店訂單編號", (data as { merTradeNo?: string }).merTradeNo ?? "-"));
  lines.push(kv("UNi 序號", (data as { tradeNo?: string }).tradeNo ?? "-"));
  lines.push(kv("付款方式", formatMethod((data as { method?: string }).method ?? "-")));
  lines.push(kv("金額", formatMoney((data as { amount?: number }).amount)));
  lines.push(kv("付款時間", (data as { paidAt?: string }).paidAt ?? "-"));
  lines.push("");
  lines.push("付款資訊");
  lines.push(kv("支付工具", formatPaymentType(raw)));
  lines.push(kv("卡號", formatCard(raw.Card6No, raw.Card4No)));
  lines.push(kv("發卡銀行", formatBank(raw.CardBank)));
  lines.push(kv("授權碼", asString(raw.AuthCode) ?? "-"));
  lines.push(kv("手續費", formatMoney(asNumber(raw.TradeFee))));

  return lines.join("\n");
}

function kv(label: string, value: string) {
  const width = stringWidth(label);
  const pad = Math.max(2, 14 - width);
  return `${label}${" ".repeat(pad)}${value}`;
}

function formatMoney(amount?: number) {
  if (amount === undefined) return "-";
  return `$${amount}`;
}

function formatProvider(provider: string) {
  switch (provider) {
    case "payuni":
      return "PAYUNi 統一金流";
    case "ecpay":
      return "綠界科技 ECPay";
    case "newebpay":
      return "NewebPay 藍新金流";
    default:
      return provider;
  }
}

function formatCard(card6: unknown, card4: unknown) {
  const c6 = asString(card6);
  const c4 = asString(card4);
  if (!c6 || !c4) return "-";
  return `${c6}******${c4}`;
}

function formatStatus(status: string) {
  switch (status) {
    case "paid":
      return "已付款";
    case "failed":
      return "付款失敗";
    case "canceled":
      return "已取消";
    case "expired":
      return "已逾期";
    case "pending":
      return "待確認";
    case "unpaid":
      return "未付款";
    case "initialized":
      return "取號成功";
    default:
      return status;
  }
}

function formatMethod(method: string) {
  switch (method) {
    case "card":
      return "信用卡";
    case "linepay":
      return "LINE Pay";
    case "atm":
      return "ATM";
    case "cvs":
      return "超商";
    case "jkopay":
      return "街口支付";
    default:
      return method;
  }
}

function formatPaymentType(raw: Record<string, unknown>) {
  const value = asString(raw.PaymentType);
  switch (value) {
    case "1":
      return "信用卡";
    case "2":
      return "ATM 轉帳";
    case "3":
      return "超商代碼/條碼";
    case "5":
      return "超商取貨付款";
    case "6":
      return "愛金卡";
    case "7":
      return "AFTEE 後支付";
    case "9":
      return "LINE Pay";
    case "10":
      return "宅配到付";
    case "11":
      return "街口支付";
    default:
      return value ?? "-";
  }
}

function formatBank(code: unknown) {
  const value = asString(code);
  if (!value || value === "-") return "-";
  const display = getBankDisplay(value);
  return display ?? value;
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
