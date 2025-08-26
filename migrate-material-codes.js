// migrate-material-codes.js
// 遷移腳本：將現有物料資料更新為新的代碼系統

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, addDoc, query, where } = require('firebase/firestore');
require('dotenv').config();

// Firebase 配置 - 使用環境變數
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// 檢查配置
console.log('🔧 檢查 Firebase 配置...');
console.log('  API Key:', firebaseConfig.apiKey ? '✅ 已設置' : '❌ 未設置');
console.log('  Auth Domain:', firebaseConfig.authDomain ? '✅ 已設置' : '❌ 未設置');
console.log('  Project ID:', firebaseConfig.projectId ? '✅ 已設置' : '❌ 未設置');
console.log('  Storage Bucket:', firebaseConfig.storageBucket ? '✅ 已設置' : '❌ 未設置');
console.log('  Messaging Sender ID:', firebaseConfig.messagingSenderId ? '✅ 已設置' : '❌ 未設置');
console.log('  App ID:', firebaseConfig.appId ? '✅ 已設置' : '❌ 未設置');

// 檢查必要的配置
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('❌ 缺少必要的 Firebase 配置！');
  console.error('請確保以下環境變數已設置：');
  console.error('  - NEXT_PUBLIC_FIREBASE_API_KEY');
  console.error('  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  console.error('  - NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  process.exit(1);
}

// 初始化 Firebase
console.log('🚀 初始化 Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log('✅ Firebase 初始化成功');

// 生成 2 位大寫英文字母 ID (主分類)
function generateCategoryId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 2; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

// 生成 3 位數字 ID (細分分類)
function generateSubCategoryId() {
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// 生成 4 位隨機數字
function generateRandomCode() {
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// 新的物料代號生成：主分類ID(2位字母) + 細分分類ID(3位數字) + 隨機生成碼(4位數字) = 9碼
function generateMaterialCode(mainCategoryId, subCategoryId, randomCode) {
  const categoryId = mainCategoryId ? mainCategoryId.substring(0, 2).toUpperCase() : 'XX';
  const subCategoryIdStr = subCategoryId ? subCategoryId.padStart(3, '0').substring(0, 3) : '000';
  const randomPart = randomCode || generateRandomCode();
  
  return `${categoryId}${subCategoryIdStr}${randomPart}`;
}

// 獲取或創建分類ID
async function getOrCreateCategoryId(categoryName, type) {
  try {
    const collectionName = type === 'category' ? 'materialCategories' : 'materialSubCategories';
    const categoryQuery = query(collection(db, collectionName), where('name', '==', categoryName));
    const categorySnapshot = await getDocs(categoryQuery);
    
    if (!categorySnapshot.empty) {
      const doc = categorySnapshot.docs[0];
      return doc.data().id || (type === 'category' ? generateCategoryId() : generateSubCategoryId());
    }
    
    // 如果不存在，創建新的
    const newId = type === 'category' ? generateCategoryId() : generateSubCategoryId();
    await addDoc(collection(db, collectionName), {
      name: categoryName,
      id: newId,
      type: type,
      createdAt: new Date()
    });
    
    console.log(`✅ 創建新${type === 'category' ? '主分類' : '細分分類'}: ${categoryName} (ID: ${newId})`);
    return newId;
  } catch (error) {
    console.error(`❌ 獲取或創建${type}ID時發生錯誤:`, error);
    return type === 'category' ? generateCategoryId() : generateSubCategoryId();
  }
}

// 遷移物料代碼
async function migrateMaterialCodes() {
  try {
    console.log('🚀 開始遷移物料代碼...');
    console.log('📋 遷移規則：');
    console.log('  - 主分類ID: 2位大寫字母');
    console.log('  - 細分分類ID: 3位數字');
    console.log('  - 隨機生成碼: 4位數字');
    console.log('  - 總長度: 9位');
    console.log('');
    
    // 獲取所有物料
    const materialsSnapshot = await getDocs(collection(db, 'materials'));
    console.log(`📦 找到 ${materialsSnapshot.size} 個物料`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const materialDoc of materialsSnapshot.docs) {
      try {
        const materialData = materialDoc.data();
        
        // 跳過已經有新代碼系統的物料
        if (materialData.mainCategoryId && materialData.subCategoryId && materialData.code && materialData.code.length === 9) {
          console.log(`⏭️  物料 ${materialData.name} 已經使用新代碼系統，跳過`);
          skippedCount++;
          continue;
        }
        
        console.log(`🔄 處理物料: ${materialData.name} (當前代碼: ${materialData.code})`);
        
        // 獲取或創建分類ID
        const mainCategoryId = await getOrCreateCategoryId(materialData.category, 'category');
        const subCategoryId = await getOrCreateCategoryId(materialData.subCategory, 'subCategory');
        
        // 生成新的物料代號
        const newCode = generateMaterialCode(mainCategoryId, subCategoryId);
        
        // 更新物料資料
        await updateDoc(doc(db, 'materials', materialDoc.id), {
          mainCategoryId,
          subCategoryId,
          code: newCode,
          updatedAt: new Date()
        });
        
        console.log(`✅ 物料 ${materialData.name} 代號更新: ${materialData.code} → ${newCode}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ 更新物料 ${materialDoc.id} 時發生錯誤:`, error);
        errorCount++;
      }
    }
    
    console.log('');
    console.log('🎉 遷移完成！');
    console.log(`  ✅ 成功更新: ${updatedCount} 個物料`);
    console.log(`  ⏭️  跳過: ${skippedCount} 個物料 (已使用新格式)`);
    console.log(`  ❌ 失敗: ${errorCount} 個物料`);
    console.log('');
    console.log('📝 新代碼格式範例:');
    console.log('  - AB1234567 (主分類AB + 細分分類123 + 隨機碼4567)');
    console.log('  - XY7890123 (主分類XY + 細分分類789 + 隨機碼0123)');
    
  } catch (error) {
    console.error('❌ 遷移過程中發生錯誤:', error);
  }
}

// 執行遷移
if (require.main === module) {
  console.log('🔧 物料代碼遷移工具');
  console.log('='.repeat(50));
  
  migrateMaterialCodes()
    .then(() => {
      console.log('');
      console.log('✅ 遷移腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 遷移腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateMaterialCodes,
  generateCategoryId,
  generateSubCategoryId,
  generateMaterialCode
};
