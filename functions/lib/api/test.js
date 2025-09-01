"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestUser = void 0;
// functions/src/api/test.ts
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
exports.createTestUser = (0, https_1.onCall)(async (request) => {
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
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
            firebase_functions_1.logger.info('Admin role created');
        }
        else {
            firebase_functions_1.logger.info('Admin role already exists');
        }
        // 創建測試用戶（工號 001）
        const userData = {
            name: '測試用戶',
            employeeId: '001',
            email: '001@deer-lab.local',
            roleRef: adminRoleRef,
            hourlyWage: 200,
            status: 'active',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        await db.collection('users').doc('001').set(userData);
        firebase_functions_1.logger.info('Test user created with employeeId: 001');
        // 創建 Firebase Auth 用戶
        await auth.createUser({
            uid: '001',
            email: '001@deer-lab.local',
            password: '123456',
            displayName: '測試用戶'
        });
        firebase_functions_1.logger.info('Firebase Auth user created');
        return {
            status: 'success',
            message: 'Test user created successfully',
            credentials: {
                employeeId: '001',
                password: '123456'
            }
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error creating test user:', error);
        throw new https_1.HttpsError('internal', 'Failed to create test user');
    }
});
//# sourceMappingURL=test.js.map