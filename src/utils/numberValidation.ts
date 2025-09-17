/**
 * 統一數值驗證和格式化工具
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
export const validateStock = (value: number): number => {
  const limited = limitToThreeDecimals(value);
  // 庫存不能為負數
  return Math.max(0, limited);
};

/**
 * 驗證並格式化百分比數值
 * @param value 百分比數值
 * @returns 格式化後的百分比數值（0-100之間，最多三位小數）
 */
export const validatePercentage = (value: number): number => {
  const limited = limitToThreeDecimals(value);
  // 確保百分比在0-100之間
  return Math.min(100, Math.max(0, limited));
};

/**
 * 格式化輸入值為最多三位小數的字串
 * 用於輸入框的顯示
 * @param value 輸入值
 * @returns 格式化後的字串
 */
export const formatInputValue = (value: string | number): string => {
  if (typeof value === 'string') {
    // 移除非數字字符（保留小數點）
    const cleaned = value.replace(/[^0-9.]/g, '');

    // 只保留第一個小數點
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    } else {
      value = cleaned;
    }

    // 限制小數位數為3位
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1) {
      const integerPart = value.substring(0, decimalIndex);
      const decimalPart = value.substring(decimalIndex + 1);
      if (decimalPart.length > 3) {
        value = integerPart + '.' + decimalPart.substring(0, 3);
      }
    }

    return value;
  }

  // 數值轉字串並限制小數位
  return limitToThreeDecimals(value).toString();
};

/**
 * 處理輸入框的 onChange 事件
 * 限制輸入為最多三位小數的數值
 * @param e 輸入事件
 * @param onChange 原始的 onChange 處理函數
 */
export const handleDecimalInput = (
  e: React.ChangeEvent<HTMLInputElement>,
  onChange: (value: string) => void
) => {
  const formatted = formatInputValue(e.target.value);
  onChange(formatted);
};

/**
 * 處理百分比總和的驗證
 * 確保 PG + VG + 香精 = 100%（允許小數誤差）
 * @param percentage 香精百分比
 * @param pgRatio PG比例
 * @param vgRatio VG比例
 * @returns 是否符合總和要求
 */
export const validateRatioSum = (
  percentage: number,
  pgRatio: number,
  vgRatio: number
): boolean => {
  const total = limitToThreeDecimals(percentage) +
                limitToThreeDecimals(pgRatio) +
                limitToThreeDecimals(vgRatio);

  // 允許 0.001 的誤差（因為三位小數的精度）
  return Math.abs(total - 100) < 0.002 || total === 0;
};

/**
 * 自動計算剩餘比例
 * 當輸入香精和PG比例後，自動計算VG比例
 * @param percentage 香精百分比
 * @param pgRatio PG比例
 * @returns 計算出的VG比例
 */
export const calculateRemainingRatio = (
  percentage: number,
  pgRatio: number
): number => {
  const remaining = 100 - limitToThreeDecimals(percentage) - limitToThreeDecimals(pgRatio);
  return limitToThreeDecimals(Math.max(0, remaining));
};