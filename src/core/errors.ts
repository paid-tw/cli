/**
 * Re-export core payment errors from `@paid-tw/payment`.
 * Kept as a local module so existing CLI imports keep working.
 */
export {
  PaymentError,
  isPaymentError,
  type PaymentErrorCode,
  type PaymentErrorOptions,
} from "@paid-tw/payment";
