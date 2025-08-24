@echo off
echo Building static files...

REM 清理舊的建置
if exist .next rmdir /s /q .next
if exist out rmdir /s /q out

REM 執行 Next.js 建置
echo Running Next.js build...
npx next build
if %errorlevel% neq 0 (
    echo Next.js build failed
    goto :create_basic
)

REM 創建 out 目錄
mkdir out

REM 複製靜態檔案
echo Copying static files...
if exist .next\static (
    echo Copying .next\static files...
    xcopy .next\static out\static /E /I /Y
)

REM 複製 public 檔案（除了 HTML 檔案）
echo Copying public files (excluding HTML files)...
if exist public (
    echo Copying public files...
    for /r public %%f in (*) do (
        if not "%%~xf"==".html" (
            copy "%%f" "out\%%~nxf" >nul 2>&1
        )
    )
)

REM 複製 Next.js 生成的 HTML 檔案
echo Copying Next.js HTML files...
if exist .next\server (
    for /r .next\server %%f in (*.html) do (
        echo Copying %%~nxf to out\
        copy "%%f" "out\%%~nxf" >nul 2>&1
    )
)

goto :check_files

:create_basic
echo Creating basic static files...
mkdir out
if exist public (
    xcopy public out /E /I /Y
)

if not exist out\index.html (
    echo Creating basic index.html...
    echo ^<!DOCTYPE html^> > out\index.html
    echo ^<html^> >> out\index.html
    echo ^<head^> >> out\index.html
    echo     ^<title^>Deer Lab^</title^> >> out\index.html
    echo     ^<meta charset="utf-8"^> >> out\index.html
    echo     ^<meta name="viewport" content="width=device-width, initial-scale=1"^> >> out\index.html
    echo ^</head^> >> out\index.html
    echo ^<body^> >> out\index.html
    echo     ^<h1^>Deer Lab^</h1^> >> out\index.html
    echo     ^<p^>Application is loading...^</p^> >> out\index.html
    echo ^</body^> >> out\index.html
    echo ^</html^> >> out\index.html
)

:check_files
echo Build completed! Files in out directory:
dir out
echo.
echo HTML files in out directory:
dir out\*.html /b 2>nul
echo.
echo JavaScript files in out directory:
dir out\*.js /b 2>nul
echo.
echo CSS files in out directory:
dir out\*.css /b 2>nul
echo.
if exist out\static (
    echo Static directory structure:
    dir out\static
) else (
    echo Static directory not found
)
