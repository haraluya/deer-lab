# 安全部署腳本 - 避免常見部署錯誤
# 使用方式: .\scripts\safe-deploy.ps1

param(
    [switch]$SkipBuild = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n$Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# 主流程
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 Firebase 安全部署腳本 v1.0    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan

# 1. 清理舊檔案
Write-Step "1️⃣ 清理舊的建構檔案..."
try {
    if (!$SkipBuild) {
        Remove-Item -Path '.next' -Recurse -Force -ErrorAction SilentlyContinue
        Write-Success "已清理 .next 目錄"
    }
    Remove-Item -Path 'functions\.next' -Recurse -Force -ErrorAction SilentlyContinue
    Write-Success "已清理 functions\.next 目錄"
} catch {
    Write-Error "清理失敗: $_"
    exit 1
}

# 2. 建構專案
if (!$SkipBuild) {
    Write-Step "2️⃣ 執行 Next.js 建構..."
    try {
        $buildOutput = npm run build 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "建構失敗"
            if ($Verbose) {
                Write-Host $buildOutput
            }
            exit 1
        }
        Write-Success "建構完成"
    } catch {
        Write-Error "建構執行失敗: $_"
        exit 1
    }
} else {
    Write-Warning "跳過建構步驟（使用現有的 .next 目錄）"
}

# 3. 檢查關鍵檔案
Write-Step "3️⃣ 檢查關鍵檔案完整性..."
$requiredFiles = @(
    @{Path='.next\BUILD_ID'; Name='BUILD_ID'},
    @{Path='.next\build-manifest.json'; Name='build-manifest.json'},
    @{Path='.next\routes-manifest.json'; Name='routes-manifest.json'},
    @{Path='.next\server'; Name='server 目錄'; IsDir=$true},
    @{Path='.next\static'; Name='static 目錄'; IsDir=$true}
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file.Path) {
        if ($Verbose) {
            Write-Host "  ✓ $($file.Name)" -ForegroundColor Green
        }
    } else {
        Write-Error "缺少必要檔案: $($file.Name)"
        $allFilesExist = $false
    }
}

if (!$allFilesExist) {
    Write-Error "關鍵檔案缺失，請檢查建構過程"
    exit 1
}
Write-Success "所有關鍵檔案存在"

# 4. 處理 prerender-manifest.json
Write-Step "4️⃣ 檢查並處理 prerender-manifest.json..."
$prerenderPath = '.next\prerender-manifest.json'
if (!(Test-Path $prerenderPath)) {
    Write-Warning "缺少 prerender-manifest.json，自動創建..."
    try {
        $jsonContent = '{"version":4,"routes":{},"dynamicRoutes":{},"preview":{"previewModeId":""}}'
        # 使用無 BOM 的 UTF-8 編碼
        [System.IO.File]::WriteAllText(
            $prerenderPath,
            $jsonContent,
            [System.Text.UTF8Encoding]::new($false)
        )
        Write-Success "已創建 prerender-manifest.json（無 BOM）"
    } catch {
        Write-Error "創建 prerender-manifest.json 失敗: $_"
        exit 1
    }
} else {
    # 驗證 JSON 格式
    try {
        $content = Get-Content $prerenderPath -Raw
        $json = $content | ConvertFrom-Json
        Write-Success "prerender-manifest.json 格式正確"
    } catch {
        Write-Warning "JSON 格式無效，重新創建..."
        $jsonContent = '{"version":4,"routes":{},"dynamicRoutes":{},"preview":{"previewModeId":""}}'
        [System.IO.File]::WriteAllText(
            $prerenderPath,
            $jsonContent,
            [System.Text.UTF8Encoding]::new($false)
        )
        Write-Success "已重新創建 prerender-manifest.json"
    }
}

# 5. 複製檔案到 functions
Write-Step "5️⃣ 複製檔案到 functions 目錄..."
try {
    Copy-Item -Path '.next' -Destination 'functions\.next' -Recurse -Force
    Write-Success "檔案複製完成"
} catch {
    Write-Error "複製失敗: $_"
    exit 1
}

# 6. 清理快取
Write-Step "6️⃣ 清理快取目錄..."
try {
    Remove-Item -Path 'functions\.next\cache' -Recurse -Force -ErrorAction SilentlyContinue
    Write-Success "快取已清理"
} catch {
    Write-Warning "快取清理失敗（可能不存在）: $_"
}

# 7. 驗證檔案完整性
Write-Step "7️⃣ 驗證檔案完整性..."
try {
    $sourceFiles = Get-ChildItem -Path '.next' -Recurse -File | Where-Object { $_.FullName -notlike '*\cache\*' }
    $destFiles = Get-ChildItem -Path 'functions\.next' -Recurse -File

    $sourceCount = $sourceFiles.Count
    $destCount = $destFiles.Count

    Write-Host "  來源檔案: $sourceCount 個" -ForegroundColor Cyan
    Write-Host "  目標檔案: $destCount 個" -ForegroundColor Cyan

    if ($destCount -lt $sourceCount * 0.9) {
        Write-Error "檔案數量差異過大，可能複製不完整"
        exit 1
    }
    Write-Success "檔案完整性驗證通過"
} catch {
    Write-Warning "檔案驗證失敗: $_"
}

# 8. 檢查部署大小
Write-Step "8️⃣ 檢查部署大小..."
try {
    $functionsSize = (Get-ChildItem -Path 'functions' -Recurse -File | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($functionsSize / 1MB, 2)
    Write-Host "  部署大小: $sizeMB MB" -ForegroundColor Cyan

    if ($sizeMB -gt 150) {
        Write-Warning "部署大小超過 150MB，建議優化"
    } else {
        Write-Success "部署大小適中"
    }
} catch {
    Write-Warning "無法計算部署大小: $_"
}

# 9. 部署確認
Write-Step "9️⃣ 準備部署到 Firebase..."
Write-Host "即將部署 nextServer Function" -ForegroundColor Yellow
Write-Host "按 Enter 繼續，或 Ctrl+C 取消..." -ForegroundColor Yellow
$null = Read-Host

# 10. 執行部署
Write-Step "🔟 執行 Firebase 部署..."
try {
    firebase deploy --only functions:nextServer
    if ($LASTEXITCODE -ne 0) {
        Write-Error "部署失敗"
        exit 1
    }
    Write-Success "部署指令執行完成"
} catch {
    Write-Error "部署執行失敗: $_"
    exit 1
}

# 11. 等待部署生效
Write-Step "⏳ 等待部署生效..."
Start-Sleep -Seconds 30
Write-Success "等待完成"

# 12. 完成
Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║      🎉 部署流程全部完成！        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n📝 後續建議:" -ForegroundColor Cyan
Write-Host "1. 檢查線上服務是否正常運作" -ForegroundColor White
Write-Host "2. 查看 Cloud Run 日誌確認無錯誤" -ForegroundColor White
Write-Host "3. 測試關鍵功能頁面" -ForegroundColor White

Write-Host "`n🔍 快速檢查指令:" -ForegroundColor Cyan
Write-Host "gcloud logging read `"resource.type=cloud_run_revision AND resource.labels.service_name=nextserver AND severity>=ERROR`" --limit=5 --format=json --project=deer-lab" -ForegroundColor Gray

Write-Host "`n✨ 部署成功！Function URL: https://nextserver-r5xqvv67jq-uc.a.run.app" -ForegroundColor Green
