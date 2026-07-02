import { NormalizedPaymentData, PaymentMethod, ProviderName } from "./schema.js";
import { Capability } from "./capabilities.js";
import { PaymentError } from "./errors.js";
import { createPayuniProvider } from "../providers/payuni.js";
import { createNewebpayProvider } from "../providers/newebpay.js";
import { createEcpayProvider } from "../providers/ecpay.js";

/**
 * Runtime config handed to a provider factory. Unlike the previous design —
 * where credentials were mixed into every request payload — credentials and the
 * target host live on the provider instance, mirroring @paid-tw/einvoice's
 * `createAmegoProvider({ ..., baseUrl })`. Tests inject `baseUrl` to point the
 * adapter at an MSW mock host.
 */
export interface ProviderRuntimeConfig {
  merchantId?: string;
  hashKey?: string;
  hashIv?: string;
  sandbox?: boolean;
  /** Override the gateway origin (used by tests to target an MSW host). */
  baseUrl?: string;
}

/** Provider-agnostic requests. Adapters map these onto their own wire format. */
export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  method: PaymentMethod;
  orderId: string;
  itemDesc?: string;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface GetPaymentRequest {
  merTradeNo?: string;
  tradeNo?: string;
}

export interface RefundPaymentRequest {
  orderId: string;
  amount?: number;
}

/**
 * The contract every gateway adapter implements. Application/CLI code depends
 * only on this interface and feature-detects via {@link PaymentProvider.capabilities};
 * switching gateways means swapping the factory, nothing else.
 */
export interface PaymentProvider {
  readonly name: ProviderName;
  readonly capabilities: ReadonlySet<Capability>;
  createPayment(input: CreatePaymentRequest): Promise<unknown>;
  getPayment(input: GetPaymentRequest): Promise<NormalizedPaymentData>;
  refundPayment(input: RefundPaymentRequest): Promise<unknown>;
}

export type ProviderFactory = (config: ProviderRuntimeConfig) => PaymentProvider;

const factories: Record<ProviderName, ProviderFactory> = {
  payuni: createPayuniProvider,
  newebpay: createNewebpayProvider,
  ecpay: createEcpayProvider,
};

export function createProvider(name: ProviderName, config: ProviderRuntimeConfig): PaymentProvider {
  const factory = factories[name];
  if (!factory) {
    throw new PaymentError("VALIDATION", `不支援的 provider: ${name}`, name);
  }
  return factory(config);
}

export function listProviders(): ProviderName[] {
  return Object.keys(factories) as ProviderName[];
}
