import { createHash } from "node:crypto";
import { createProvider } from "./providers.js";
import {
  CreatePaymentInput,
  GetPaymentInput,
  PaymentResult,
  RefundPaymentInput,
  RefundResult,
} from "./schema.js";
import { resolveProviderConfig } from "./config.js";

export async function createPayment(
  input: CreatePaymentInput,
  runtime?: { sandbox?: boolean },
): Promise<PaymentResult> {
  const cfg = await resolveProviderConfig(input.provider, undefined, runtime);
  const provider = createProvider(input.provider, cfg);

  const raw = await provider.createPayment({
    amount: input.amount,
    currency: input.currency,
    method: input.method,
    orderId: input.orderId,
    itemDesc: input.itemDesc,
    returnUrl: input.returnUrl,
    notifyUrl: input.notifyUrl,
    // ecpay-ecpg ConsumerInfo (ignored by other adapters)
    ...(input.email ? { email: input.email } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
  } as Parameters<typeof provider.createPayment>[0]);

  return {
    provider: input.provider,
    id: hashFromInput(input),
    status: "created",
    raw,
  };
}

export async function getPayment(
  input: GetPaymentInput,
  runtime?: { sandbox?: boolean },
): Promise<PaymentResult> {
  const cfg = await resolveProviderConfig(input.provider, undefined, runtime);
  const provider = createProvider(input.provider, cfg);

  const data = await provider.getPayment({ merTradeNo: input.id, tradeNo: input.tradeNo });

  return {
    provider: input.provider,
    id: input.id ?? input.tradeNo ?? "",
    status: "fetched",
    data,
    raw: data.raw,
  };
}

export async function refundPayment(
  input: RefundPaymentInput,
  runtime?: { sandbox?: boolean },
): Promise<RefundResult> {
  const cfg = await resolveProviderConfig(input.provider, undefined, runtime);
  const provider = createProvider(input.provider, cfg);

  const raw = await provider.refundPayment({ orderId: input.id, amount: input.amount });

  return {
    provider: input.provider,
    id: input.id,
    status: "refunded",
    raw,
  };
}

function hashFromInput(input: CreatePaymentInput) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
