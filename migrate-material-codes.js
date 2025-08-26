// migrate-material-codes.js
// 遷移腳本：將現有物料資料更新為新的代碼系統

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, addDoc, query, where } = require('firebase/firestore');

// Firebase 配置
const firebaseConfig = {
  // 請填入您的 Firebase 配置
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    
    return newId;
  } catch (error) {
    console.error(`獲取或創建${type}ID時發生錯誤:`, error);
    return type === 'category' ? generateCategoryId() : generateSubCategoryId();
  }
}

// 遷移物料代碼
async function migrateMaterialCodes() {
  try {
    console.log('開始遷移物料代碼...');
    
    // 獲取所有物料
    const materialsSnapshot = await getDocs(collection(db, 'materials'));
    console.log(`找到 ${materialsSnapshot.size} 個物料`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const materialDoc of materialsSnapshot.docs) {
      try {
        const materialData = materialDoc.data();
        
        // 跳過已經有新代碼系統的物料
        if (materialData.mainCategoryId && materialData.subCategoryId && materialData.code && materialData.code.length === 9) {
          console.log(`物料 ${materialData.name} 已經使用新代碼系統，跳過`);
          continue;
        }
        
        console.log(`處理物料: ${materialData.name}`);
        
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
        
        console.log(`物料 ${materialData.name} 代號更新: ${materialData.code} -> ${newCode}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`更新物料 ${materialDoc.id} 時發生錯誤:`, error);
        errorCount++;
      }
    }
    
    console.log(`遷移完成！成功更新 ${updatedCount} 個物料，失敗 ${errorCount} 個`);
    
  } catch (error) {
    console.error('遷移過程中發生錯誤:', error);
  }
}

// 執行遷移
if (require.main === module) {
  migrateMaterialCodes()
    .then(() => {
      console.log('遷移腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('遷移腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateMaterialCodes,
  generateCategoryId,
  generateSubCategoryId,
  generateMaterialCode
};
