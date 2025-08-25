// 測試權限修復
console.log('🧪 測試權限修復...');

// 模擬權限檢查邏輯
function testPermissionCheck(userRole, requiredPermissions) {
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

// 測試您的實際角色權限
const actualRole = {
  name: '系統管理員',
  permissions: [
    'dashboard:view', 'personnel:view', 'personnel:create', 'personnel:edit',
    'personnel:delete', 'roles:view', 'roles:create', 'roles:edit', 'roles:delete',
    'materials:view', 'materials:create', 'materials:edit', 'materials:delete',
    'fragrances:view', 'fragrances:create', 'fragrances:edit', 'fragrances:delete',
    'products:view', 'products:create', 'products:edit', 'products:delete',
    'workorders:view', 'workorders:create', 'workorders:edit', 'workorders:delete',
    'inventory:view', 'inventory:adjust', 'purchase:view', 'purchase:create',
    'purchase:edit', 'purchase:receive', 'reports:view', 'cost:view'
  ]
};

// 修復後的權限檢查（支援中文和英文格式）
const fixedPermissions = [
  // 中文格式
  "新增人員", "編輯人員", "刪除人員", "查看人員管理",
  // 英文格式
  "personnel:create", "personnel:edit", "personnel:delete", "personnel:view"
];

console.log('🧪 測試修復後的權限檢查...');
const result = testPermissionCheck(actualRole, fixedPermissions);

console.log('\n' + '='.repeat(50));
if (result) {
  console.log('🎉 修復成功！權限檢查現在應該可以通過');
  console.log('💡 您的「系統管理員」角色具有以下人員管理權限:');
  console.log('   ✅ personnel:create (新增人員)');
  console.log('   ✅ personnel:edit (編輯人員)');
  console.log('   ✅ personnel:delete (刪除人員)');
  console.log('   ✅ personnel:view (查看人員管理)');
} else {
  console.log('❌ 修復失敗，權限檢查仍然無法通過');
}

console.log('\n📋 下一步:');
console.log('1. 重新啟動本地開發伺服器');
console.log('2. 測試人員管理功能');
console.log('3. 確認「新增」和「編輯」按鈕可以正常工作');
