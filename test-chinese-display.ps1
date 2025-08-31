# 測試中文顯示腳本
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Host "中文顯示測試開始..." -ForegroundColor Green
Write-Host "繁體中文: 鹿鹿小作坊庫存管理系統" -ForegroundColor Yellow
Write-Host "簡體中文: 鹿鹿小作坊库存管理系统" -ForegroundColor Yellow  
Write-Host "特殊符號: ✓ ✗ ★ ☆ ※" -ForegroundColor Yellow
Write-Host "測試完成!" -ForegroundColor Green