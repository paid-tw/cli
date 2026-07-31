# paid CLI

[![CI](https://github.com/paid-tw/cli/actions/workflows/ci.yml/badge.svg)](https://github.com/paid-tw/cli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@paid-tw/cli.svg?label=%40paid-tw%2Fcli)](https://www.npmjs.com/package/@paid-tw/cli)
[![types: TypeScript](https://img.shields.io/npm/types/@paid-tw/cli.svg)](https://www.typescriptlang.org/)
[![license: MIT](https://img.shields.io/github/license/paid-tw/cli.svg)](./LICENSE)
[![npx](https://img.shields.io/badge/npx-%40paid--tw%2Fcli-black)](https://www.npmjs.com/package/@paid-tw/cli)

以優質 DX 為目標，提供台灣金流的統一操作介面。

## 目標
- 單一指令介面操作多家金流（已支援 **PAYUNi**、**ECPay 綠界**；NewebPay 藍新開發中）
- 統一欄位模型與自動映射，錯誤正規化為單一 `PaymentError`（穩定錯誤碼）
- 同時支援 env、config 檔、CLI flags
- 完整 help 便於 AI 呼叫
- 與 paid‑tw OAuth 整合

## 支援矩陣
| Provider | 建立交易 create | 查詢 get | 退款 refund |
| --- | --- | --- | --- |
| PAYUNi | 開發中 | ✅ | 開發中 |
| ECPay 綠界 | ✅（AioCheckOut 導轉表單） | ✅（QueryTradeInfo） | ✅（DoAction，信用卡） |
| NewebPay 藍新 | 開發中 | 開發中 | 開發中 |

各 provider 以 `capabilities` 宣告能力；未支援的操作會回傳 `UNSUPPORTED` 錯誤。

## Quickstart

### PAYUNi 統一金流
```bash
# 1) 設定環境變數
export PAYUNI_MERCHANT_ID=your_merchant_id
export PAYUNI_HASH_KEY=your_hash_key
export PAYUNI_HASH_IV=your_hash_iv
# CLI 預設使用正式環境；如需測試請改為 true
export PAYUNI_SANDBOX=true

# 2) 免安裝快速檢查
npx @paid-tw/cli doctor --provider=payuni

# 3) 查詢交易
npx @paid-tw/cli payments get --provider=payuni --id=ORDER-123
```

### ECPay 綠界科技
```bash
# 1) 設定環境變數（可用綠界公開測試特店 3002607）
export ECPAY_MERCHANT_ID=3002607
export ECPAY_HASH_KEY=pwFHCqoQZGmho4w6
export ECPAY_HASH_IV=EkRm7iFT261dpevs
export ECPAY_SANDBOX=true

# 2) 建立交易（回傳已簽章的 AioCheckOut 導轉表單，商店自動送出即可導向綠界收銀台）
npx @paid-tw/cli payments create --provider=ecpay --amount=1000 --method=card \
  --order-id=ORDER123 --item-desc="T-shirt" --notify-url=https://example.com/ecpay/notify

# 3) 查詢交易（MerchantTradeNo）
npx @paid-tw/cli payments get --provider=ecpay --id=ORDER123

# 4) 退款（信用卡；會先查 TradeNo 再送 DoAction）
npx @paid-tw/cli payments refund --provider=ecpay --id=ORDER123 --amount=1000
```

> 註：ECPay `create` 走瀏覽器導轉流程，因此回傳的是「導轉網址 + 已簽章參數」，而非已成立的交易。`--order-id`（MerchantTradeNo）須為 1–20 碼英數字；`--notify-url` 對應 ECPay 的 `ReturnURL`（必填）。

### NewebPay 藍新金流（開發中）
```bash
# 即將推出
```

## 指令概覽
- `paid doctor --provider=payuni|ecpay`
- `paid providers list`
- `paid providers ping --provider=payuni --id=...`（連線測試：gateway 有回應即視為可達）
- `paid payments create --provider=ecpay --amount=1000 --method=card --order-id=... --notify-url=...`
- `paid payments get --provider=payuni|ecpay --id=...`
- `paid payments refund --provider=ecpay --id=... --amount=...`
- `paid config set --provider=ecpay --merchant-id=... --hash-key=... --hash-iv=...`
- `paid config get --provider=ecpay`

## paid‑tw（即將推出）
paid‑tw 相關功能會以 `paid tw ...` 提供，包含 OAuth 登入與雲端加值服務。

- `paid tw auth login`（選用，僅 paid‑tw 功能需要）
- `paid tw auth status`（選用，僅 paid‑tw 功能需要）

## 設定優先序
1. CLI flags
2. 環境變數
3. `~/.config/paid/config.toml`

## 參數說明（常用）
- `--format=json|pretty`：輸出格式（目前 `payments get`、`doctor` 支援）
- `--provider=payuni|newebpay|ecpay`：指定金流服務
- `--sandbox` / `--production`：單次指令切換環境（覆蓋設定）
- `--id` / `--trade-no`：交易查詢識別（PAYUNi 支援）

### config.toml 範例
```toml
defaultProvider = "payuni"
outputFormat = "json"

[providers.payuni]
merchantId = "MS12345678"
hashKey = "your_hash_key"
hashIv = "your_hash_iv"
sandbox = true
```

### 預設 provider 優先序
1. `--provider`
2. `.env`
3. 系統環境變數
4. `config.toml` 的 `defaultProvider`
5. 若只設定一個 `providers`，自動使用該 provider

### 輸出格式
`paid payments get`、`paid doctor` 支援 `--format=json|pretty`（`--json` 等同 `--format=json`）。
所有指令的錯誤輸出採統一結構；若底層為 `PaymentError`，正規化錯誤碼（如 `NOT_FOUND`/`AUTH`/`VALIDATION`）會放在 `error.details.code`。

### 環境變數
```bash
PAID_DEFAULT_PROVIDER=payuni
PAID_ENV=sandbox

# PAYUNi
PAYUNI_MERCHANT_ID=MS12345678
PAYUNI_HASH_KEY=your_hash_key
PAYUNI_HASH_IV=your_hash_iv
PAYUNI_SANDBOX=true

# ECPay 綠界
ECPAY_MERCHANT_ID=3002607
ECPAY_HASH_KEY=your_hash_key
ECPAY_HASH_IV=your_hash_iv
ECPAY_SANDBOX=true
```

各 provider 的環境變數前綴為其大寫名稱（`PAYUNI_*`、`ECPAY_*`、`NEWEBPAY_*`），欄位一致：`_MERCHANT_ID` / `_HASH_KEY` / `_HASH_IV` / `_SANDBOX`。

### .env（選用）
若專案根目錄存在 `.env`，`paid` 會優先讀取並覆蓋系統環境變數。

## Help 範例
```bash
paid --help
paid tw --help
paid payments --help
paid payments create --help
paid tw auth --help
paid config --help
paid doctor --help
paid providers ping --help
```

## paid‑tw 加值服務（選用）
若需要使用 paid‑tw 平台提供的額外服務（例如 OAuth 登入、後續的雲端功能），使用 `paid tw ...` 子命令。

## paid‑tw OAuth（選用）
僅在使用 paid‑tw 平台功能時需要登入。若只是把 `paid` 當作本地金流 CLI 使用，可忽略此段落。

### 登入
```bash
paid tw auth login
```

### 查看狀態
```bash
paid tw auth status
```

## 診斷（doctor）
快速檢查環境變數與設定是否完整。

```bash
paid doctor --provider=payuni
```

## 文件
各金流的細節說明與錯誤碼請參考對應文件。

- PAYUNi 交易查詢：`cli/docs/payuni/trade-query.md`

## 範例輸出（格式）
成功時為統一的 `success` 信封（`--json`）；以下為 `data`/`raw` 節錄。

### 查詢交易（`payments get`）
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
    "merTradeNo": "ORDER123",
    "raw": { "TradeStatus": "1", "PaymentType": "Credit_CreditCard" }
  }
}
```

### 建立交易（`payments create`，ECPay）
`raw` 為已簽章的導轉表單，商店端 POST 此表單即可導向綠界收銀台。
```json
{
  "provider": "ecpay",
  "id": "<sha256(input)>",
  "status": "created",
  "raw": {
    "action": "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
    "method": "POST",
    "params": { "MerchantID": "3002607", "MerchantTradeNo": "ORDER123", "CheckMacValue": "..." }
  }
}
```

### 錯誤（統一結構）
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

## 開發
```bash
npm i
npm run dev -- --help     # tsx 直接執行原始碼

npm test                  # vitest（離線，MSW 模擬 gateway）
npm run typecheck         # tsc --noEmit
npm run lint              # oxlint --type-aware
npm run format            # oxfmt --write
npm run build             # tsdown（單一 ESM bin）
```

工具鏈：**tsdown**（build）、**vitest**（test）、**MSW**（離線錄製 gateway 行為）、**oxlint** + **oxfmt**（lint/format）。
測試以 MSW 回放自真實 sandbox 錄製的回應（fixtures）；打真實 sandbox 的 live 測試需以 `PAYUNI_LIVE=1` / `ECPAY_LIVE=1` 開啟，預設略過。

### CI
`.github/workflows/ci.yml`：push 到 `main` 與所有 PR 觸發。build job（Node 22）跑 build → typecheck → lint → format:check → test:coverage；另有 Node 20/22/24 測試矩陣。

## 安裝
```bash
npm i -g @paid-tw/cli
paid --help
```

## Build
```bash
npm run build
```

## 目錄結構
```
cli/
  src/
    commands/
    core/
    providers/
```
