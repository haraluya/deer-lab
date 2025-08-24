// functions/src/api/users.ts
import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ensureIsAdmin } from "../utils/auth";

const db = getFirestore();
const auth = getAuth();

export const createUser = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureIsAdmin(contextAuth?.uid);
  const { employeeId, password, name, roleId, phone, status } = data;
  if (!employeeId || !password || !name || !roleId || !phone || !status) { 
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (工號、密碼、姓名、角色、電話、狀態)。"); 
  }
  try {
    const userRecord = await auth.createUser({ uid: employeeId, password: password, displayName: name });
    const roleRef = db.collection("roles").doc(roleId);
    await db.collection("users").doc(userRecord.uid).set({ 
      name: name, 
      employeeId: employeeId, 
      phone: phone,
      roleRef: roleRef, 
      status: status, 
      createdAt: FieldValue.serverTimestamp(), 
    });
    logger.info(`管理員 ${contextAuth?.uid} 成功建立新使用者: ${userRecord.uid}`);
    return { status: "success", message: `使用者 ${name} (${employeeId}) 已成功建立。`, uid: userRecord.uid };
  } catch (error) { logger.error("建立使用者時發生錯誤:", error); throw new HttpsError("internal", "建立使用者時發生未知錯誤。"); }
});

export const updateUser = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureIsAdmin(contextAuth?.uid);
  const { uid, name, roleId, phone } = data;
  if (!uid || !name || !roleId || !phone) { 
    throw new HttpsError("invalid-argument", "請求缺少必要的欄位 (uid, name, roleId, phone)。"); 
  }
  try {
    const userDocRef = db.collection("users").doc(uid);
    const roleRef = db.collection("roles").doc(roleId);
    const updateData = { 
      name: name, 
      phone: phone,
      roleRef: roleRef, 
      updatedAt: FieldValue.serverTimestamp(), 
    };
    await userDocRef.update(updateData);
    const userRecord = await auth.getUser(uid);
    if (userRecord.displayName !== name) { await auth.updateUser(uid, { displayName: name }); }
    logger.info(`管理員 ${contextAuth?.uid} 成功更新使用者資料: ${uid}`);
    return { status: "success", message: `使用者 ${name} 的資料已成功更新。` };
  } catch (error) { logger.error(`更新使用者 ${uid} 時發生錯誤:`, error); throw new HttpsError("internal", "更新使用者資料時發生未知錯誤。"); }
});

export const setUserStatus = onCall(async (request) => {
  const { data, auth: contextAuth } = request;
  await ensureIsAdmin(contextAuth?.uid);
  const { uid, status } = data;
  if (!uid || (status !== "active" && status !== "inactive")) { throw new HttpsError("invalid-argument", "請求缺少 UID 或狀態無效 (必須是 'active' 或 'inactive')。"); }
  if (uid === contextAuth?.uid) { throw new HttpsError("failed-precondition", "無法變更自己的帳號狀態。"); }
  try {
    await auth.updateUser(uid, { disabled: status === "inactive" });
    await db.collection("users").doc(uid).update({ status: status, updatedAt: FieldValue.serverTimestamp(), });
    logger.info(`管理員 ${contextAuth?.uid} 成功將使用者 ${uid} 狀態變更為 ${status}`);
    return { status: "success", message: `使用者狀態已成功更新為 ${status === "active" ? "在職" : "停用"}。` };
  } catch (error) { logger.error(`變更使用者 ${uid} 狀態時發生錯誤:`, error); throw new HttpsError("internal", "變更使用者狀態時發生未知錯誤。"); }
});
