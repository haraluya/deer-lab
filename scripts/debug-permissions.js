// 調試權限問題
console.log('🔍 調試權限問題...');

// 模擬權限檢查邏輯
function debugPermissionCheck(userRole, requiredPermissions) {
  console.log(`\n👤 使用者角色: ${userRole.name}`);
  console.log(`📋 角色權限: ${userRole.permissions.join(', ')}`);
  console.log(`🎯 需要的權限: ${requiredPermissions.join(', ')}`);
  
  const hasAnyPermission = requiredPermissions.some(permission => 
    userRole.permissions.includes(permission)
  );
  
  console.log(`\n✅ 權限檢查結果: ${hasAnyPermission ? '通過' : '失敗'}`);
  
  if (!hasAnyPermission) {
    console.log('❌ 缺少以下權限:');
    requiredPermissions.forEach(permission => {
      const hasPermission = userRole.permissions.includes(permission);
      console.log(`   ${hasPermission ? '✅' : '❌'} ${permission}`);
    });
  } else {
    const foundPermissions = requiredPermissions.filter(permission => 
      userRole.permissions.includes(permission)
    );
    console.log('✅ 找到以下權限:');
    foundPermissions.forEach(permission => {
      console.log(`   ✅ ${permission}`);
    });
  }
  
  return hasAnyPermission;
}

// 測試不同的角色
const testRoles = [
  {
    name: '計時人員',
    permissions: ['查看工單管理', '新增工單', '編輯工單']
  },
  {
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
      '查看角色管理'
    ]
  },
  {
    name: '管理員',
    permissions: [
      '查看人員管理',
      '新增人員',
      '編輯人員',
      '查看物料管理',
      '新增物料',
      '編輯物料'
    ]
  },
  {
    name: '領班',
    permissions: [
      '查看工單管理',
      '新增工單',
      '編輯工單',
      '查看庫存管理',
      '調整庫存'
    ]
  }
];

const requiredPersonnelPermissions = ['新增人員', '編輯人員', '刪除人員', '查看人員管理'];

console.log('🧪 測試各種角色的權限...');

testRoles.forEach(role => {
  console.log('\n' + '='.repeat(50));
  debugPermissionCheck(role, requiredPersonnelPermissions);
});

console.log('\n' + '='.repeat(50));
console.log('🎯 結論:');
console.log('1. 計時人員角色沒有人員管理權限，所以無法新增/編輯人員');
console.log('2. 系統管理員和管理員角色有權限，可以正常操作');
console.log('3. 領班角色沒有人員管理權限，無法操作');
console.log('\n💡 解決方案:');
console.log('   - 為計時人員角色添加「編輯人員」權限');
console.log('   - 或者使用具有人員管理權限的角色登入');
console.log('   - 或者修改權限檢查邏輯，允許特定角色進行操作');
