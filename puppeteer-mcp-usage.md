# Puppeteer MCP 使用說明

## 已安裝套件
- `@hisma/server-puppeteer@0.6.5` - 這是原始 `@modelcontextprotocol/server-puppeteer` 的更新版本

## 啟動 MCP 伺服器

### 方法 1: 使用 npx (推薦)
```bash
npx mcp-server-puppeteer
```

### 方法 2: 直接運行
```bash
node ./node_modules/@hisma/server-puppeteer/dist/index.js
```

### 方法 3: 使用腳本
在 `package.json` 中添加腳本：
```json
{
  "scripts": {
    "mcp-puppeteer": "npx mcp-server-puppeteer"
  }
}
```

然後運行：
```bash
npm run mcp-puppeteer
```

## MCP 配置文件

### Claude Desktop 配置 (mcp-config.json)
```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["mcp-server-puppeteer"],
      "env": {
        "PUPPETEER_SKIP_DOWNLOAD": "false"
      }
    }
  }
}
```

## 可用功能

### 工具 (Tools)

1. **puppeteer_navigate** - 導航到指定 URL
   - `url`: 要導航的網址
   - `launchOptions`: Puppeteer 啟動選項（可選）
   - `allowDangerous`: 是否允許危險選項（預設: false）

2. **puppeteer_screenshot** - 擷取螢幕截圖
   - `name`: 截圖名稱
   - `selector`: CSS 選擇器（可選）
   - `width`: 寬度（預設: 800）
   - `height`: 高度（預設: 600）
   - `encoded`: 是否編碼為 base64（預設: false）

3. **puppeteer_click** - 點擊元素
   - `selector`: CSS 選擇器

4. **puppeteer_hover** - 懸停元素
   - `selector`: CSS 選擇器

5. **puppeteer_fill** - 填寫輸入欄位
   - `selector`: CSS 選擇器
   - `value`: 要填寫的值

6. **puppeteer_select** - 選擇下拉選項
   - `selector`: CSS 選擇器
   - `value`: 要選擇的值

7. **puppeteer_evaluate** - 執行 JavaScript
   - `script`: JavaScript 程式碼

### 資源 (Resources)
- 截圖資源
- 頁面內容資源

## 安全注意事項

⚠️ **重要警告**: 此 MCP 伺服器可以訪問本地檔案和本地/內部 IP 位址，因為它在您的機器上運行瀏覽器。使用時請謹慎確保不會暴露敏感資料。

## 使用範例

1. 在 Claude Code 中設定 MCP 配置
2. 重新啟動 Claude Code
3. 現在您可以使用 Puppeteer MCP 工具來：
   - 自動化瀏覽器操作
   - 擷取網頁截圖
   - 填寫表單
   - 執行 JavaScript
   - 導航網站

## 故障排解

如果遇到問題：

1. **確認套件已正確安裝**:
   ```bash
   npm list @hisma/server-puppeteer
   ```

2. **檢查 npx 可用性**:
   ```bash
   where npx
   npx --version
   ```

3. **測試直接運行**:
   ```bash
   node ./node_modules/@hisma/server-puppeteer/dist/index.js
   ```

4. **檢查錯誤日誌**: 查看 Claude Code 或終端的錯誤訊息

## 更多資訊

- GitHub 存儲庫: https://github.com/Hisma/servers-archived.git
- 套件頁面: https://www.npmjs.com/package/@hisma/server-puppeteer