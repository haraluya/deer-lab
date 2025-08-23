// functions/src/utils/auth.ts
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Checks if a user is an Admin. Throws an HttpsError if not.
 * @param {string | undefined} uid The user's ID.
 */
export const ensureIsAdmin = async (uid: string | undefined) => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "請求未經驗證，必須登入才能執行此操作。");
  }
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "找不到發出請求的使用者資料。");
  }
  const roleRef = userDoc.data()?.roleRef;
  if (!roleRef) {
    throw new HttpsError("permission-denied", "使用者沒有指派角色，權限不足。");
  }
  const roleDoc = await roleRef.get();
  if (!roleDoc.exists || roleDoc.data()?.name !== "管理員") {
    throw new HttpsError("permission-denied", "權限不足，只有管理員才能執行此操作。");
  }
};

/**
 * Checks if a user is an Admin or a Foreman. Throws an HttpsError if not.
 * @param {string | undefined} uid The user's ID.
 */
export const ensureIsAdminOrForeman = async (uid: string | undefined) => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "請求未經驗證，必須登入才能執行此操作。");
  }
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "找不到發出請求的使用者資料。");
  }
  const roleRef = userDoc.data()?.roleRef;
  if (!roleRef) {
    throw new HttpsError("permission-denied", "使用者沒有指派角色，權限不足。");
  }
  const roleDoc = await roleRef.get();
  const roleName = roleDoc.data()?.name;
  if (!roleDoc.exists || (roleName !== "管理員" && roleName !== "領班")) {
    throw new HttpsError("permission-denied", "權限不足，只有管理員或領班才能執行此操作。");
  }
};
