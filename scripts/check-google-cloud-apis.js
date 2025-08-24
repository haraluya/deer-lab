// scripts/check-google-cloud-apis.js
const https = require('https');

const projectId = 'deer-lab';
const apisToCheck = [
  'firebase.googleapis.com',
  'firebasehosting.googleapis.com',
  'identitytoolkit.googleapis.com',
  'firestore.googleapis.com',
  'cloudfunctions.googleapis.com',
  'cloudbuild.googleapis.com',
  'run.googleapis.com',
  'eventarc.googleapis.com',
  'pubsub.googleapis.com',
  'storage.googleapis.com',
  'cloudresourcemanager.googleapis.com',
  'serviceusage.googleapis.com',
  'iam.googleapis.com'
];

async function checkApi(apiName) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'serviceusage.googleapis.com',
      port: 443,
      path: `/v1/projects/${projectId}/services/${apiName}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            api: apiName,
            enabled: result.state === 'ENABLED',
            state: result.state || 'UNKNOWN'
          });
        } catch (error) {
          resolve({
            api: apiName,
            enabled: false,
            state: 'ERROR',
            error: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        api: apiName,
        enabled: false,
        state: 'ERROR',
        error: error.message
      });
    });

    req.end();
  });
}

async function checkAllApis() {
  console.log('🔍 檢查 Google Cloud API 啟用狀態...\n');
  
  const results = [];
  
  for (const api of apisToCheck) {
    console.log(`檢查 ${api}...`);
    const result = await checkApi(api);
    results.push(result);
    
    const status = result.enabled ? '✅ 已啟用' : '❌ 未啟用';
    console.log(`  ${status} (${result.state})`);
  }
  
  console.log('\n📋 檢查結果摘要：');
  console.log('='.repeat(50));
  
  const enabled = results.filter(r => r.enabled);
  const disabled = results.filter(r => !r.enabled);
  
  console.log(`✅ 已啟用的 API: ${enabled.length}/${apisToCheck.length}`);
  enabled.forEach(r => console.log(`  - ${r.api}`));
  
  if (disabled.length > 0) {
    console.log(`\n❌ 未啟用的 API: ${disabled.length}/${apisToCheck.length}`);
    disabled.forEach(r => console.log(`  - ${r.api} (${r.state})`));
    
    console.log('\n🔧 需要啟用的 API：');
    console.log('請前往 Google Cloud Console > API 和服務 > 程式庫');
    console.log('搜尋並啟用以下 API：');
    disabled.forEach(r => console.log(`  - ${r.api}`));
  } else {
    console.log('\n🎉 所有必要的 API 都已啟用！');
  }
  
  console.log('\n📝 手動檢查連結：');
  console.log(`https://console.cloud.google.com/apis/library?project=${projectId}`);
}

checkAllApis().catch(console.error);
