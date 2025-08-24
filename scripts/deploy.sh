#!/bin/bash

echo "🚀 開始部署 Deer Lab 生產管理系統..."

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤: 請在專案根目錄執行此腳本"
    exit 1
fi

# 清理舊的建置
echo "🧹 清理舊的建置..."
rm -rf .next out

# 安裝依賴
echo "📦 安裝依賴..."
npm install

# 建置專案
echo "🔨 建置專案..."
npm run build-static

# 檢查建置結果
if [ ! -f "out/index.html" ]; then
    echo "❌ 建置失敗: index.html 不存在"
    exit 1
fi

if [ ! -d "out/static" ]; then
    echo "❌ 建置失敗: static 目錄不存在"
    exit 1
fi

echo "✅ 建置完成"

# 部署到 Firebase
echo "🌐 部署到 Firebase..."
firebase deploy --only hosting

echo "✅ 部署完成！"
echo "🌍 您的應用程式已部署到: https://deer-lab.web.app"
