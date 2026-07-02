import { assertSupports, Capability } from "../core/capabilities.js";
import { PaymentProvider, ProviderRuntimeConfig } from "../core/providers.js";
import { NormalizedPaymentData } from "../core/schema.js";

/** No capabilities yet — every entry point rejects with UNSUPPORTED. */
const CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>();

/**
 * ECPay (綠界科技) adapter — scaffolded against the shared {@link PaymentProvider}
 * contract but not yet implemented. Fill in once the real API behaviour is
 * recorded (see the einvoice repo's MSW-fixture workflow).
 */
export function createEcpayProvider(_config: ProviderRuntimeConfig): PaymentProvider {
  return {
    name: "ecpay",
    capabilities: CAPABILITIES,
    async createPayment() {
      assertSupports("ecpay", CAPABILITIES, "CREATE_PAYMENT");
      throw new Error("unreachable");
    },
    async getPayment(): Promise<NormalizedPaymentData> {
      assertSupports("ecpay", CAPABILITIES, "GET_PAYMENT");
      throw new Error("unreachable");
    },
    async refundPayment() {
      assertSupports("ecpay", CAPABILITIES, "REFUND_PAYMENT");
      throw new Error("unreachable");
    },
  };
}
