# paid CLI

以優質 DX 為目標，提供台灣金流的統一操作介面。

## 目標
- 單一指令介面操作多家金流（先支援 PAYUNi）
- 統一欄位模型與自動映射
- 同時支援 env、config 檔、CLI flags
- 完整 help 便於 AI 呼叫
- 與 paid‑tw OAuth 整合

## 指令概覽（MVP）
- `paid tw auth login`（選用，僅 paid‑tw 功能需要）
- `paid tw auth status`（選用，僅 paid‑tw 功能需要）
- `paid doctor --provider=payuni`
- `paid providers list`
- `paid payments create --provider=payuni --amount=100 --currency=TWD --method=card --order-id=...`
- `paid payments get --provider=payuni --id=...`
- `paid payments refund --provider=payuni --id=... --amount=...`
- `paid config set --provider=payuni --merchant-id=...`
- `paid config get --provider=payuni`

## 設定優先序
1. CLI flags
2. 環境變數
3. `~/.config/paid/config.toml`

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
`paid payments get` 支援 `--format=json|pretty`，也可用 `config.toml` 設定 `outputFormat` 作為預設值。

### 環境變數
```bash
PAID_DEFAULT_PROVIDER=payuni
PAID_ENV=sandbox
PAYUNI_MERCHANT_ID=MS12345678
PAYUNI_HASH_KEY=your_hash_key
PAYUNI_HASH_IV=your_hash_iv
PAYUNI_SANDBOX=true
```

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
### 建立交易
```json
{
  "provider": "payuni",
  "id": "9f2c...a1b0",
  "status": "created",
  "raw": {
    "ok": false,
    "message": "PAYUNi createPayment 尚未實作",
    "input": { "..." : "..." }
  }
}
```

### 查詢交易
```json
{
  "provider": "payuni",
  "id": "Ax234234jisdi",
  "status": "fetched",
  "raw": {
    "ok": false,
    "message": "PAYUNi getPayment 尚未實作",
    "input": { "..." : "..." }
  }
}
```

### 退款
```json
{
  "provider": "payuni",
  "id": "Ax234234jisdi",
  "status": "refunded",
  "raw": {
    "ok": false,
    "message": "PAYUNi refundPayment 尚未實作",
    "input": { "..." : "..." }
  }
}
```

## 開發
```bash
npm i
npm run dev -- --help
```

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
