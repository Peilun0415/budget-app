# 信用卡目錄更新流程

## 每月自動檢查（免費）

`.github/workflows/check-card-catalog.yml` 每月 1 號台灣時間 09:00 執行（也可在 GitHub 的 Actions 頁手動 Run workflow）：

- `tools/check-card-catalog.mjs`：官網連結、卡面圖片能否開啟，規則是否已過期或 31 天內到期
- `tools/validate-card-catalog.mjs`：目錄格式

有需要處理的項目時，在 GitHub 開標題為「信用卡目錄需要更新」的 Issue（已有未關閉的就加留言）。收到通知後，在 Cursor 請 AI「更新卡片目錄」，依下面步驟處理，完成後關閉 Issue。

## 1. 先跑檢查

```bash
node tools/check-card-catalog.mjs
```

## 2. 回饋規則

- 逐張開 `sourceUrl`（銀行官網）比對 `tiers`：費率、上限、週期、逐筆或加總、取捨、門檻、條件、是否限指定通路。
- 規則有變：更新該卡 `tiers`、`ruleVersion`（新規則生效日）、`validUntil`、`note`；`key` 盡量沿用，讓使用者「更新規則」時保留「計入」設定。
- `validUntil` 已過或快到期：找官網新一期公告更新；找不到就在 `note` 註明「官網尚未公告新一期規則」。
- 官網連結失效：找新的官方頁面更新 `sourceUrl`。
- 停發的卡在 `note` 註明「已停止申辦」，**不要刪除卡片**（已設定的帳戶還在用）。
- 資料以銀行官網為準，第三方整理網站只當參考、不抓取。

## 3. 卡面圖片（`image`）

- 卡面失效（非 200、不是圖片）：到官網找新的卡面圖網址替換。
- 沒有 `image` 的卡：試著在官網（卡片介紹頁、活動頁、申辦頁）找單獨的卡面圖，找到就補上。
- 只用正面、單張的卡面圖（約 1.6:1 或直式單卡）；不要用活動橫幅、主視覺、含人物或廣告文字的圖。
- 同一張卡有多種卡面時，選預設或最常見的卡面。
- 找不到就不設定，App 會顯示銀行名稱的替代卡面。

## 4. 版號

有任何變更時，把前端版號小幅遞增（例 `9.45` → `9.46`），以下位置要一致：

- `index.html`：`style.css?v=`、`app.js?v=`
- `sw.js`：`CACHE`（`nekomemo-pwa-v`）、`PRECACHE` 內的 `app.js?v=`、`style.css?v=`、`card-catalog.js?v=`
- `app.js` 開頭：`import ... from './card-catalog.js?v='`

## 5. 收尾

- 更新 `CARD_CATALOG_UPDATED` 為當天日期。
- 執行 `node tools/validate-card-catalog.mjs`，必須通過。
- commit 並 push 到 `main`，GitHub Pages 隨之更新。
- 關閉 GitHub 上的「信用卡目錄需要更新」Issue。
