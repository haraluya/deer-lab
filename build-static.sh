#!/bin/bash

echo "Building static files..."

# 清理舊的建置
rm -rf .next out

# 執行 Next.js 建置
echo "Running Next.js build..."
npm run build

# 創建 out 目錄
mkdir -p out

# 複製靜態檔案
echo "Copying static files..."
if [ -d ".next/static" ]; then
  echo "Copying .next/static files..."
  cp -r .next/static/* out/
fi

# 複製 public 檔案
echo "Copying public files..."
if [ -d "public" ]; then
  echo "Copying public files..."
  cp -r public/* out/
fi

# 複製 HTML 檔案
echo "Copying HTML files..."
if [ -d ".next/server" ]; then
  echo "Finding HTML files in .next/server..."
  find .next/server -name "*.html" -exec cp {} out/ \;
fi

# 檢查是否有 index.html
if [ -f "out/index.html" ]; then
  echo "✅ index.html found in out directory"
else
  echo "❌ index.html not found, creating a basic one..."
  cat > out/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Deer Lab - Loading...</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div id="root">Loading...</div>
    <script>
        // Redirect to the main app
        window.location.href = '/dashboard';
    </script>
</body>
</html>
EOF
fi

# 檢查是否有 dashboard 頁面
if [ -f "out/dashboard.html" ]; then
  echo "✅ dashboard.html found"
else
  echo "❌ dashboard.html not found, creating a basic one..."
  cat > out/dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Deer Lab Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div id="root">
        <h1>Deer Lab Dashboard</h1>
        <p>Loading application...</p>
    </div>
    <script>
        // Basic loading message
        console.log('Dashboard page loaded');
    </script>
</body>
</html>
EOF
fi

echo "Build completed! Files in out directory:"
ls -la out/
echo "HTML files in out directory:"
find out -name "*.html" -type f
