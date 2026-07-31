# paid CLI

[![CI](https://github.com/paid-tw/cli/actions/workflows/ci.yml/badge.svg)](https://github.com/paid-tw/cli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@paid-tw/cli.svg?label=%40paid-tw%2Fcli)](https://www.npmjs.com/package/@paid-tw/cli)
[![types: TypeScript](https://img.shields.io/npm/types/@paid-tw/cli.svg)](https://www.typescriptlang.org/)
[![license: MIT](https://img.shields.io/github/license/paid-tw/cli.svg)](./LICENSE)
[![npx](https://img.shields.io/badge/npx-%40paid--tw%2Fcli-black)](https://www.npmjs.com/package/@paid-tw/cli)

以優質 DX 為目標，提供台灣金流的統一操作介面。底層金流邏輯由
[`@paid-tw/payment*`](https://github.com/paid-tw/payment) SDK 提供；CLI 負責設定、輸出與指令。

## 安裝

```bash
# 全域
npm i -g @paid-tw/cli
paid --help

# 或免安裝
npx @paid-tw/cli --help
```

## 目標

- 單一指令介面操作多家金流（PAYUNi、ECPay AIO、ECPay 站內付 2.0；NewebPay 開發中）
- 統一欄位模型與錯誤正規化（`PaymentError` 穩定錯誤碼）
- 同時支援 env、config 檔、CLI flags
- 完整 help 便於 AI 呼叫
- 選用：paid.tw OAuth 加值服務

## 支援矩陣

| Provider (`--provider`) | create | get | refund | 備註 |
| --- | --- | --- | --- | --- |
| `payuni` | 開發中 | ✅ | 開發中 | 統一金流 trade query |
| `ecpay` | ✅ AioCheckOut **redirect** | ✅ QueryTradeInfo | ✅ DoAction（信用卡） | 導轉綠界收銀台；`raw.mode === "redirect"` |
| `ecpay-ecpg` | ✅ GetToken **token** | 開發中 | 開發中 | 站內付 2.0；`raw.mode === "token"`（給前端 JS） |
| `newebpay` | 開發中 | 開發中 | 開發中 | 藍新 scaffold |

各 provider 以 `capabilities` 宣告能力；未支援的操作回傳 `UNSUPPORTED`。

金流協定細節（簽章、notify 驗簽、DoAction C/E/N 等）見 SDK：

- GitHub：https://github.com/paid-tw/payment
- npm：[`@paid-tw/payment`](https://www.npmjs.com/package/@paid-tw/payment) · [`@paid-tw/payment-ecpay`](https://www.npmjs.com/package/@paid-tw/payment-ecpay) · [`@paid-tw/payment-payuni`](https://www.npmjs.com/package/@paid-tw/payment-payuni)

## Quickstart

### PAYUNi 統一金流

```bash
export PAYUNI_MERCHANT_ID=your_merchant_id
export PAYUNI_HASH_KEY=your_hash_key
export PAYUNI_HASH_IV=your_hash_iv
export PAYUNI_SANDBOX=true   # 預設正式環境；測試請 true

npx @paid-tw/cli doctor --provider=payuni
npx @paid-tw/cli payments get --provider=payuni --id=ORDER-123
```

### ECPay 綠界 — AIO（導轉）

公開 stage 特店（綠界文件明碼，AIO / 站內付可共用）：

```bash
export ECPAY_MERCHANT_ID=3002607
export ECPAY_HASH_KEY=pwFHCqoQZGmho4w6
export ECPAY_HASH_IV=EkRm7iFT261dpevs
export ECPAY_SANDBOX=true

# create → raw.mode=redirect（導轉表單，非已付款）
npx @paid-tw/cli payments create --provider=ecpay --amount=1000 --method=card \
  --order-id=ORDER123 --item-desc="T-shirt" --notify-url=https://example.com/ecpay/notify

npx @paid-tw/cli payments get --provider=ecpay --id=ORDER123
npx @paid-tw/cli payments refund --provider=ecpay --id=ORDER123 --amount=1000
```

> `create` 回傳已簽章的 AioCheckOut 表單（`mode: "redirect"` + `action` + `params`），商店 POST 即可導向收銀台。  
> `--order-id`（MerchantTradeNo）須為 1–20 碼英數字；`--notify-url` = ECPay `ReturnURL`（必填）。

### ECPay 綠界 — 站內付 2.0（ECPG）

同一組 `ECPAY_*` 即可（可選 `ECPAY_ECPG_*` 覆寫）：

```bash
export ECPAY_MERCHANT_ID=3002607
export ECPAY_HASH_KEY=pwFHCqoQZGmho4w6
export ECPAY_HASH_IV=EkRm7iFT261dpevs
export ECPAY_SANDBOX=true

# create → raw.mode=token（給前端 ECPay JS SDK，非已付款）
# --email 與 --phone 擇一必填
npx @paid-tw/cli payments create --provider=ecpay-ecpg --amount=100 --method=card \
  --order-id=ORDER123 --notify-url=https://example.com/ecpay/notify \
  --email=buyer@example.com --sandbox
```

> 前端需載入綠界站內付 2.0 JS：`createPayment(token)` → `getPayToken()`，再由伺服器呼叫 SDK 的 `createPaymentWithPayToken`。CLI 只負責 server 端 GetToken。

### NewebPay 藍新金流（開發中）

```bash
# 即將推出
```

## 指令概覽

```bash
paid doctor --provider=payuni|ecpay|ecpay-ecpg|newebpay
paid providers list
paid providers ping --provider=payuni --id=...
paid payments create --provider=ecpay|ecpay-ecpg ...
paid payments get --provider=payuni|ecpay --id=...
paid payments refund --provider=ecpay --id=... --amount=...
paid config set --provider=ecpay --merchant-id=... --hash-key=... --hash-iv=...
paid config get --provider=ecpay
paid tw auth login|status   # 選用，僅 paid.tw 功能需要
```

## 設定

### 優先序

1. CLI flags（含 `--sandbox` / `--production`）
2. 環境變數（含 `.env`，會覆蓋系統 env）
3. `~/.config/paid/config.toml`

### 預設 provider 優先序

1. `--provider`
2. `PAID_DEFAULT_PROVIDER`
3. `config.toml` 的 `defaultProvider`
4. 若只設定一個 `providers.*`，自動使用該 provider

### 常用參數

- `--provider=payuni|newebpay|ecpay|ecpay-ecpg`
- `--format=json|pretty`（`payments get`、`doctor`；`--json` 等同 json）
- `--sandbox` / `--production`：單次切換環境
- `--email` / `--phone`：`ecpay-ecpg` create 用
- `--id` / `--trade-no`：查詢識別

### 環境變數

```bash
PAID_DEFAULT_PROVIDER=ecpay
PAID_ENV=sandbox

# PAYUNi
PAYUNI_MERCHANT_ID=...
PAYUNI_HASH_KEY=...
PAYUNI_HASH_IV=...
PAYUNI_SANDBOX=true

# ECPay（AIO + 站內付共用；站內付也可改用 ECPAY_ECPG_*）
ECPAY_MERCHANT_ID=3002607
ECPAY_HASH_KEY=...
ECPAY_HASH_IV=...
ECPAY_SANDBOX=true
# ECPAY_ECPG_MERCHANT_ID=...   # 可選覆寫
```

前綴：`PAYUNI_*`、`ECPAY_*`、`ECPAY_ECPG_*`、`NEWEBPAY_*`；欄位 `_MERCHANT_ID` / `_HASH_KEY` / `_HASH_IV` / `_SANDBOX`。

### config.toml 範例

```toml
defaultProvider = "ecpay"
outputFormat = "json"

[providers.ecpay]
merchantId = "3002607"
hashKey = "pwFHCqoQZGmho4w6"
hashIv = "EkRm7iFT261dpevs"
sandbox = true

# 站內付可省略；未設定時沿用 [providers.ecpay] / ECPAY_*
# [providers.ecpay-ecpg]
# ...
```

完整範例見 [`config.example.toml`](./config.example.toml)。

## 輸出格式

成功時為統一 `success` 信封（`--json`）。錯誤為統一結構；底層 `PaymentError` 的碼在 `error.details.code`（如 `NOT_FOUND` / `AUTH` / `VALIDATION`）。

### `payments get`（ECPay）

```json
{
  "provider": "ecpay",
  "id": "ORDER123",
  "status": "fetched",
  "data": {
    "status": "paid",
    "method": "card",
    "amount": 1234,
    "paidAt": "2026/07/02 21:27:45",
    "tradeNo": "2607022124117236",
    "merTradeNo": "ORDER123"
  }
}
```

### `payments create` — AIO redirect

```json
{
  "provider": "ecpay",
  "status": "created",
  "raw": {
    "mode": "redirect",
    "action": "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
    "method": "POST",
    "params": { "MerchantID": "3002607", "MerchantTradeNo": "ORDER123", "CheckMacValue": "..." }
  }
}
```

### `payments create` — 站內付 token

```json
{
  "provider": "ecpay-ecpg",
  "status": "created",
  "raw": {
    "mode": "token",
    "token": "...",
    "merchantTradeNo": "ORDER123",
    "frontend": { "environment": "stage" }
  }
}
```

### 錯誤

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_GET_FAILED",
    "message": "ECPay 查無交易資料",
    "details": { "code": "NOT_FOUND", "provider": "ecpay", "rawCode": "10200047" }
  },
  "metadata": { "command": "payments get" }
}
```

## 診斷

```bash
paid doctor --provider=ecpay
paid doctor --provider=ecpay-ecpg
```

## paid.tw 加值服務（選用）

僅在使用 paid.tw 平台功能時需要：

```bash
paid tw auth login
paid tw auth status
```

本地金流 CLI 可忽略此段。

## Help

```bash
paid --help
paid payments create --help
paid doctor --help
paid providers list
```

## 開發

```bash
npm i
npm run dev -- --help
npm test                  # vitest（CLI 層 + 部分 provider MSW）
npm run typecheck
npm run lint
npm run format
npm run build             # tsdown → dist/index.js (bin)
```

Gateway 實作與較完整的 MSW / live 測試在 **payment monorepo**（[`paid-tw/payment`](https://github.com/paid-tw/payment)）。  
CLI 內 live 測試：`PAYUNI_LIVE=1` / `ECPAY_LIVE=1` 時才會跑。

### 目錄

```
cli/
  src/
    commands/     # commander 指令
    core/         # config、輸出、provider registry（compose SDK factories）
    providers/    # 薄 re-export → @paid-tw/payment*
```

### CI / 發布

- CI：`.github/workflows/ci.yml`（push `main` 與 PR；Node 20/22/24）
- **npm 發布**：推送 git tag `vX.Y.Z` → `.github/workflows/publish.yml`（**OIDC**，不用本機 `npm publish`）  
  步驟見 [`docs/release.md`](./docs/release.md)

## 文件

- 本 CLI：本 README、[`CHANGELOG.md`](./CHANGELOG.md)、`docs/payuni/trade-query.md`
- 金流 SDK：https://github.com/paid-tw/payment
