const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Starting static site build...");

try {
  // Clean previous build
  if (fs.existsSync("out")) {
    console.log("Cleaning previous build files...");
    fs.rmSync("out", { recursive: true, force: true });
  }

  // Set environment variables
  process.env.NODE_ENV = "production";
  
  // Run Next.js build
  console.log("Running Next.js build...");
  execSync("npx next build", { stdio: "inherit" });
  
  // Manually create out directory and copy static files
  console.log("Copying static files to out directory...");
  
  // Create out directory
  if (!fs.existsSync("out")) {
    fs.mkdirSync("out", { recursive: true });
  }
  
  // Copy .next/static to out/static using Node.js fs
  if (fs.existsSync(".next/static")) {
    console.log("Copying static assets...");
    copyDir(".next/static", "out/static");
  }
  
  // Copy public directory to out
  if (fs.existsSync("public")) {
    console.log("Copying public files...");
    copyDir("public", "out");
  }
  
  // Copy HTML files from .next/server/app to out
  if (fs.existsSync(".next/server/app")) {
    console.log("Copying HTML files...");
    copyDir(".next/server/app", "out");
  }
  
  console.log("Static site build completed!");
  console.log("Output directory: out/");
  
} catch (error) {
  console.error("Build failed:", error.message);
  process.exit(1);
}

// Helper function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
