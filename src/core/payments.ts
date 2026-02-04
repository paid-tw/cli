import { createHash } from "node:crypto";
import { getProvider } from "./providers.js";
import { mapCreateToProvider, mapGetToProvider, mapRefundToProvider } from "./mapping.js";
import { CreatePaymentInput, GetPaymentInput, PaymentResult, RefundPaymentInput, RefundResult } from "./schema.js";
import { resolveProviderConfig } from "./config.js";

export async function createPayment(
  input: CreatePaymentInput,
  runtime?: { sandbox?: boolean }
): Promise<PaymentResult> {
  const provider = getProvider(input.provider);
  const cfg = await resolveProviderConfig(input.provider, undefined, runtime);
  const mapped = mapCreateToProvider(input);

  const payload = {
    ...mapped.payload,
    MerchantID: cfg.merchantId,
    HashKey: cfg.hashKey,
    HashIV: cfg.hashIv,
    Sandbox: cfg.sandbox
  };

  const raw = await provider.createPayment(payload);
  return {
    provider: input.provider,
    id: hashFromPayload(payload),
    status: "created",
    raw
  };
}

export async function getPayment(
  input: GetPaymentInput,
  runtime?: { sandbox?: boolean }
): Promise<PaymentResult> {
  const provider = getProvider(input.provider);
  const cfg = await resolveProviderConfig(input.provider, undefined, runtime);
  const mapped = mapGetToProvider(input);

  const payload = {
    ...mapped.payload,
    MerchantID: cfg.merchantId,
    HashKey: cfg.hashKey,
    HashIV: cfg.hashIv,
    Sandbox: cfg.sandbox
  };

  const raw = await provider.getPayment(payload);
  const data = (raw as { data?: unknown }).data;
  return {
    provider: input.provider,
    id: input.id ?? input.tradeNo ?? "",
    status: "fetched",
    data,
    raw
  };
}

export async function refundPayment(
  input: RefundPaymentInput,
  runtime?: { sandbox?: boolean }
): Promise<RefundResult> {
  const provider = getProvider(input.provider);
  const cfg = await resolveProviderConfig(input.provider, undefined, runtime);
  const mapped = mapRefundToProvider(input);

  const payload = {
    ...mapped.payload,
    MerchantID: cfg.merchantId,
    HashKey: cfg.hashKey,
    HashIV: cfg.hashIv,
    Sandbox: cfg.sandbox
  };

  const raw = await provider.refundPayment(payload);
  return {
    provider: input.provider,
    id: input.id,
    status: "refunded",
    raw
  };
}

function hashFromPayload(payload: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
