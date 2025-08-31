# PowerShell 腳本：設定終端中文字體
Write-Host "正在設定終端中文字體..." -ForegroundColor Green

# 設定控制台編碼
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# 設定代碼頁為UTF-8
chcp 65001 | Out-Null

# 檢查可用的中文字體
$availableFonts = @(
    "Microsoft JhengHei UI",
    "Microsoft YaHei UI", 
    "NSimSun",
    "SimSun",
    "Consolas",
    "Courier New"
)

Write-Host "建議的中文字體："
foreach ($font in $availableFonts) {
    Write-Host "- $font" -ForegroundColor Yellow
}

Write-Host "`n請在終端屬性中手動設定字體：" -ForegroundColor Cyan
Write-Host "1. 右鍵終端標題列 → 屬性" -ForegroundColor White
Write-Host "2. 選擇 '字型' 標籤" -ForegroundColor White
Write-Host "3. 選擇支援中文的字體（建議：Microsoft JhengHei UI 或 Microsoft YaHei UI）" -ForegroundColor White
Write-Host "4. 字體大小建議：12-14" -ForegroundColor White

# 測試中文顯示
Write-Host "`n測試中文顯示：" -ForegroundColor Green
Write-Host "繁體中文：鹿鹿小作坊庫存管理系統" -ForegroundColor Magenta
Write-Host "簡體中文：鹿鹿小作坊库存管理系统" -ForegroundColor Magenta
Write-Host "特殊符號：✓ ✗ ※ ★ ☆" -ForegroundColor Magenta

Write-Host "`n如果上述文字显示正常，说明设定成功！" -ForegroundColor Green