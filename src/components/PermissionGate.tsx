// src/components/PermissionGate.tsx
/**
 * 權限控制閘道元件
 * 用於條件性渲染基於權限的內容
 */

import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGateProps {
  /** 子元件 */
  children: React.ReactNode;
  /** 需要的權限（至少需要其中一個） */
  permissions?: string[];
  /** 需要的角色（至少需要其中一個） */
  roles?: string[];
  /** 需要全部權限（必須擁有所有權限） */
  requireAll?: boolean;
  /** 無權限時顯示的內容 */
  fallback?: React.ReactNode;
  /** 是否反向檢查（沒有權限時才顯示） */
  inverse?: boolean;
}

/**
 * 權限控制元件
 * 根據使用者權限決定是否渲染子元件
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback = null,
  inverse = false,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, userRole } = usePermission();

  // 檢查權限
  let hasRequiredPermissions = true;

  if (permissions.length > 0) {
    if (requireAll) {
      hasRequiredPermissions = hasAllPermissions(permissions);
    } else {
      hasRequiredPermissions = hasAnyPermission(permissions);
    }
  }

  // 檢查角色
  let hasRequiredRole = true;
  if (roles.length > 0) {
    hasRequiredRole = roles.includes(userRole);
  }

  // 最終權限結果
  const hasAccess = hasRequiredPermissions && hasRequiredRole;

  // 根據 inverse 參數決定渲染邏輯
  const shouldRender = inverse ? !hasAccess : hasAccess;

  if (shouldRender) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * 頁面權限控制元件
 * 檢查使用者是否可以訪問特定頁面
 */
export const PagePermissionGate: React.FC<{
  children: React.ReactNode;
  pathname: string;
  fallback?: React.ReactNode;
}> = ({ children, pathname, fallback = null }) => {
  const { canAccess } = usePermission();

  if (canAccess(pathname)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * 管理權限控制元件
 * 檢查使用者是否可以管理特定頁面
 */
export const ManagePermissionGate: React.FC<{
  children: React.ReactNode;
  pathname: string;
  fallback?: React.ReactNode;
}> = ({ children, pathname, fallback = null }) => {
  const { canManage } = usePermission();

  if (canManage(pathname)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * 角色權限控制元件
 * 檢查使用者是否具有特定角色
 */
export const RoleGate: React.FC<{
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
}> = ({ children, roles, fallback = null }) => {
  const { userRole } = usePermission();

  if (roles.includes(userRole)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

// 便捷的角色檢查元件
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ children, fallback = null }) => {
  const { isAdmin } = usePermission();
  
  if (isAdmin()) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

export const ForemanOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ children, fallback = null }) => (
  <RoleGate roles={['生產領班']} fallback={fallback}>
    {children}
  </RoleGate>
);

export const TimekeeperOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ children, fallback = null }) => (
  <RoleGate roles={['計時人員']} fallback={fallback}>
    {children}
  </RoleGate>
);

export const AdminOrForeman: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ children, fallback = null }) => (
  <RoleGate roles={['系統管理員', '生產領班']} fallback={fallback}>
    {children}
  </RoleGate>
);

export default PermissionGate;