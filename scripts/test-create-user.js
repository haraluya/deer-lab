// scripts/test-create-user.js
const https = require('https');

async function callCreateTestUser() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({});
    
    const options = {
      hostname: 'us-central1-deer-lab.cloudfunctions.net',
      port: 443,
      path: '/createTestUser',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    console.log('Calling createTestUser function...');
    const result = await callCreateTestUser();
    console.log('✅ Success:', result);
    
    if (result.result && result.result.credentials) {
      console.log('\n🎉 Test user created successfully!');
      console.log('Login credentials:');
      console.log(`  Employee ID: ${result.result.credentials.employeeId}`);
      console.log(`  Password: ${result.result.credentials.password}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
