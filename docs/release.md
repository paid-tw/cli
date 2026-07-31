# Release（gh tag + npm OIDC）

正式發布路徑：**本機不跑 `npm publish`**，改為推送 git tag，由 GitHub Actions 用 OIDC 發 npm。

## 一次性設定：npm Trusted Publisher

在 [npmjs.com](https://www.npmjs.com/package/@paid-tw/cli) → **Settings** → **Trusted Publisher** → **GitHub Actions**：

| 欄位 | 值 |
| --- | --- |
| Organization | `paid-tw` |
| Repository | `cli` |
| Workflow filename | `publish.yml` |
| Environment | （空白，除非有用 GitHub Environment） |

不需要長期 `NPM_TOKEN`。Workflow 使用 `permissions.id-token: write` 與 `npm publish --provenance`。

## 發版步驟

```bash
# 1) 版本與 CHANGELOG
#    - 編輯 package.json version（或 npm version）
#    - 更新 CHANGELOG.md
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release v0.2.0"

# 2) 推 main
git push origin main

# 3) 打 tag 並推送（觸發 .github/workflows/publish.yml）
git tag v0.2.0
git push origin v0.2.0
```

**規則：** tag 必須是 `v` + 與 `package.json` **完全相同** 的版本（例如 `v0.2.0` ↔ `"version": "0.2.0"`）。

## 驗證

```bash
# Actions
gh run list --workflow=publish.yml --limit 3

# npm
npm view @paid-tw/cli version
```

## 與 payment monorepo

金流 SDK 同流程，見 https://github.com/paid-tw/payment/blob/main/docs/release.md  
（`pnpm` monorepo + 多 package，但同樣是 **tag `v*` + OIDC**）。
