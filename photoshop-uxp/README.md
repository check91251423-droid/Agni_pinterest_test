# Claude Photoshop Bridge (UXP)

Photoshop UXP plugin（manifest v5）。無 CEP / ExtendScript / JSX，
只使用 `require("photoshop")`、Photoshop DOM API、`action.batchPlay`、`core.executeAsModal`。
沒有任何第三方 npm dependency。

## 目錄

```
photoshop-uxp/          <- UXP Plugin 根目錄（UDT 選這層的 manifest.json）
├─ manifest.json
├─ index.html           panel UI
├─ index.js             panel entry（只做 UI，不含 Photoshop 邏輯）
├─ styles.css
└─ src/
   ├─ bridge/executeCommand.js   command router（唯一入口）
   ├─ commands/index.js          registry + 後續要支援的 command 清單
   ├─ commands/createTestLayer.js
   ├─ photoshop/host.js          app / core / action、executeAsModal、batchPlay
   ├─ photoshop/layers.js        findLayerByName、createPixelLayer
   └─ utils/logger.js            [UXP] / [UXP ERROR] log
```

## UXP Developer Tool

1. UDT → **Add Plugin** → 選擇 `photoshop-uxp/manifest.json`
2. **Load** → Photoshop 選單 `增效模組 / Plugins` → `Claude Photoshop Bridge`
3. **Watch** 開啟後，改完檔案會自動 reload
4. UDT 的 `•••` → **Debug** 開啟 DevTools Console

## 新增 command

1. `src/commands/<name>.js` 匯出 async function（用 `src/photoshop/*` helper）
2. 在 `src/commands/index.js` 的 `commands` 註冊
3. 透過 bridge 呼叫：

```js
await window.PhotoshopBridge.executeCommand({
  action: "createLayer",
  params: { name: "PRODUCT_SHADOW" },
});
```

## 修圖原則（後續 command 必須遵守）

- PRODUCT 一律以 Smart Object 處理，transform 預設等比例，禁止拉伸 / 壓縮 / 變形。
- 光影拆層：`PRODUCT_SHADOW` / `PRODUCT_HIGHLIGHT` / `PRODUCT_REFLECTION` / `PRODUCT_COLOR`。
- 非破壞式：Smart Object、Adjustment Layer、Layer Mask、Clipping Mask，不直接改動產品原始像素。
