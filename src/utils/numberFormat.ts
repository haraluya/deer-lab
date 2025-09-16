/**
 * 統一數字格式化工具
 * 用於處理庫存、數量、比例等數據的顯示格式
 */

/**
 * 格式化數量（庫存、目標數量等）
 * 最高保留3位小數，自動移除末尾的0
 * @param value 數值
 * @returns 格式化後的字串
 */
export const formatQuantity = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  if (value === 0) return '0';

  // 統一處理到小數點第三位，然後移除末尾0
  const fixed = parseFloat(value.toFixed(3));
  return fixed.toString();
};

/**
 * 格式化庫存數量
 * @param value 庫存數值
 * @returns 格式化後的字串
 */
export const formatStock = (value: number | null | undefined): string => {
  return formatQuantity(value);
};

/**
 * 格式化比例（PG/VG比例、濃度等）
 * @param value 比例數值
 * @returns 格式化後的字串
 */
export const formatRatio = (value: number | null | undefined): string => {
  return formatQuantity(value);
};

/**
 * 格式化百分比
 * @param value 0-1 之間的數值
 * @param decimals 小數位數，預設2位
 * @returns 格式化後的百分比字串
 */
export const formatPercentage = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '0%';

  const percentage = value * 100;
  const fixed = parseFloat(percentage.toFixed(decimals));
  return `${fixed}%`;
};

/**
 * 格式化重量（帶單位）
 * @param value 重量數值
 * @param unit 單位，預設為 'kg'
 * @returns 格式化後的重量字串
 */
export const formatWeight = (value: number | null | undefined, unit: string = 'kg'): string => {
  const formattedValue = formatQuantity(value);
  return `${formattedValue} ${unit}`;
};

/**
 * 格式化價格（保留2位小數）
 * @param value 價格數值
 * @returns 格式化後的價格字串
 */
export const formatPrice = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  return value.toFixed(2);
};