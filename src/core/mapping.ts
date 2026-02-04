import { CreatePaymentInput, GetPaymentInput, RefundPaymentInput, ProviderName } from "./schema.js";

export interface ProviderCreatePayload {
  provider: ProviderName;
  payload: Record<string, unknown>;
}

export interface ProviderGetPayload {
  provider: ProviderName;
  payload: Record<string, unknown>;
}

export interface ProviderRefundPayload {
  provider: ProviderName;
  payload: Record<string, unknown>;
}

export function mapCreateToProvider(input: CreatePaymentInput): ProviderCreatePayload {
  switch (input.provider) {
    case "payuni":
      return {
        provider: input.provider,
        payload: {
          Amt: input.amount,
          Currency: input.currency,
          OrderNo: input.orderId,
          ItemDesc: input.itemDesc ?? "",
          ReturnURL: input.returnUrl,
          NotifyURL: input.notifyUrl,
          PayMethod: input.method
        }
      };
    default:
      throw new Error(`尚未實作 mapping: ${input.provider}`);
  }
}

export function mapGetToProvider(input: GetPaymentInput): ProviderGetPayload {
  switch (input.provider) {
    case "payuni":
      return {
        provider: input.provider,
        payload: {
          OrderNo: input.id
        }
      };
    default:
      throw new Error(`尚未實作 mapping: ${input.provider}`);
  }
}

export function mapRefundToProvider(input: RefundPaymentInput): ProviderRefundPayload {
  switch (input.provider) {
    case "payuni":
      return {
        provider: input.provider,
        payload: {
          OrderNo: input.id,
          Amount: input.amount
        }
      };
    default:
      throw new Error(`尚未實作 mapping: ${input.provider}`);
  }
}
