// test-work-order-bom.js
// 測試工單BOM表功能

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "deer-lab.firebaseapp.com",
  projectId: "deer-lab",
  storageBucket: "deer-lab.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

console.log('開始測試工單BOM表功能...');
console.log('  Project ID:', firebaseConfig.projectId);

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testWorkOrderBOM() {
  try {
    console.log('1. 載入產品資料...');
    
    // 載入產品資料
    const productsSnapshot = await getDocs(collection(db, "products"));
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`找到 ${products.length} 個產品`);
    
    // 找到安溪鐵觀音產品
    const anxiProduct = products.find(p => p.name === '安溪鐵觀音' || p.code === 'BOT-XTS-8869');
    
    if (!anxiProduct) {
      console.log('找不到安溪鐵觀音產品');
      return;
    }
    
    console.log('找到安溪鐵觀音產品:', {
      id: anxiProduct.id,
      name: anxiProduct.name,
      code: anxiProduct.code,
      fragranceName: anxiProduct.fragranceName,
      fragranceCode: anxiProduct.fragranceCode
    });
    
    // 載入香精資訊
    let fragranceName = '未指定';
    let fragranceCode = '未指定';
    if (anxiProduct.currentFragranceRef) {
      try {
        const fragranceDoc = await getDoc(anxiProduct.currentFragranceRef);
        if (fragranceDoc.exists()) {
          const fragranceData = fragranceDoc.data();
          fragranceName = fragranceData.name || '未指定';
          fragranceCode = fragranceData.code || '未指定';
          console.log('香精資訊:', {
            name: fragranceName,
            code: fragranceCode,
            percentage: fragranceData.percentage,
            pgRatio: fragranceData.pgRatio,
            vgRatio: fragranceData.vgRatio
          });
        }
      } catch (error) {
        console.error('獲取香精資訊失敗:', error);
      }
    }
    
    console.log('2. 載入物料資料...');
    
    // 載入物料資料
    const materialsSnapshot = await getDocs(collection(db, "materials"));
    const materials = materialsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // 載入香精資料
    const fragrancesSnapshot = await getDocs(collection(db, "fragrances"));
    const fragrances = fragrancesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // 合併物料和香精資料
    const allMaterials = [...materials, ...fragrances];
    
    console.log(`載入的物料: ${materials.length} 個`);
    console.log(`載入的香精: ${fragrances.length} 個`);
    console.log(`合併後的總物料: ${allMaterials.length} 個`);
    
    console.log('3. 測試香精匹配...');
    
    // 測試香精匹配
    const fragranceMaterial = allMaterials.find(m => 
      m.code === fragranceCode || 
      m.name === fragranceName ||
      m.name.includes(fragranceName) ||
      (fragranceCode && m.code.includes(fragranceCode))
    );
    
    console.log('香精匹配結果:', {
      fragranceCode,
      fragranceName,
      foundMaterial: fragranceMaterial ? {
        id: fragranceMaterial.id,
        code: fragranceMaterial.code,
        name: fragranceMaterial.name,
        currentStock: fragranceMaterial.currentStock
      } : null
    });
    
    if (fragranceMaterial) {
      console.log('✅ 香精匹配成功！');
    } else {
      console.log('❌ 香精匹配失敗！');
      
      // 顯示所有香精資料以便調試
      console.log('所有香精資料:');
      fragrances.forEach(f => {
        console.log(`  - ${f.code}: ${f.name} (庫存: ${f.currentStock || 0})`);
      });
    }
    
    console.log('4. 測試BOM表計算...');
    
    // 模擬BOM表計算
    const targetQuantity = 15; // 15 KG
    const fragranceRatios = { fragrance: 0.26, pg: 0.34, vg: 0.40 }; // 根據圖片中的比例
    
    if (fragranceMaterial) {
      const fragranceQuantity = targetQuantity * fragranceRatios.fragrance;
      console.log('香精需求量計算:', {
        targetQuantity,
        fragranceRatio: fragranceRatios.fragrance,
        fragranceQuantity: fragranceQuantity.toFixed(3),
        currentStock: fragranceMaterial.currentStock || 0,
        hasEnoughStock: (fragranceMaterial.currentStock || 0) >= fragranceQuantity
      });
    }
    
    console.log('測試完成！');
    
  } catch (error) {
    console.error('測試失敗:', error);
  }
}

testWorkOrderBOM();
