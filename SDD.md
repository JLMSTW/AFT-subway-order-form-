# Software Design Document — 復活節志工 Subway 訂餐系統

## 1. 系統架構

```
使用者瀏覽器
    │
    │  填表 + 送出（HTTP POST）
    ▼
index.html（GitHub Pages 靜態網站）
    │
    │  fetch POST（JSON）
    ▼
Google Apps Script（Web App）
    ├──► Google Sheet（寫入訂單）
    └──► Gmail（寄出確認信）
```

**重點**：沒有自己的伺服器，全部用免費服務。

---

## 2. 前端（index.html）

### 技術
- 純 HTML / CSS / JavaScript（無框架）
- 部署：GitHub Pages

### 主要區塊
| 區塊 | 說明 |
|------|------|
| `<style>` | 所有 CSS，含 RWD |
| `<body>` | Header、表單、成功畫面、確認 Modal、Loading overlay |
| `<script>` | i18n 物件、語言切換、選項邏輯、驗證、送出 |

### 關鍵函式

#### `setLang(lang)`
切換介面語言。更新 i18n 文字、顯示/隱藏對應語言的 span。

#### `getSelected(group)`
取得某群組已選的 `data-value`（英文鍵值），回傳陣列。

#### `getSelectedDisplay(group)`
取得當前語言的顯示文字，用於確認信。

#### `submitOrder()`
1. 執行 `validate()`
2. 建立 `payload`（中文值給 Sheet，display 值給 Email）
3. 顯示確認 Modal

#### `confirmAndSubmit()`
真正 `fetch POST` 送出，顯示成功畫面。

### 多語言設計
- `i18n` 物件儲存 zh / en / fr 的所有文字
- 選項卡片內有 `<span class="zh">` / `<span class="en">` / `<span class="fr">`，用 CSS `display` 切換

### 資料轉換
- `zhMap`：英文 `data-value` → 中文（寫入 Sheet 用）
- `getSelectedDisplay()`：英文 `data-value` → 當前語言顯示文字（Email 用）

---

## 3. 後端（code.gs — Google Apps Script）

### 技術
- Google Apps Script（JavaScript 環境）
- 部署為 Web App（任何人可存取）

### 進入點

#### `doPost(e)`
接收 POST 請求，呼叫 `writeToSheet()` 和 `sendConfirmationEmail()`。

#### `doGet()`
測試用，回傳 `✅ Subway Order API is running.`

### 主要函式

#### `writeToSheet(data)` → 回傳 `orderNum`
- 若「訂餐記錄」分頁不存在則建立並設定表頭樣式
- 寫入一行訂單資料（中文菜名）
- 回傳訂單編號（= 寫入前的最後一行號碼）

#### `sendConfirmationEmail(data, orderNum)`
- 依 `data.lang` 選擇語言
- 用 `data.*_display` 欄位取得當前語言菜名
- 同時產生純文字版和 HTML 版郵件
- 透過 `MailApp.sendEmail()` 寄出

---

## 4. 資料流

```
使用者填表送出
    │
    ▼
payload = {
  name, line, email,
  main（中文）, bread（中文）, ...,       ← 寫入 Sheet
  main_display（當語言）, ...,            ← 寄確認信
  lang
}
    │
    ├──► Sheet: name, line, email, main, bread, cheese, vegi, pickle, sauce（全中文）
    └──► Email: main_display, bread_display, ...（依填表語言）
```

---

## 5. 部署

| 服務 | 用途 | 費用 |
|------|------|------|
| GitHub Pages | 靜態網站托管 | 免費 |
| Google Apps Script | API + 寫入 Sheet + 寄信 | 免費 |
| Google Sheet | 訂單後台 | 免費 |
| Gmail | 寄出確認信 | 免費（有每日上限） |

### 更新流程
1. 修改 `index.html` 或 `code.gs`
2. `git add . && git commit && git push` → GitHub Pages 自動更新
3. `code.gs` 修改後需手動到 Apps Script **管理部署 → 新版本 → 部署**

---

## 6. 已知限制
- `fetch` 使用 `mode: 'no-cors'`，無法讀取回應，送出後預設成功
- Apps Script 免費帳號每天寄信上限約 100 封
- 無防止重複填表機制
