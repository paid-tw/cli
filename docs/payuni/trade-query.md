# PAYUNi 交易查詢

本文件描述 `paid payments get` 在 PAYUNi 的查詢行為與必要參數。

## 指令
```bash
paid payments get --provider=payuni --id=ORDER-123
```

## 必要參數
- `--id`：對應 PAYUNi 的 `MerTradeNo`

## 查詢行為（CLI 內部）
- 目標 URL：
  - 測試：`https://sandbox-api.payuni.com.tw/api/trade/query`
  - 正式：`https://api.payuni.com.tw/api/trade/query`
- Request method：`POST`
- Header：`User-Agent: payuni`
- `Version` 固定為 `2.0`
- `EncryptInfo` 內含：
  - `MerID`
  - `MerTradeNo`
  - `Timestamp`（秒級）
- `HashInfo`：`EncryptInfo` 的 SHA256

## 環境切換
優先序如下：
1. `--sandbox` / `--production`
2. `PAID_ENV=sandbox|production`
3. `config.toml` 的 `providers.payuni.sandbox`

## 回傳格式
`paid` 會回傳：
- `ok`：是否成功
- `error`：錯誤代碼與說明（若失敗）
- `raw`：PAYUNi 原始回應

## 錯誤代碼（摘要）
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
