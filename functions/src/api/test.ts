// functions/src/api/test.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();
const auth = getAuth();

export const createTestUser = onCall(async (request) => {
  try {
    console.log('Creating test user...');
    
    // 創建管理員角色（如果不存在）
    const adminRoleRef = db.collection('roles').doc('admin');
    const adminRoleDoc = await adminRoleRef.get();
    
    if (!adminRoleDoc.exists) {
      await adminRoleRef.set({
        name: '管理員',
        description: '系統管理員',
        permissions: [
          'users:view', 'users:create', 'users:edit', 'users:delete',
          'roles:view', 'roles:create', 'roles:edit', 'roles:delete',
          'materials:view', 'materials:create', 'materials:edit', 'materials:delete',
          'fragrances:view', 'fragrances:create', 'fragrances:edit', 'fragrances:delete',
          'products:view', 'products:create', 'products:edit', 'products:delete',
          'workorders:view', 'workorders:create', 'workorders:edit', 'workorders:delete',
          'purchase:view', 'purchase:create', 'purchase:edit', 'purchase:receive',
          'personnel:view', 'personnel:create', 'personnel:edit', 'personnel:delete',
          'reports:view'
        ],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      logger.info('Admin role created');
    } else {
      logger.info('Admin role already exists');
    }
    
    // 創建測試用戶（工號 001）
    const userData = {
      name: '測試用戶',
      employeeId: '001',
      email: '001@deer-lab.local',
      roleRef: adminRoleRef,
      hourlyWage: 200,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc('001').set(userData);
    logger.info('Test user created with employeeId: 001');
    
    // 創建 Firebase Auth 用戶
    await auth.createUser({
      uid: '001',
      email: '001@deer-lab.local',
      password: '123456',
      displayName: '測試用戶'
    });
    logger.info('Firebase Auth user created');
    
    return {
      status: 'success',
      message: 'Test user created successfully',
      credentials: {
        employeeId: '001',
        password: '123456'
      }
    };
    
  } catch (error) {
    logger.error('Error creating test user:', error);
    throw new HttpsError('internal', 'Failed to create test user');
  }
});
