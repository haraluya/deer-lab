const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log(" 開始構建靜態網站...");

try {
  // 清理之前的構建
  if (fs.existsSync("out")) {
    console.log(" 清理之前的構建文件...");
    fs.rmSync("out", { recursive: true, force: true });
  }

  // 設置環境變數
  process.env.NODE_ENV = "production";
  
  // 執行 Next.js 構建
  console.log(" 執行 Next.js 構建...");
  execSync("npx next build", { stdio: "inherit" });
  
  // 手動創建 out 目錄並複製靜態文件
  console.log(" 複製靜態文件到 out 目錄...");
  
  // 創建 out 目錄
  if (!fs.existsSync("out")) {
    fs.mkdirSync("out", { recursive: true });
  }
  
  // 複製 .next/static 到 out/static
  if (fs.existsSync(".next/static")) {
    execSync("xcopy \".next\\static\" \"out\\static\" /E /I /Y", { stdio: "inherit" });
  }
  
  // 複製 public 目錄到 out
  if (fs.existsSync("public")) {
    execSync("xcopy \"public\" \"out\" /E /I /Y", { stdio: "inherit" });
  }
  
  // 複製 HTML 文件
  if (fs.existsSync(".next/server/app")) {
    execSync("xcopy \".next\\server\\app\" \"out\" /E /I /Y", { stdio: "inherit" });
  }
  
  console.log(" 靜態網站構建完成！");
  console.log(" 輸出目錄: out/");
  
} catch (error) {
  console.error(" 構建失敗:", error.message);
  process.exit(1);
}
