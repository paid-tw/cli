# paid CLI

以 Stripe CLI 的 DX 為目標，提供台灣金流的統一操作介面。

## 目標
- 單一指令介面操作多家金流（先支援 PAYUNi）
- 統一欄位模型與自動映射
- 同時支援 env、config 檔、CLI flags
- 完整 help 便於 AI 呼叫
- 與 paid‑tw OAuth 整合

## 指令概覽（MVP）
- `paid auth login`
- `paid auth status`
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
[providers.payuni]
merchantId = "MS12345678"
hashKey = "your_hash_key"
hashIv = "your_hash_iv"
sandbox = true
```

## Help 範例
```bash
paid --help
paid payments --help
paid payments create --help
paid auth --help
paid config --help
```

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
