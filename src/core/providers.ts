import { ProviderName } from "./schema.js";
import { PayuniProvider } from "../providers/payuni.js";

export interface ProviderAdapter {
  name: ProviderName;
  createPayment: (input: unknown) => Promise<unknown>;
  getPayment: (input: unknown) => Promise<unknown>;
  refundPayment: (input: unknown) => Promise<unknown>;
}

const providers: Record<ProviderName, ProviderAdapter> = {
  payuni: new PayuniProvider(),
  newebpay: {
    name: "newebpay",
    createPayment: async () => {
      throw new Error("NewebPay 尚未實作");
    },
    getPayment: async () => {
      throw new Error("NewebPay 尚未實作");
    },
    refundPayment: async () => {
      throw new Error("NewebPay 尚未實作");
    }
  },
  ecpay: {
    name: "ecpay",
    createPayment: async () => {
      throw new Error("ECPay 尚未實作");
    },
    getPayment: async () => {
      throw new Error("ECPay 尚未實作");
    },
    refundPayment: async () => {
      throw new Error("ECPay 尚未實作");
    }
  }
};

export function getProvider(name: ProviderName): ProviderAdapter {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`不支援的 provider: ${name}`);
  }
  return provider;
}

export function listProviders() {
  return Object.keys(providers);
}
