# @paid-tw/cli

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
