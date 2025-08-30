require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, getDoc } = require('firebase/firestore');

// Firebase 配置
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('Firebase 配置檢查:');
console.log('  Project ID:', firebaseConfig.projectId);

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAndUpdateProductBOM() {
  try {
    console.log('開始檢查產品BOM資料...');
    
    // 1. 獲取所有產品
    const productsSnapshot = await getDocs(collection(db, "products"));
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`找到 ${products.length} 個產品`);
    
    // 2. 找到皇家康普茶產品
    const royalKombucha = products.find(p => p.name === '皇家康普茶' || p.code === 'BOT-XTS-5610');
    
    if (!royalKombucha) {
      console.log('找不到皇家康普茶產品');
      return;
    }
    
    console.log('找到皇家康普茶產品:', royalKombucha.id);
    console.log('當前BOM資料:', royalKombucha.billOfMaterials || '無');
    
    // 3. 獲取所有物料
    const materialsSnapshot = await getDocs(collection(db, "materials"));
    const materials = materialsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`找到 ${materials.length} 個物料`);
    
    // 4. 根據產品詳情圖片，找到需要的物料
    const requiredMaterials = [
      // 通用材料
      { name: '30ML-矮-黑-空瓶', quantity: 1, unit: '個', category: 'common' },
      { name: '30ML-矮-黑-蓋子', quantity: 1, unit: '個', category: 'common' },
      { name: 'PG丙二醇', quantity: 0.4501, unit: 'KG', category: 'common' },
      { name: 'VG甘油', quantity: 0.1929, unit: 'KG', category: 'common' },
      { name: 'NicSalt丁鹽250mg', quantity: 0.08, unit: 'KG', category: 'common' },
      
      // 專屬材料
      { name: '小茶山-大紙盒-皇家康普茶', quantity: 1, unit: '個', category: 'specific' },
      { name: '小茶山-貼紙-皇家康普茶', quantity: 1, unit: '個', category: 'specific' }
    ];
    
    // 5. 建立BOM陣列
    const billOfMaterials = [];
    
    for (const required of requiredMaterials) {
      const material = materials.find(m => m.name.includes(required.name) || required.name.includes(m.name));
      
      if (material) {
        billOfMaterials.push({
          materialId: material.id,
          materialCode: material.code,
          materialName: material.name,
          quantity: required.quantity,
          unit: required.unit,
          category: required.category
        });
        console.log(`找到物料: ${material.name} (${material.code})`);
      } else {
        console.log(`找不到物料: ${required.name}`);
      }
    }
    
    console.log('準備更新的BOM資料:', billOfMaterials);
    
    // 6. 更新產品
    if (billOfMaterials.length > 0) {
      await updateDoc(doc(db, "products", royalKombucha.id), {
        billOfMaterials: billOfMaterials
      });
      console.log('✅ 產品BOM資料更新成功！');
    } else {
      console.log('❌ 沒有找到任何物料，無法更新');
    }
    
  } catch (error) {
    console.error('錯誤:', error);
  }
}

// 執行檢查和更新
checkAndUpdateProductBOM();
