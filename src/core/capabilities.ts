/**
 * Capabilities are declared by each provider, not discovered at call time —
 * same contract as @paid-tw/einvoice. Callers feature-detect with
 * {@link supports}; adapters guard entry points with {@link assertSupports},
 * which throws a normalized UNSUPPORTED {@link PaymentError}.
 */
import { PaymentError } from "./errors.js";

export type Capability = "CREATE_PAYMENT" | "GET_PAYMENT" | "REFUND_PAYMENT";

export function supports(capabilities: ReadonlySet<Capability>, capability: Capability): boolean {
  return capabilities.has(capability);
}

export function assertSupports(
  provider: string,
  capabilities: ReadonlySet<Capability>,
  capability: Capability,
): void {
  if (!capabilities.has(capability)) {
    throw new PaymentError("UNSUPPORTED", `${provider} 尚未支援 ${capability}`, provider);
  }
}
