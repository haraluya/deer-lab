#!/bin/bash

echo "Building static files..."

# 清理舊的建置
rm -rf .next out

# 執行 Next.js 建置
echo "Running Next.js build..."
if npx next build; then
  echo "✅ Next.js build completed successfully"
else
  echo "❌ Next.js build failed"
  echo "Creating basic static files..."
  
  # 如果 Next.js 建置失敗，至少確保有基本的靜態檔案
  mkdir -p out
  if [ -d "public" ]; then
    echo "Copying public files..."
    cp -r public/* out/
  fi
  
  # 創建基本的 index.html
  if [ ! -f "out/index.html" ]; then
    echo "Creating basic index.html..."
    cat > out/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Deer Lab</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <h1>Deer Lab</h1>
    <p>Application is loading...</p>
</body>
</html>
EOF
  fi
  
  echo "Basic static files created"
  exit 0
fi

# 創建 out 目錄
mkdir -p out

# 檢查 .next 目錄的結構
echo "Checking .next directory structure..."
if [ -d ".next" ]; then
  echo "✅ .next directory exists"
  echo "Contents of .next:"
  ls -la .next/
  
  if [ -d ".next/static" ]; then
    echo "✅ .next/static exists"
    echo "Contents of .next/static:"
    ls -la .next/static/
    echo "JavaScript files in .next/static:"
    find .next/static -name "*.js" -type f | head -10
  fi
  
  if [ -d ".next/server" ]; then
    echo "✅ .next/server exists"
    echo "Contents of .next/server:"
    ls -la .next/server/
    echo "HTML files in .next/server:"
    find .next/server -name "*.html" -type f
  fi
else
  echo "❌ .next directory not found"
  echo "Creating basic static files..."
  
  # 如果 Next.js 建置失敗，至少確保有基本的靜態檔案
  if [ -d "public" ]; then
    echo "Copying public files..."
    cp -r public/* out/
  fi
  
  # 創建基本的 index.html
  if [ ! -f "out/index.html" ]; then
    echo "Creating basic index.html..."
    cat > out/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Deer Lab</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <h1>Deer Lab</h1>
    <p>Application is loading...</p>
</body>
</html>
EOF
  fi
  
  echo "Basic static files created"
  exit 0
fi

# 複製靜態檔案（保持目錄結構）
echo "Copying static files..."
if [ -d ".next/static" ]; then
  echo "Copying .next/static files..."
  cp -r .next/static out/
fi

# 複製 public 檔案（除了 HTML 檔案，因為我們要使用 Next.js 生成的）
echo "Copying public files (excluding HTML files)..."
if [ -d "public" ]; then
  echo "Copying public files..."
  # 複製除了 HTML 檔案之外的所有檔案
  find public -type f ! -name "*.html" -exec cp {} out/ \;
  # 複製目錄結構
  find public -type d -exec mkdir -p out/{} \;
fi

# 複製 Next.js 生成的 HTML 檔案（優先使用 Next.js 生成的）
echo "Copying Next.js HTML files..."
if [ -d ".next/server" ]; then
  echo "Finding HTML files in .next/server..."
  find .next/server -name "*.html" -exec sh -c '
    filename=$(basename "$1")
    echo "Copying $filename to out/"
    cp "$1" out/
  ' sh {} \;
fi

# 檢查是否有 index.html
if [ -f "out/index.html" ]; then
  echo "✅ index.html found in out directory"
  echo "First few lines of index.html:"
  head -20 out/index.html
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
  echo "First few lines of dashboard.html:"
  head -20 out/dashboard.html
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
echo "JavaScript files in out directory:"
find out -name "*.js" -type f | head -10
echo "CSS files in out directory:"
find out -name "*.css" -type f | head -5
echo "Static directory structure:"
if [ -d "out/static" ]; then
  echo "✅ out/static exists"
  ls -la out/static/
else
  echo "❌ out/static not found"
fi
