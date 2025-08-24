const https = require('https');
const fs = require('fs');

const BASE_URL = 'https://deer-lab.web.app';

// 測試的檔案清單
const testFiles = [
  '/',
  '/dashboard',
  '/static/css/ca0a7c8fcb67dc11.css',
  '/static/chunks/webpack-a6b739e4cdc9fbd7.js',
  '/manifest.json',
  '/icon-192x192.png'
];

// 測試檔案
function testFile(url) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${BASE_URL}${url}`;
    
    https.get(fullUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${url} - 狀態碼: ${res.statusCode}`);
          
          // 檢查內容類型
          const contentType = res.headers['content-type'] || '';
          if (url.endsWith('.js') && !contentType.includes('javascript')) {
            console.log(`⚠️  警告: ${url} 的 Content-Type 不是 JavaScript`);
          } else if (url.endsWith('.css') && !contentType.includes('css')) {
            console.log(`⚠️  警告: ${url} 的 Content-Type 不是 CSS`);
          } else if (url.endsWith('.html') && !contentType.includes('html')) {
            console.log(`⚠️  警告: ${url} 的 Content-Type 不是 HTML`);
          }
          
          resolve({ url, status: res.statusCode, contentType });
        } else {
          console.log(`❌ ${url} - 狀態碼: ${res.statusCode}`);
          reject({ url, status: res.statusCode });
        }
      });
    }).on('error', (err) => {
      console.log(`❌ ${url} - 錯誤: ${err.message}`);
      reject({ url, error: err.message });
    });
  });
}

// 主測試函數
async function testDeployment() {
  console.log('🧪 開始測試部署...\n');
  
  const results = [];
  
  for (const file of testFiles) {
    try {
      const result = await testFile(file);
      results.push(result);
    } catch (error) {
      results.push(error);
    }
  }
  
  console.log('\n📊 測試結果摘要:');
  const successCount = results.filter(r => r.status === 200).length;
  const totalCount = testFiles.length;
  
  console.log(`✅ 成功: ${successCount}/${totalCount}`);
  console.log(`❌ 失敗: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 所有測試通過！部署成功！');
    console.log(`🌍 您的應用程式已成功部署到: ${BASE_URL}`);
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查部署配置');
  }
  
  return results;
}

// 執行測試
testDeployment().catch(console.error);
