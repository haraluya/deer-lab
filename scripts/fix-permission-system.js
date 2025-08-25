// 權限系統修復腳本
console.log('🔧 開始修復權限系統...\n');

// 需要修復的模組列表
const modulesToFix = [
  {
    name: '物料管理',
    frontend: 'src/app/dashboard/materials/page.tsx',
    backend: 'functions/src/api/materials.ts',
    permissions: ['materials:view', 'materials:create', 'materials:edit', 'materials:delete', '新增物料', '編輯物料', '刪除物料', '查看物料管理']
  },
  {
    name: '產品管理',
    frontend: 'src/app/dashboard/products/page.tsx',
    backend: 'functions/src/api/products.ts',
    permissions: ['products:view', 'products:create', 'products:edit', 'products:delete', '新增產品', '編輯產品', '刪除產品', '查看產品管理']
  },
  {
    name: '工單管理',
    frontend: 'src/app/dashboard/work-orders/page.tsx',
    backend: 'functions/src/api/workOrders.ts',
    permissions: ['workorders:view', 'workorders:create', 'workorders:edit', 'workorders:delete', '新增工單', '編輯工單', '刪除工單', '查看工單管理']
  },
  {
    name: '角色管理',
    frontend: 'src/app/dashboard/roles/page.tsx',
    backend: 'functions/src/api/roles.ts',
    permissions: ['roles:view', 'roles:create', 'roles:edit', 'roles:delete', '新增角色', '編輯角色', '刪除角色', '查看角色管理']
  },
  {
    name: '供應商管理',
    frontend: 'src/app/dashboard/suppliers/page.tsx',
    backend: 'functions/src/api/suppliers.ts',
    permissions: ['suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete', '新增供應商', '編輯供應商', '刪除供應商', '查看供應商管理']
  },
  {
    name: '採購管理',
    frontend: 'src/app/dashboard/purchase-orders/page.tsx',
    backend: 'functions/src/api/purchaseOrders.ts',
    permissions: ['purchase:view', 'purchase:create', 'purchase:edit', 'purchase:delete', '新增採購單', '編輯採購單', '刪除採購單', '查看採購管理']
  },
  {
    name: '庫存管理',
    frontend: 'src/app/dashboard/inventory/page.tsx',
    backend: 'functions/src/api/inventory.ts',
    permissions: ['inventory:view', 'inventory:adjust', '查看庫存管理', '調整庫存']
  },
  {
    name: '報表分析',
    frontend: 'src/app/dashboard/reports/page.tsx',
    backend: null,
    permissions: ['reports:view', '查看報表分析']
  },
  {
    name: '成本管理',
    frontend: 'src/app/dashboard/cost-management/page.tsx',
    backend: null,
    permissions: ['cost:view', '查看成本管理']
  }
];

console.log('📋 需要修復的模組:');
modulesToFix.forEach((module, index) => {
  console.log(`${index + 1}. ${module.name}`);
  console.log(`   前端: ${module.frontend}`);
  console.log(`   後端: ${module.backend || '無'}`);
  console.log(`   權限: ${module.permissions.join(', ')}`);
  console.log('');
});

// 修復建議
console.log('🔧 修復建議:');

console.log('\n1. 前端修復步驟:');
console.log('   - 在每個頁面導入 usePermissions Hook');
console.log('   - 使用對應的權限檢查函數 (如 canManageMaterials)');
console.log('   - 為按鈕和操作添加權限控制');
console.log('   - 添加權限不足的視覺反饋');

console.log('\n2. 後端修復步驟:');
console.log('   - 在每個 API 端點導入對應的權限檢查函數');
console.log('   - 在函數開始處添加權限檢查');
console.log('   - 確保錯誤處理完善');

console.log('\n3. 權限檢查函數擴展:');
console.log('   - 在 usePermissions.ts 中添加更多權限檢查函數');
console.log('   - 在 auth.ts 中添加對應的後端權限檢查函數');

// 具體修復範例
console.log('\n📝 修復範例:');

console.log('\n前端修復範例 (物料管理):');
console.log(`
import { usePermissions } from '@/hooks/usePermissions';

function MaterialsPage() {
  const { canManageMaterials } = usePermissions();
  
  return (
    <Button 
      onClick={handleAdd}
      disabled={!canManageMaterials()}
      className={!canManageMaterials() ? 'opacity-50 cursor-not-allowed' : ''}
    >
      {canManageMaterials() ? '新增物料' : '權限不足'}
    </Button>
  );
}
`);

console.log('\n後端修復範例 (物料管理):');
console.log(`
import { ensureCanManageMaterials } from '../utils/auth';

export const createMaterial = onCall(async (request) => {
  const { auth: contextAuth } = request;
  
  // 檢查權限
  await ensureCanManageMaterials(contextAuth?.uid);
  
  // 執行業務邏輯...
});
`);

console.log('\n🎯 修復優先級:');
console.log('1. 高優先級: 物料管理、產品管理、工單管理');
console.log('2. 中優先級: 角色管理、供應商管理、採購管理');
console.log('3. 低優先級: 庫存管理、報表分析、成本管理');

console.log('\n✅ 修復完成後的效果:');
console.log('- 所有管理功能都有權限控制');
console.log('- 權限不足時有清晰的視覺反饋');
console.log('- 後端 API 有完整的權限驗證');
console.log('- 角色名稱修改不影響權限檢查');
console.log('- 權限系統邏輯統一且完整');

console.log('\n🔧 權限系統修復指南完成！');
