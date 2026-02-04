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

[providers.payuni]
merchantId = "MS12345678"
hashKey = "your_hash_key"
hashIv = "your_hash_iv"
sandbox = true
```

### 預設 provider 優先序
1. `--provider`
2. `PAID_DEFAULT_PROVIDER`
3. `config.toml` 的 `defaultProvider`
4. 若只設定一個 `providers`，自動使用該 provider

### 環境變數
```bash
PAID_DEFAULT_PROVIDER=payuni
PAID_ENV=sandbox
PAYUNI_MERCHANT_ID=MS12345678
PAYUNI_HASH_KEY=your_hash_key
PAYUNI_HASH_IV=your_hash_iv
PAYUNI_SANDBOX=true
```

## Help 範例
```bash
paid --help
paid tw --help
paid payments --help
paid payments create --help
paid tw auth --help
paid config --help
```

## paid‑tw 加值服務（選用）
若需要使用 paid‑tw 平台提供的額外服務（例如 OAuth 登入、後續的雲端功能），使用 `paid tw ...` 子命令。

## 文件
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

## PAYUNi 查詢錯誤碼（摘要）
當 `paid payments get` 回傳 `ok: false` 時，`error` 會對應以下代碼訊息：

| 代碼 | 說明 |
| --- | --- |
| QUERY01001 | 未有商店代號 |
| QUERY01002 | 資料 HASH 比對不符合 |
| QUERY01003 | 資料解密失敗 |
| QUERY01004 | 解密資料不存在 |
| QUERY01005 | 查無符合商店資料 |
| QUERY01006 | 網路連線異常 |
| QUERY02001 | 未有商店代號 |
| QUERY02002 | 商店訂單或訂單編號，請擇一送入 |
| QUERY02003 | 商店訂單編號，超過長度限制 |
| QUERY02004 | 商店訂單編號，格式錯誤 |
| QUERY02005 | 訂單編號，超過長度限制 |
| QUERY02006 | 訂單編號，格式錯誤 |
| QUERY02007 | 未有時間戳記 |
| QUERY02008 | 時間戳記，僅可輸入整數 |
| QUERY02009 | 時間戳記，已過期 |
| QUERY02010 | 未有查詢類別 |
| QUERY02011 | 非可使用的查詢類別 |
| QUERY02012 | 參數格式錯誤 (QueryNo) |
| QUERY02013 | 超過單次可查詢筆數上限 |
| QUERY03001 | 查無符合訂單資料 |
| QUERY04001 | 未有API處理結果 |
| QUERY04002 | 回傳加密失敗 |

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
