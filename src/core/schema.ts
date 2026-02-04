export type ProviderName = "payuni" | "newebpay" | "ecpay";
export type PaymentMethod = "card" | "linepay" | "atm" | "cvs";

export interface CreatePaymentInput {
  provider: ProviderName;
  amount: number;
  currency: string;
  method: PaymentMethod;
  orderId: string;
  itemDesc?: string;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface GetPaymentInput {
  provider: ProviderName;
  id: string;
}

export interface RefundPaymentInput {
  provider: ProviderName;
  id: string;
  amount?: number;
}

export interface PaymentResult {
  provider: ProviderName;
  id: string;
  status: string;
  raw?: unknown;
}

export interface RefundResult {
  provider: ProviderName;
  id: string;
  status: string;
  raw?: unknown;
}
