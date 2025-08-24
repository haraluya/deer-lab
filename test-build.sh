#!/bin/bash

echo "Testing Next.js build..."

# 清理舊的建置
rm -rf .next out

# 執行建置
npm run build

# 檢查建置結果
echo "Checking build output..."
ls -la

if [ -d "out" ]; then
    echo "✅ Build successful! out directory exists."
    ls -la out/
    echo "Number of files in out directory:"
    find out -type f | wc -l
else
    echo "❌ Build failed! out directory does not exist."
    echo "Checking .next directory..."
    if [ -d ".next" ]; then
        echo "✅ .next directory exists"
        ls -la .next/
    fi
    exit 1
fi
