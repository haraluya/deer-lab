// 測試權限檢查邏輯
console.log('🧪 測試權限檢查邏輯...');

// 模擬角色資料
const mockRoles = {
  'system-admin': {
    name: '系統管理員',
    permissions: [
      '查看系統總覽',
      '新增人員',
      '編輯人員',
      '刪除人員',
      '查看人員管理',
      '新增角色',
      '編輯角色',
      '刪除角色',
      '查看角色管理',
      '查看物料管理',
      '新增物料',
      '編輯物料',
      '刪除物料',
      '查看香精管理',
      '新增香精',
      '編輯香精',
      '刪除香精',
      '查看產品管理',
      '新增產品',
      '編輯產品',
      '刪除產品',
      '查看工單管理',
      '新增工單',
      '編輯工單',
      '刪除工單',
      '查看庫存管理',
      '調整庫存',
      '查看採購管理',
      '新增採購單',
      '編輯採購單',
      '確認入庫',
      '查看報表分析',
      '查看成本管理'
    ]
  },
  'manager': {
    name: '管理員',
    permissions: [
      '查看人員管理',
      '新增人員',
      '編輯人員',
      '查看物料管理',
      '新增物料',
      '編輯物料',
      '查看產品管理',
      '新增產品',
      '編輯產品'
    ]
  },
  'foreman': {
    name: '領班',
    permissions: [
      '查看工單管理',
      '新增工單',
      '編輯工單',
      '查看庫存管理',
      '調整庫存'
    ]
  },
  'operator': {
    name: '操作員',
    permissions: [
      '查看物料管理',
      '查看產品管理',
      '查看工單管理'
    ]
  }
};

// 模擬權限檢查函數
function checkPermission(roleId, requiredPermission) {
  const role = mockRoles[roleId];
  if (!role) {
    return { success: false, message: '角色不存在' };
  }
  
  const hasPermission = role.permissions.includes(requiredPermission);
  return {
    success: hasPermission,
    message: hasPermission 
      ? `✅ 權限檢查成功: 角色 ${role.name} 具有權限 ${requiredPermission}`
      : `❌ 權限檢查失敗: 角色 ${role.name} 需要權限 ${requiredPermission}，但只有權限: ${role.permissions.join(', ')}`
  };
}

// 測試各種權限檢查
console.log('\n📋 測試權限檢查結果:');

const testCases = [
  { role: 'system-admin', permission: '新增人員', expected: true },
  { role: 'system-admin', permission: '刪除角色', expected: true },
  { role: 'manager', permission: '新增人員', expected: true },
  { role: 'manager', permission: '刪除角色', expected: false },
  { role: 'foreman', permission: '新增工單', expected: true },
  { role: 'foreman', permission: '新增人員', expected: false },
  { role: 'operator', permission: '查看物料管理', expected: true },
  { role: 'operator', permission: '新增物料', expected: false }
];

testCases.forEach(({ role, permission, expected }) => {
  const result = checkPermission(role, permission);
  const status = result.success === expected ? '✅' : '❌';
  console.log(`${status} ${result.message}`);
});

console.log('\n🎯 權限檢查邏輯測試完成！');
console.log('\n💡 重要提醒:');
console.log('1. 權限檢查基於角色的權限列表，而不是角色名稱');
console.log('2. 即使角色名稱改變，只要權限列表正確，功能就能正常運作');
console.log('3. 每個功能都需要明確的權限檢查');
console.log('4. 系統會記錄詳細的權限檢查日誌');
