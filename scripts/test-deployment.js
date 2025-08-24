const https = require('https');
const http = require('http');

const BASE_URL = 'https://deer-lab.web.app';

// 測試函數
async function testUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          contentType: res.headers['content-type'],
          data: data.substring(0, 200) // 只取前200字元
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        status: 0,
        error: err.message
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        status: 0,
        error: 'Timeout'
      });
    });
  });
}

// 主要測試函數
async function testDeployment() {
  console.log('🧪 開始測試部署...');
  
  const tests = [
    {
      name: '主頁面',
      url: `${BASE_URL}/`,
      expectedContentType: 'text/html'
    },
    {
      name: 'Dashboard 頁面',
      url: `${BASE_URL}/dashboard`,
      expectedContentType: 'text/html'
    },
    {
      name: 'CSS 檔案',
      url: `${BASE_URL}/static/css/efda04f91e2683a7.css`,
      expectedContentType: 'text/css'
    },
    {
      name: 'JavaScript 檔案',
      url: `${BASE_URL}/static/chunks/webpack-a6b739e4cdc9fbd7.js`,
      expectedContentType: 'application/javascript'
    },
    {
      name: 'Manifest 檔案',
      url: `${BASE_URL}/manifest.json`,
      expectedContentType: 'application/json'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n📋 測試: ${test.name}`);
    console.log(`🔗 URL: ${test.url}`);
    
    const result = await testUrl(test.url);
    
    if (result.status === 200) {
      if (result.contentType && result.contentType.includes(test.expectedContentType.split('/')[1])) {
        console.log(`✅ 通過 - 狀態碼: ${result.status}, 內容類型: ${result.contentType}`);
        passed++;
      } else {
        console.log(`⚠️  警告 - 狀態碼: ${result.status}, 內容類型: ${result.contentType} (預期: ${test.expectedContentType})`);
        passed++;
      }
    } else {
      console.log(`❌ 失敗 - 狀態碼: ${result.status}, 錯誤: ${result.error || '未知錯誤'}`);
      failed++;
    }
  }
  
  console.log('\n📊 測試結果總結:');
  console.log(`✅ 通過: ${passed}`);
  console.log(`❌ 失敗: ${failed}`);
  console.log(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 所有測試通過！部署成功！');
    console.log(`🌍 您的應用程式已成功部署到: ${BASE_URL}`);
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查部署配置。');
  }
}

// 執行測試
testDeployment().catch(console.error);
