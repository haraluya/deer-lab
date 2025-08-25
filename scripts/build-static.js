const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log(" �}�l�c���R�A����...");

try {
  // �M�z���e���c��
  if (fs.existsSync("out")) {
    console.log(" �M�z���e���c�ؤ��...");
    fs.rmSync("out", { recursive: true, force: true });
  }

  // �]�m�����ܼ�
  process.env.NODE_ENV = "production";
  
  // ���� Next.js �c��
  console.log(" ���� Next.js �c��...");
  execSync("npx next build", { stdio: "inherit" });
  
  // ��ʳЫ� out �ؿ��ýƻs�R�A���
  console.log(" �ƻs�R�A���� out �ؿ�...");
  
  // �Ы� out �ؿ�
  if (!fs.existsSync("out")) {
    fs.mkdirSync("out", { recursive: true });
  }
  
  // �ƻs .next/static �� out/static
  if (fs.existsSync(".next/static")) {
    execSync("xcopy \".next\\static\" \"out\\static\" /E /I /Y", { stdio: "inherit" });
  }
  
  // �ƻs public �ؿ��� out
  if (fs.existsSync("public")) {
    execSync("xcopy \"public\" \"out\" /E /I /Y", { stdio: "inherit" });
  }
  
  // �ƻs HTML ���
  if (fs.existsSync(".next/server/app")) {
    execSync("xcopy \".next\\server\\app\" \"out\" /E /I /Y", { stdio: "inherit" });
  }
  
  console.log(" �R�A�����c�ا����I");
  console.log(" ��X�ؿ�: out/");
  
} catch (error) {
  console.error(" �c�إ���:", error.message);
  process.exit(1);
}
