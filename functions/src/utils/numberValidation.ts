/**
 * 後端數值驗證和格式化工具
 * 確保庫存、百分比等數值最多保留三位小數
 */

/**
 * 限制數值最多三位小數
 * @param value 輸入的數值
 * @returns 格式化後的數值（最多三位小數）
 */
export const limitToThreeDecimals = (value: number | null | undefined): number => {
  if (value === null || value === undefined || isNaN(value)) return 0;
  // 四捨五入到小數點後第三位
  return Math.round(value * 1000) / 1000;
};

/**
 * 驗證並格式化庫存數值
 * @param value 庫存數值
 * @returns 格式化後的庫存數值
 */
export const validateStock = (value: number | null | undefined): number => {
  const limited = limitToThreeDecimals(value);
  // 庫存不能為負數
  return Math.max(0, limited);
};

/**
 * 驗證並格式化百分比數值
 * @param value 百分比數值
 * @returns 格式化後的百分比數值（0-100之間，最多三位小數）
 */
export const validatePercentage = (value: number | null | undefined): number => {
  const limited = limitToThreeDecimals(value);
  // 確保百分比在0-100之間
  return Math.min(100, Math.max(0, limited));
};

/**
 * 驗證並格式化價格數值
 * @param value 價格數值
 * @returns 格式化後的價格數值（最多三位小數）
 */
export const validatePrice = (value: number | null | undefined): number => {
  const limited = limitToThreeDecimals(value);
  // 價格不能為負數
  return Math.max(0, limited);
};

/**
 * 處理香精數據的數值格式化
 * @param data 香精數據
 * @returns 格式化後的香精數據
 */
export const formatFragranceNumbers = (data: any): any => {
  return {
    ...data,
    currentStock: data.currentStock !== undefined ? validateStock(data.currentStock) : undefined,
    safetyStockLevel: data.safetyStockLevel !== undefined ? validateStock(data.safetyStockLevel) : undefined,
    costPerUnit: data.costPerUnit !== undefined ? validatePrice(data.costPerUnit) : undefined,
    percentage: data.percentage !== undefined ? validatePercentage(data.percentage) : undefined,
    pgRatio: data.pgRatio !== undefined ? validatePercentage(data.pgRatio) : undefined,
    vgRatio: data.vgRatio !== undefined ? validatePercentage(data.vgRatio) : undefined,
  };
};

/**
 * 處理原料數據的數值格式化
 * @param data 原料數據
 * @returns 格式化後的原料數據
 */
export const formatMaterialNumbers = (data: any): any => {
  return {
    ...data,
    currentStock: data.currentStock !== undefined ? validateStock(data.currentStock) : undefined,
    safetyStockLevel: data.safetyStockLevel !== undefined ? validateStock(data.safetyStockLevel) : undefined,
    costPerUnit: data.costPerUnit !== undefined ? validatePrice(data.costPerUnit) : undefined,
  };
};