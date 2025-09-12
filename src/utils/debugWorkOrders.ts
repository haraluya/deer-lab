// 工單載入調試工具
import { db } from '@/lib/firebase'
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore'

export async function debugWorkOrders() {
  console.log('🔧 開始調試工單載入...')
  
  try {
    // 1. 檢查 Firebase 初始化
    if (!db) {
      console.error('❌ Firebase db 未初始化')
      return
    }
    console.log('✅ Firebase db 已初始化')
    
    // 2. 檢查 workOrders 集合是否存在
    console.log('🔍 檢查 workOrders 集合...')
    const workOrdersRef = collection(db, 'workOrders')
    
    // 3. 嘗試簡單查詢
    console.log('📋 執行簡單查詢...')
    const simpleQuery = query(workOrdersRef, limit(1))
    const simpleSnapshot = await getDocs(simpleQuery)
    
    console.log(`📊 簡單查詢結果: ${simpleSnapshot.size} 筆資料`)
    
    if (simpleSnapshot.size === 0) {
      console.log('⚠️ workOrders 集合是空的或不存在')
      
      // 檢查所有集合
      console.log('🔍 列出所有可用的集合...')
      // 注意：這在 Web SDK 中無法直接列出所有集合
      
      return
    }
    
    // 4. 執行與頁面相同的查詢
    console.log('🔍 執行與頁面相同的查詢...')
    const pageQuery = query(
      workOrdersRef,
      orderBy('createdAt', 'desc'),
      limit(5)
    )
    
    const pageSnapshot = await getDocs(pageQuery)
    console.log(`📊 頁面查詢結果: ${pageSnapshot.size} 筆資料`)
    
    // 5. 顯示資料內容
    if (pageSnapshot.size > 0) {
      console.log('📄 工單資料範例:')
      pageSnapshot.docs.forEach((doc, index) => {
        const data = doc.data()
        console.log(`${index + 1}. ID: ${doc.id}`)
        console.log(`   編號: ${data.code || '無'}`)
        console.log(`   產品: ${data.productSnapshot?.name || '無'}`)
        console.log(`   狀態: ${data.status || '無'}`)
        console.log(`   建立時間: ${data.createdAt ? data.createdAt.toDate() : '無'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ 調試過程發生錯誤:', error)
    
    // 詳細錯誤分析
    if (error instanceof Error) {
      console.error('錯誤訊息:', error.message)
      console.error('錯誤堆疊:', error.stack)
      
      // Firebase 特定錯誤
      if ('code' in error) {
        console.error('Firebase 錯誤代碼:', (error as any).code)
        
        switch ((error as any).code) {
          case 'permission-denied':
            console.log('🚨 權限被拒絕 - 檢查 Firestore 規則或用戶登入狀態')
            break
          case 'unavailable':
            console.log('🚨 服務不可用 - 檢查網路連接')
            break
          case 'not-found':
            console.log('🚨 找不到資源 - 檢查集合名稱或文檔是否存在')
            break
          case 'failed-precondition':
            console.log('🚨 前置條件失敗 - 可能需要建立索引')
            break
          default:
            console.log('🚨 未知的 Firebase 錯誤')
        }
      }
    }
  }
}

// 在瀏覽器控制台中使用
if (typeof window !== 'undefined') {
  (window as any).debugWorkOrders = debugWorkOrders
}