# @paid-tw/cli

## Unreleased

### Minor Changes

- **NewebPay 藍新金流上線**：`payments create / get / refund` 全部可用。
  `payments get` 新增 `--amount`（藍新必填 — QueryTradeInfo 的 CheckValue 以
  Amt 簽章，查詢 API 不支援以 TradeNo 查詢）。
- **SDK 升級**：`@paid-tw/payment` `^0.2.0`、`@paid-tw/payment-ecpay` `^0.3.0`、
  `@paid-tw/payment-newebpay` `^0.2.0`（0.1.0 是零 capabilities 的 scaffold，
  CLI 一直回 `UNSUPPORTED` 的原因）、`@paid-tw/payment-payuni` `^0.1.1`。
- 測試：新增 `newebpay.test.ts`（msw）驗證 `--amount` 會簽進 CheckValue、
  缺 amount 時回 SDK 的 VALIDATION 錯誤（不打網路）。
- README：支援矩陣與 NewebPay quickstart。`payments get --provider=newebpay`
  已以正式環境真實已付款訂單驗證（已付款/序號/金額/時間正確正規化）。

## 0.2.0

> 發布方式：GitHub tag `v0.2.0` + npm OIDC（見 `docs/release.md`）。

### Minor Changes

- **ECPay 站內付 2.0 (`ecpay-ecpg`)**：新增 provider，registry / doctor / config / env 支援  
  (`ECPAY_ECPG_*`，缺則回退 `ECPAY_*` 或 `[providers.ecpay]`)。
- **`payments create`**：支援 `--email` / `--phone`（站內付 ConsumerInfo 必填其一）。
- **金流實作外提**：改依賴 npm 上的  
  `@paid-tw/payment` / `@paid-tw/payment-ecpay` / `@paid-tw/payment-payuni` /  
  `@paid-tw/payment-newebpay`（`^0.1.0`），CLI 僅做指令、設定與 factory compose。
- Re-export ECPay AIO / ECPG notify helpers（`verifyPaymentNotify`、  
  `verifyEcpgPaymentNotify`、`ECPAY_NOTIFY_ACK`、`ECPG_NOTIFY_ACK` 等）供本機路徑引用。

### Documentation

- README：支援矩陣、`mode: "redirect" | "token"` 範例、安裝與 SDK 連結、badges。
- CLI help 描述更新（不再寫「MVP: PAYUNi」）。

### Fixes

- doctor：修正 env source 偵測的 self-assign（oxlint）。
- format / lint 對齊 CI。

## 0.1.2

### Patch Changes

- ECPay 綠界支援與文件、工具鏈現代化（既有 release）。

## 0.1.0 – 0.1.1

- 初版 CLI（PAYUNi 查詢等）與後續修補；細節見 git history。
