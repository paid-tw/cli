/**
 * Real ECPay QueryTradeInfo/V5 responses, recorded live from the public stage
 * merchant 3002607 (HashKey pwFHCqoQZGmho4w6 / HashIV EkRm7iFT261dpevs) — the
 * same key the tests sign with, so the recorded CheckMacValue verifies offline.
 *
 * Findings that constructed fixtures would have missed:
 *   - QueryTradeInfo answers HTTP 200 with a *full field set* (never a
 *     `code|message` string) even for a missing order.
 *   - A non-existent order returns TradeStatus=10200047 (not the 10200095 the
 *     doc summary implies); an empty MerchantTradeNo returns 10200052.
 *   - The payload carries a PaymentTypeChargeFee field and is ordered A→Z.
 *
 * A paid-order success body still needs a completed card payment on stage to
 * capture; until then the success-path tests use a constructed field set signed
 * with the same key (see ecpay-server.ts `queryResponse`).
 *
 * Re-record: `ECPAY_LIVE=1 PAID_DEBUG=1 npm test -- ecpay-live` (see live test).
 */

/** Unknown (well-formed) MerchantTradeNo → TradeStatus 10200047 (查無交易資料). */
export const QUERY_NOT_FOUND =
  "HandlingCharge=0&ItemName=&MerchantID=3002607&MerchantTradeNo=paidcli-probe-001" +
  "&PaymentDate=&PaymentType=&PaymentTypeChargeFee=0&TradeAmt=0&TradeDate=&TradeNo=" +
  "&TradeStatus=10200047" +
  "&CheckMacValue=F874E8D5FE8B1306F6CE10A4C5E30D3E20C3F22B51DEB641440B9F7A8B7FB865";

/** Empty MerchantTradeNo → TradeStatus 10200052 (MerchantTradeNo 錯誤). */
export const QUERY_BAD_MERTRADENO =
  "HandlingCharge=0&ItemName=&MerchantID=3002607&MerchantTradeNo=" +
  "&PaymentDate=&PaymentType=&PaymentTypeChargeFee=0&TradeAmt=0&TradeDate=&TradeNo=" +
  "&TradeStatus=10200052" +
  "&CheckMacValue=C3A9CB1F080B964C4D8DEA258B19E402B5846916BCB103F944E03B6868380039";
