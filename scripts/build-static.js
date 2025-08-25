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
  
  // ���� Next.js �c�ء]�w�]�t�R�A�ɥX�^
  console.log(" ���� Next.js �c��...");
  execSync("npx next build", { stdio: "inherit" });
  
  // Next.js �c�ؤw�g�]�t�R�A�ɥX�]output: export �t�m�^
  console.log(" �R�A�ɥX�w�����]�q�L next.config.mts �t�m�^");
  
  console.log(" �R�A�����c�ا����I");
  console.log(" ��X�ؿ�: out/");
  
} catch (error) {
  console.error(" �c�إ���:", error.message);
  process.exit(1);
}
