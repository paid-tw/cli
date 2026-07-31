/**
 * CLI-side provider registry. The SDK packages export individual factories;
 * this file is where the CLI composes them (core must not hardcode a registry).
 */
import {
  PaymentError,
  type PaymentProvider,
  type ProviderFactory,
  type ProviderRuntimeConfig,
} from "@paid-tw/payment";
import { createPayuniProvider } from "@paid-tw/payment-payuni";
import { createNewebpayProvider } from "@paid-tw/payment-newebpay";
import { createEcpayProvider, createEcpayEcpgProvider } from "@paid-tw/payment-ecpay";
import type { ProviderName } from "./schema.js";

export type {
  CreatePaymentRequest,
  GetPaymentRequest,
  PaymentProvider,
  ProviderFactory,
  ProviderRuntimeConfig,
  RefundPaymentRequest,
} from "@paid-tw/payment";

const factories: Record<ProviderName, ProviderFactory> = {
  payuni: createPayuniProvider,
  newebpay: createNewebpayProvider,
  ecpay: createEcpayProvider,
  // 站內付 2.0 — same package, different factory / name ("ecpay-ecpg").
  "ecpay-ecpg": createEcpayEcpgProvider,
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
